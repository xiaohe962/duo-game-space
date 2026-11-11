'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePairAuth } from '@/context/PairAuthContext';
import { getRandomWords, WordItem } from '@/lib/data/wordBank';
import { DrawSession, DrawMessage, DrawStrokePayload, DrawStrokePoint } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { soundEffects } from '@/lib/audio/sound';
import confetti from 'canvas-confetti';
import CustomColorPicker from '@/components/draw/CustomColorPicker';
import {
  Palette,
  Sparkles,
  Timer,
  RotateCcw,
  Trash2,
  Undo2,
  Send,
  Trophy,
  Eraser,
  MessageSquare,
  Pipette,
  Check,
  RefreshCw,
  Sliders,
} from 'lucide-react';

// 精确控制在 11 种高频预制颜色，第 12 个格子为自选调色器
const PRESET_COLORS = [
  '#0f172a', // 曜石黑
  '#64748b', // 冷石灰
  '#ffffff', // 纯白
  '#ef4444', // 鲜红
  '#f97316', // 暖橙
  '#eab308', // 明黄
  '#10b981', // 翡翠绿
  '#06b6d4', // 湖水青
  '#2563eb', // 皇家蓝
  '#8b5cf6', // 梦幻紫
  '#ec4899', // 玫瑰粉
];

export default function DrawPage() {
  const router = useRouter();
  const { pairCode, userId, nickname, room, isPaired, isHost, partnerNickname, isLoading } = usePairAuth();

  // 会话状态
  const [session, setSession] = useState<DrawSession | null>(null);
  const [messages, setMessages] = useState<DrawMessage[]>([]);
  const [candidateWords, setCandidateWords] = useState<WordItem[]>([]);
  const [inputGuess, setInputGuess] = useState('');
  const [remainingTime, setRemainingTime] = useState<number>(120);

  // 画板绘图配置（11 预设色 + 1 自选色 + 自由连续粗细 1~40px）
  const [brushColor, setBrushColor] = useState<string>('#0f172a');
  const [customColor, setCustomColor] = useState<string>('#8b5cf6');
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);
  const [brushSize, setBrushSize] = useState<number>(6);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // 角色固定标准 ID
  const hostId = pairCode ? `pair_${pairCode}_host` : '';
  const guestId = pairCode ? `pair_${pairCode}_guest` : '';

  // 画板引用与贝塞尔平滑缓存
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokeIdRef = useRef<string | null>(null);
  const lastPointRef = useRef<DrawStrokePoint | null>(null);
  const strokeHistoryRef = useRef<DrawStrokePayload[]>([]);
  const channelRef = useRef<any>(null);

  // 笔迹微批次聚合缓冲队列与计时器（将 120Hz 密集触控合并为 30fps 数据帧，彻底消除 WebSocket 队列积压延迟）
  const strokeBufferRef = useRef<DrawStrokePayload[]>([]);
  const flushTimerRef = useRef<any>(null);

  // 稳健角色判定（严格按 host/guest 特征码判定，彻底消除身份互换后两端均卡在选词等待的 bug）
  const isPainter = session
    ? session.painter_id === userId ||
      (session.painter_id.includes('host') && isHost) ||
      (session.painter_id.includes('guest') && !isHost)
    : isHost;
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // 消息自动吸底
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isLoading && !pairCode) {
      router.replace('/');
    }
  }, [isLoading, pairCode, router]);

  // 高清屏 (Retina / 2K+ 平板) 物理像素校准
  const calibrateCanvasResolution = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    if (rect.width > 0 && rect.height > 0) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    redrawAll();
  }, []);

  useEffect(() => {
    calibrateCanvasResolution();
    window.addEventListener('resize', calibrateCanvasResolution);
    return () => window.removeEventListener('resize', calibrateCanvasResolution);
  }, [calibrateCanvasResolution]);

  // 当进入作画阶段且 Canvas 挂载后，自动执行物理尺寸校准
  useEffect(() => {
    if (session?.status === 'drawing') {
      const timer = setTimeout(calibrateCanvasResolution, 60);
      return () => clearTimeout(timer);
    }
  }, [session?.status, calibrateCanvasResolution]);

  // 初始化或拉取现有对局
  const initOrFetchSession = useCallback(async () => {
    if (!pairCode) return;

    if (!isSupabaseConfigured) {
      const words = getRandomWords(4);
      setCandidateWords(words);
      const mockSession: DrawSession = {
        id: 'mock-draw-' + Date.now(),
        pair_code: pairCode,
        round_number: 1,
        status: 'word_selection',
        painter_id: userId,
        guesser_id: 'guest_user',
        word: '',
        category: '',
        hint: '',
        remaining_seconds: 120,
        winner_id: null,
        scores: { host: 0, guest: 0 },
        created_at: new Date().toISOString(),
        ended_at: null,
      };
      setSession(mockSession);
      return;
    }

    try {
      const { data: activeSession } = await supabase
        .from('draw_sessions')
        .select('*')
        .eq('pair_code', pairCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSession) {
        // 自愈检测：若数据库中的旧画师身份无法匹配任何一端（旧版本残留），自动自愈将画师重置给房主
        const isRecognizedPainter =
          activeSession.painter_id === hostId ||
          activeSession.painter_id === guestId ||
          activeSession.painter_id.includes('host') ||
          activeSession.painter_id.includes('guest');

        let sessionObj = activeSession as DrawSession;
        if (!isRecognizedPainter && activeSession.status === 'word_selection') {
          sessionObj = {
            ...sessionObj,
            painter_id: hostId,
            guesser_id: guestId,
          };
          supabase
            .from('draw_sessions')
            .update({ painter_id: hostId, guesser_id: guestId })
            .eq('id', activeSession.id);
        }

        setSession(sessionObj);
        const { data: msgList } = await supabase
          .from('draw_messages')
          .select('*')
          .eq('session_id', activeSession.id)
          .order('created_at', { ascending: true });
        setMessages((msgList as DrawMessage[]) || []);
      } else {
        const partnerId = isHost ? (room?.guest_user_id || 'guest_user') : (room?.host_user_id || 'host_user');
        const { data: newSession } = await supabase
          .from('draw_sessions')
          .insert({
            pair_code: pairCode,
            round_number: 1,
            status: 'word_selection',
            painter_id: userId,
            guesser_id: partnerId,
          })
          .select()
          .single();

        if (newSession) setSession(newSession as DrawSession);
      }
    } catch (e) {
      console.error('初始化你画我猜失败:', e);
    }
  }, [pairCode, userId, isHost, room]);

  useEffect(() => {
    initOrFetchSession();
  }, [initOrFetchSession]);

  // 每局固定锁定 4 个候选词，避免组件渲染或重连时题目不断跳变
  useEffect(() => {
    if (candidateWords.length === 0) {
      setCandidateWords(getRandomWords(4));
    }
  }, [candidateWords.length]);

  // 主动换一批候选题目
  const handleRefreshWords = () => {
    setCandidateWords(getRandomWords(4));
    soundEffects.playPop();
  };

  // Supabase Realtime 笔迹广播与状态订阅
  useEffect(() => {
    if (!pairCode) return;

    const channel = supabase.channel(`draw_realtime_${pairCode}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'STROKE' }, ({ payload }) => {
      handleRemoteStroke(payload as DrawStrokePayload);
    });

    channel.on('broadcast', { event: 'GAME_STATE' }, ({ payload }) => {
      if (payload.session) setSession(payload.session);
      if (payload.messages) setMessages(payload.messages);
      if (payload.event === 'CORRECT') {
        soundEffects.playVictory();
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      } else if (payload.event === 'DING') {
        soundEffects.playDing();
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [pairCode]);

  // 笔迹微批次聚合发射：将 20ms 内的高频笔迹合并为一个 batch 数据包，彻底消除 WebSocket 拥塞与 2~3 秒迟滞
  const flushStrokes = useCallback(() => {
    if (strokeBufferRef.current.length === 0) return;
    const strokesToSend = [...strokeBufferRef.current];
    strokeBufferRef.current = [];
    if (!pairCode) return;
    const targetChannel = channelRef.current || supabase.channel(`draw_realtime_${pairCode}`);
    if (strokesToSend.length === 1) {
      targetChannel.send({
        type: 'broadcast',
        event: 'STROKE',
        payload: strokesToSend[0],
      });
    } else {
      targetChannel.send({
        type: 'broadcast',
        event: 'STROKE',
        payload: {
          type: 'batch',
          strokes: strokesToSend,
        },
      });
    }
  }, [pairCode]);

  const queueStroke = useCallback(
    (stroke: DrawStrokePayload) => {
      if (!pairCode) return;
      strokeHistoryRef.current.push(stroke);
      strokeBufferRef.current.push(stroke);
      if (strokeBufferRef.current.length >= 4) {
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        flushStrokes();
      } else if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null;
          flushStrokes();
        }, 20);
      }
    },
    [flushStrokes, pairCode]
  );

  const broadcastImmediate = useCallback(
    (stroke: DrawStrokePayload) => {
      if (!pairCode) return;
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      flushStrokes();
      const targetChannel = channelRef.current || supabase.channel(`draw_realtime_${pairCode}`);
      targetChannel.send({
        type: 'broadcast',
        event: 'STROKE',
        payload: stroke,
      });
    },
    [flushStrokes, pairCode]
  );

  const broadcastState = (
    nextSession: DrawSession,
    nextMessages: DrawMessage[],
    event?: 'CORRECT' | 'DING'
  ) => {
    if (!pairCode) return;
    const targetChannel = channelRef.current || supabase.channel(`draw_realtime_${pairCode}`);
    targetChannel.send({
      type: 'broadcast',
      event: 'GAME_STATE',
      payload: {
        session: nextSession,
        messages: nextMessages,
        event,
      },
    });
  };

  // 画布坐标重放
  const redrawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    strokeHistoryRef.current.forEach((stroke) => {
      if (stroke.type === 'draw' && stroke.from && stroke.to) {
        ctx.beginPath();
        ctx.strokeStyle = stroke.color || '#0f172a';
        ctx.lineWidth = stroke.size || 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.control) {
          ctx.moveTo(stroke.from.x * rect.width, stroke.from.y * rect.height);
          ctx.quadraticCurveTo(
            stroke.control.x * rect.width,
            stroke.control.y * rect.height,
            stroke.to.x * rect.width,
            stroke.to.y * rect.height
          );
        } else {
          ctx.moveTo(stroke.from.x * rect.width, stroke.from.y * rect.height);
          ctx.lineTo(stroke.to.x * rect.width, stroke.to.y * rect.height);
        }
        ctx.stroke();
      }
    });
  };

  const handleRemoteStroke = (stroke: DrawStrokePayload) => {
    if (stroke.type === 'batch' && stroke.strokes) {
      stroke.strokes.forEach((s) => handleRemoteStroke(s));
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    if (stroke.type === 'clear') {
      ctx.clearRect(0, 0, rect.width, rect.height);
      strokeHistoryRef.current = [];
      return;
    }

    if (stroke.type === 'undo') {
      if (stroke.strokeId) {
        strokeHistoryRef.current = strokeHistoryRef.current.filter(
          (s) => s.strokeId !== stroke.strokeId
        );
      } else {
        strokeHistoryRef.current.pop();
      }
      redrawAll();
      return;
    }

    if (stroke.type === 'draw' && stroke.from && stroke.to) {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color || '#0f172a';
      ctx.lineWidth = stroke.size || 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.control) {
        ctx.moveTo(stroke.from.x * rect.width, stroke.from.y * rect.height);
        ctx.quadraticCurveTo(
          stroke.control.x * rect.width,
          stroke.control.y * rect.height,
          stroke.to.x * rect.width,
          stroke.to.y * rect.height
        );
      } else {
        ctx.moveTo(stroke.from.x * rect.width, stroke.from.y * rect.height);
        ctx.lineTo(stroke.to.x * rect.width, stroke.to.y * rect.height);
      }
      ctx.stroke();
      strokeHistoryRef.current.push(stroke);
    }
  };

  // 精准映射 CSS 坐标与归一化比例 (0~1)
  const getNormalizedPoint = (e: React.PointerEvent<HTMLCanvasElement>): DrawStrokePoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    const clientX = e.clientX;
    const clientY = e.clientY;

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  };

  // Pointer Events 平板触控笔与防误触处理
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPainter || session?.status !== 'drawing') return;
    if (e.isPrimary === false) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      if (typeof canvas.setPointerCapture === 'function' && e.pointerId !== undefined) {
        canvas.setPointerCapture(e.pointerId);
      }
    } catch (_) {}

    const point = getNormalizedPoint(e);
    if (!point) return;

    const strokeId = 's_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    currentStrokeIdRef.current = strokeId;
    isDrawingRef.current = true;
    lastPointRef.current = point;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !isPainter || session?.status !== 'drawing') return;
    if (e.isPrimary === false) return;
    const currentPoint = getNormalizedPoint(e);
    if (!currentPoint || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    // 过滤亚像素微小抖动（位移平方小于 1.5px 时忽略，大幅削减高刷触控产生的无意义冗余包，降低传输延迟）
    const dx = (currentPoint.x - lastPointRef.current.x) * rect.width;
    const dy = (currentPoint.y - lastPointRef.current.y) * rect.height;
    if (dx * dx + dy * dy < 1.5) return;

    const currentColor = isEraser ? '#ffffff' : brushColor;
    const currentSize = isEraser ? brushSize * 2 : brushSize;

    // 中点二次贝塞尔平滑滤波
    const midPoint: DrawStrokePoint = {
      x: (lastPointRef.current.x + currentPoint.x) / 2,
      y: (lastPointRef.current.y + currentPoint.y) / 2,
    };

    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(lastPointRef.current.x * rect.width, lastPointRef.current.y * rect.height);
    ctx.quadraticCurveTo(
      lastPointRef.current.x * rect.width,
      lastPointRef.current.y * rect.height,
      midPoint.x * rect.width,
      midPoint.y * rect.height
    );
    ctx.stroke();

    // 广播平滑笔迹（绑定 strokeId 归属并进入微批次缓冲，极大降低网络延迟）
    const strokePayload: DrawStrokePayload = {
      type: 'draw',
      strokeId: currentStrokeIdRef.current || undefined,
      color: currentColor,
      size: currentSize,
      from: lastPointRef.current,
      to: midPoint,
      control: lastPointRef.current,
    };
    queueStroke(strokePayload);

    lastPointRef.current = midPoint;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // 处理单击点按画点情况
    if (isDrawingRef.current && lastPointRef.current && currentStrokeIdRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        if (ctx) {
          const currentColor = isEraser ? '#ffffff' : brushColor;
          const currentSize = isEraser ? brushSize * 2 : brushSize;
          ctx.fillStyle = currentColor;
          ctx.beginPath();
          ctx.arc(
            lastPointRef.current.x * rect.width,
            lastPointRef.current.y * rect.height,
            currentSize / 2,
            0,
            Math.PI * 2
          );
          ctx.fill();

          const dotPayload: DrawStrokePayload = {
            type: 'draw',
            strokeId: currentStrokeIdRef.current,
            color: currentColor,
            size: currentSize,
            from: lastPointRef.current,
            to: lastPointRef.current,
          };
          queueStroke(dotPayload);
        }
      }
    }

    // 抬笔时立即清空缓冲并瞬时发射剩余点位
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    flushStrokes();

    isDrawingRef.current = false;
    lastPointRef.current = null;
    currentStrokeIdRef.current = null;
    try {
      if (typeof canvasRef.current?.releasePointerCapture === 'function' && e.pointerId !== undefined) {
        canvasRef.current.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
  };

  // 清空画板
  const handleConfirmClear = () => {
    if (!isPainter) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    if (ctx) ctx.clearRect(0, 0, rect.width, rect.height);
    strokeHistoryRef.current = [];
    broadcastImmediate({ type: 'clear' });
    setShowClearConfirm(false);
  };

  // 撤销上一笔（按完整笔划 strokeId 批量移除，瞬时可见撤回效果）
  const handleUndo = () => {
    if (!isPainter || strokeHistoryRef.current.length === 0) return;

    // 寻找末尾最后一个有效的 strokeId
    let targetStrokeId: string | undefined;
    for (let i = strokeHistoryRef.current.length - 1; i >= 0; i--) {
      if (strokeHistoryRef.current[i].strokeId) {
        targetStrokeId = strokeHistoryRef.current[i].strokeId;
        break;
      }
    }

    if (targetStrokeId) {
      strokeHistoryRef.current = strokeHistoryRef.current.filter(
        (s) => s.strokeId !== targetStrokeId
      );
      redrawAll();
      broadcastImmediate({ type: 'undo', strokeId: targetStrokeId });
    } else {
      // 容错兜底
      strokeHistoryRef.current.pop();
      redrawAll();
      broadcastImmediate({ type: 'undo' });
    }
  };

  // 120 秒高精度绝对时间同步倒计时（彻底解决退出重进重置为 120 秒及双端时间不同步的问题）
  const getRemainingSeconds = useCallback((currSession: DrawSession | null): number => {
    if (!currSession || currSession.status !== 'drawing') return 120;
    const start =
      (currSession.scores as any)?.round_start_time ||
      (currSession.created_at ? new Date(currSession.created_at).getTime() : Date.now());
    const elapsed = Math.floor((Date.now() - start) / 1000);
    return Math.max(0, 120 - elapsed);
  }, []);

  useEffect(() => {
    if (session?.status !== 'drawing') return;
    setRemainingTime(getRemainingSeconds(session));

    const timer = setInterval(() => {
      const left = getRemainingSeconds(session);
      setRemainingTime(left);
      if (left <= 0) {
        clearInterval(timer);
        if (isPainter) {
          handleTimeUp();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.status, (session?.scores as any)?.round_start_time, getRemainingSeconds, isPainter]);

  const handleTimeUp = async () => {
    if (!session) return;
    const nextSession: DrawSession = {
      ...session,
      status: 'settled',
      ended_at: new Date().toISOString(),
    };
    setSession(nextSession);
    broadcastState(nextSession, messages);

    if (isSupabaseConfigured) {
      await supabase
        .from('draw_sessions')
        .update({ status: 'settled', ended_at: new Date().toISOString() })
        .eq('id', session.id);
    }
  };

  // 重新开始第 1 局对决
  const handleRestartGame = async () => {
    if (!pairCode) return;
    const restartedSession: DrawSession = {
      id: 'draw_' + Date.now(),
      pair_code: pairCode,
      round_number: 1,
      status: 'word_selection',
      painter_id: hostId,
      guesser_id: guestId,
      word: '',
      category: '',
      hint: '',
      remaining_seconds: 120,
      winner_id: null,
      scores: { host: 0, guest: 0 },
      created_at: new Date().toISOString(),
      ended_at: null,
    };

    setSession(restartedSession);
    setMessages([]);
    handleConfirmClear();
    setCandidateWords(getRandomWords(4));
    soundEffects.playPop();

    broadcastState(restartedSession, [], 'DING');

    if (isSupabaseConfigured) {
      await supabase.from('draw_sessions').insert({
        pair_code: pairCode,
        round_number: 1,
        status: 'word_selection',
        painter_id: hostId,
        guesser_id: guestId,
        scores: { host: 0, guest: 0 },
      });
    }
  };

  // 强制切换画师身份（彻底解决两端互相等待死锁，给用户一键脱困能力）
  const handleTakeOverPainter = async () => {
    if (!session || !pairCode) return;
    const newPainterId = userId;
    const newGuesserId = isHost ? guestId : hostId;
    const nextSession: DrawSession = {
      ...session,
      status: 'word_selection',
      painter_id: newPainterId,
      guesser_id: newGuesserId,
      word: '',
      category: '',
      hint: '',
    };
    setSession(nextSession);
    setCandidateWords(getRandomWords(4));
    soundEffects.playDing();
    broadcastState(nextSession, messages, 'DING');

    if (isSupabaseConfigured) {
      await supabase
        .from('draw_sessions')
        .update({
          status: 'word_selection',
          painter_id: newPainterId,
          guesser_id: newGuesserId,
          word: '',
          category: '',
          hint: '',
        })
        .eq('id', session.id);
    }
  };

  // 画师选题
  const handleSelectWord = async (word: WordItem) => {
    if (!session) return;
    const roundStartTime = Date.now();
    const nextSession: DrawSession = {
      ...session,
      status: 'drawing',
      word: word.name,
      category: word.theme,
      hint: word.drawHint || `一种常见的${word.theme}`,
      remaining_seconds: 120,
      scores: {
        ...(session.scores || { host: 0, guest: 0 }),
        round_start_time: roundStartTime,
      },
    };

    setSession(nextSession);
    setRemainingTime(120);
    handleConfirmClear();

    const startMsg: DrawMessage = {
      id: 'm_' + Date.now(),
      pair_code: pairCode || '',
      session_id: session.id,
      sender_id: 'system',
      sender_nickname: '系统',
      message: `${nickname} 已选定题目，120 秒竞猜开始！`,
      is_system: true,
      is_correct: false,
      created_at: new Date().toISOString(),
    };
    const nextMsgs = [...messages, startMsg];
    setMessages(nextMsgs);

    broadcastState(nextSession, nextMsgs, 'DING');

    if (isSupabaseConfigured) {
      await supabase
        .from('draw_sessions')
        .update({
          status: 'drawing',
          word: word.name,
          category: word.theme,
          hint: word.drawHint || `一种常见的${word.theme}`,
          remaining_seconds: 120,
          scores: nextSession.scores,
        })
        .eq('id', session.id);
      await supabase.from('draw_messages').insert({
        pair_code: pairCode,
        session_id: session.id,
        sender_id: 'system',
        sender_nickname: '系统',
        message: startMsg.message,
        is_system: true,
      });
    }
  };

  // 发送消息或竞猜
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputGuess.trim();
    if (!text || !session) return;

    const isCorrect = text === session.word && !isPainter;
    const newMsg: DrawMessage = {
      id: 'm_' + Date.now(),
      pair_code: pairCode || '',
      session_id: session.id,
      sender_id: userId,
      sender_nickname: nickname,
      message: text,
      is_system: false,
      is_correct: isCorrect,
      created_at: new Date().toISOString(),
    };

    const nextMsgs = [...messages, newMsg];
    let nextSession = { ...session };

    if (isCorrect) {
      nextSession.status = 'settled';
      nextSession.winner_id = userId;
      nextSession.ended_at = new Date().toISOString();
      const currentHostScore = session.scores?.host || 0;
      const currentGuestScore = session.scores?.guest || 0;
      nextSession.scores = {
        ...session.scores,
        host: isHost ? currentHostScore + 10 : currentHostScore,
        guest: !isHost ? currentGuestScore + 10 : currentGuestScore,
      };

      const systemWinMsg: DrawMessage = {
        id: 'win_' + Date.now(),
        pair_code: pairCode || '',
        session_id: session.id,
        sender_id: 'system',
        sender_nickname: '系统',
        message: `🎯 ${nickname} 正确猜中了答案【${session.word}】！+10 分！`,
        is_system: true,
        is_correct: true,
        created_at: new Date().toISOString(),
      };
      nextMsgs.push(systemWinMsg);

      soundEffects.playVictory();
      confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } });
    }

    setMessages(nextMsgs);
    setSession(nextSession);
    setInputGuess('');

    broadcastState(nextSession, nextMsgs, isCorrect ? 'CORRECT' : 'DING');

    if (isSupabaseConfigured) {
      await supabase.from('draw_messages').insert({
        pair_code: pairCode,
        session_id: session.id,
        sender_id: userId,
        sender_nickname: nickname,
        message: text,
        is_correct: isCorrect,
      });

      if (isCorrect) {
        await supabase
          .from('draw_sessions')
          .update({
            status: 'settled',
            winner_id: userId,
            scores: nextSession.scores,
            ended_at: new Date().toISOString(),
          })
          .eq('id', session.id);
      }
    }
  };

  // 下一轮对决（彻底修复身份互换后两端均卡在“等待对方挑选题目”的严重 bug）
  const handleStartNextRound = async (swapRoles: boolean) => {
    if (!session || !pairCode) return;

    // 严谨计算上一轮画师究竟是房主还是队员
    const lastPainterIsHost =
      session.painter_id.includes('host') ||
      (session.painter_id === userId ? isHost : !isHost);

    const nextPainter = swapRoles
      ? (lastPainterIsHost ? guestId : hostId)
      : (lastPainterIsHost ? hostId : guestId);
    const nextGuesser = nextPainter === hostId ? guestId : hostId;

    const nextRound = (session.round_number || 1) + 1;
    const nextSession: DrawSession = {
      id: 'draw_' + Date.now(),
      pair_code: pairCode,
      round_number: nextRound,
      status: 'word_selection',
      painter_id: nextPainter,
      guesser_id: nextGuesser,
      word: '',
      category: '',
      hint: '',
      remaining_seconds: 120,
      winner_id: null,
      scores: session.scores || { host: 0, guest: 0 },
      created_at: new Date().toISOString(),
      ended_at: null,
    };

    setSession(nextSession);
    setMessages([]);
    handleConfirmClear();
    setCandidateWords(getRandomWords(4));

    broadcastState(nextSession, [], 'DING');

    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('draw_sessions')
        .insert({
          pair_code: pairCode,
          round_number: nextRound,
          status: 'word_selection',
          painter_id: nextPainter,
          guesser_id: nextGuesser,
          scores: session.scores || { host: 0, guest: 0 },
        })
        .select()
        .single();
      if (data) setSession(data as DrawSession);
    }
  };

  const getGuesserWordMask = () => {
    if (!session?.word) return '等待画师选词...';
    const len = session.word.length;
    if (remainingTime > 60) {
      // 刚开始的时候只告诉字数
      return `${Array(len).fill('_').join(' ')} (${len} 个字)`;
    }
    // 60秒后再告诉类别，仅此而已
    return `分类:【${session.category || '日常'}】· ${Array(len).fill('_').join(' ')} (${len} 字)`;
  };

  if (isLoading || !pairCode) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-mono">LOADING ROOM...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-50px)] max-w-6xl mx-auto px-2 sm:px-4 py-1.5 flex flex-col justify-between space-y-1.5 overflow-hidden">
      {/* 极简紧凑顶部栏：大幅缩减垂直高度占用 */}
      <div className="bg-white rounded-xl px-3 py-1.5 border border-slate-200 shadow-xs flex items-center justify-between gap-2 shrink-0">
        {/* 左侧：局数徽章 + 角色状态 */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono font-bold text-xs shadow-xs">
            R{session?.round_number || 1}
          </span>
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            {isPainter ? (
              <span className="text-blue-600 flex items-center gap-1 font-bold">
                <Palette className="w-3.5 h-3.5" /> 作画中
              </span>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1 font-bold">
                👀 竞猜中
              </span>
            )}
          </span>
        </div>

        {/* 中间：题目胶囊（开局仅显示字数，60s后仅显示分类） */}
        <div className="px-3 py-0.5 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center gap-1.5 shadow-inner">
          <span className="text-[10px] text-slate-400 font-mono font-medium">题目:</span>
          <span className="text-xs font-bold text-slate-900 font-mono tracking-wider">
            {isPainter ? session?.word || '挑选题目中...' : getGuesserWordMask()}
          </span>
        </div>

        {/* 右侧：重新开始 + 倒计时 + 退出 */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 重新开始按钮 */}
          <button
            type="button"
            onClick={handleRestartGame}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
            title="重置对局并重新开始"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] sm:text-xs">重新开始</span>
          </button>

          {session?.status === 'drawing' && (
            <div
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono transition-colors ${
                remainingTime <= 30
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-900 text-white'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>{remainingTime}s</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => router.push('/lobby')}
            className="px-2 py-0.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-xs touch-manipulation select-none cursor-pointer"
            title="返回大厅"
          >
            退出
          </button>
        </div>
      </div>

      {/* 阶段 1：画师挑选词条 */}
      {session?.status === 'word_selection' && (
        <div className="bg-white rounded-2xl p-6 md:p-10 border border-slate-200 shadow-sm flex-1 flex flex-col justify-center">
          {isPainter ? (
            <div className="space-y-4 max-w-md mx-auto text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 mx-auto flex items-center justify-center">
                <Palette className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">请选择你要画的词条</h2>
              <p className="text-xs text-slate-500">
                选定后将进入 120 秒作画时间，另一端将实时看到你的画作！
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                {candidateWords.map((word) => (
                  <button
                    key={word.id}
                    onClick={() => handleSelectWord(word)}
                    className="p-3.5 rounded-xl bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-500 text-left transition-all shadow-sm group"
                  >
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 block">
                      {word.name}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      分类：{word.theme}
                    </span>
                  </button>
                ))}
              </div>

              {/* 换一批按钮 */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleRefreshWords}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white text-xs text-slate-600 hover:text-slate-900 font-medium transition-all shadow-sm active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>换一批题目</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 sm:py-16 text-center space-y-4 max-w-sm mx-auto">
              <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shadow-xs">
                <Sparkles className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {partnerNickname} 正在挑选题目...
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  如果两端同时卡在等待状态或你想直接作画，可点击下方按钮切换画师或重置。
                </p>
              </div>

              {/* 一键摆脱死锁与强制切换/重置操作区 */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
                <button
                  type="button"
                  onClick={handleTakeOverPainter}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 touch-manipulation cursor-pointer"
                  title="由我开始选词作画，立即解除等待"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>换我来画 (切换画师)</span>
                </button>
                <button
                  type="button"
                  onClick={handleRestartGame}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white text-slate-700 font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 touch-manipulation cursor-pointer"
                  title="重置本局状态"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>重置本局状态</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 阶段 2：作画与竞猜主面板（针对 Pad 及各尺寸屏幕完美自适应：Pad 端左侧占 8~9 列高占比画板，右侧占 3~4 列竞猜聊天） */}
      {session?.status === 'drawing' && (
        <div className="flex-1 flex flex-col md:grid md:grid-cols-12 gap-2 min-h-0 overflow-hidden">
          {/* 画板与工具条区域（Pad 与 PC 占据 8~9 列全高，竖屏占据 flex-[2] 主体） */}
          <div className="md:col-span-8 lg:col-span-9 flex flex-col flex-[2] md:flex-none h-full min-h-0 space-y-1.5 overflow-hidden">
            {/* Canvas 画板容器 */}
            <div
              className="relative bg-white rounded-xl border border-slate-200 shadow-xs p-1 flex-1 flex flex-col min-h-[220px] md:min-h-0 overflow-hidden"
              style={{ touchAction: 'none', overscrollBehavior: 'none' }}
            >
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onMouseDown={handlePointerDown as any}
                onMouseMove={handlePointerMove as any}
                onMouseUp={handlePointerUp as any}
                className={`touch-drawing w-full h-full flex-1 rounded-lg bg-white border border-slate-100 cursor-crosshair shadow-inner ${
                  !isPainter ? 'pointer-events-none' : ''
                }`}
                style={{ touchAction: 'none' }}
              />

              {!isPainter && (
                <div className="absolute top-2 left-2 pointer-events-none bg-slate-900/80 text-white backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono">
                  LIVE · 正在实时观摩 {partnerNickname} 作画
                </div>
              )}
            </div>

            {/* 画师工具条（11 预设色 + 1 自选色 | 撤销 & 清屏 (放在粗细左边) | 笔刷粗细滑块 & 预览 & 橡皮擦） */}
            {isPainter && (
              <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
                {/* 11 色预设色盘 + 第 12 格自选色 */}
                <div className="flex items-center flex-wrap gap-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setBrushColor(c);
                        setIsEraser(false);
                      }}
                      style={{ backgroundColor: c }}
                      className={`w-5 h-5 rounded-md border transition-all ${
                        brushColor === c && !isEraser
                          ? 'scale-125 ring-2 ring-slate-900 border-white shadow-sm'
                          : 'border-slate-300 hover:scale-110'
                      }`}
                      title={c}
                    />
                  ))}

                  {/* 第 12 个格子：自选色与 HSV 专业色板 */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCustomPicker(!showCustomPicker)}
                      style={{ backgroundColor: customColor }}
                      title="第12格：自定义HSV色彩"
                      className={`relative w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
                        brushColor === customColor && !isEraser
                          ? 'scale-125 ring-2 ring-blue-500 border-white shadow-md'
                          : 'border-slate-300 hover:scale-110'
                      }`}
                    >
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gradient-to-tr from-pink-500 via-amber-400 to-cyan-400 border border-white shadow-xs" />
                    </button>

                    {/* 自选色居中浮层弹窗（绝对不超出网页视口边界） */}
                    {showCustomPicker && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs animate-fade-in">
                        <div
                          className="fixed inset-0"
                          onClick={() => setShowCustomPicker(false)}
                        />
                        <div className="relative z-10 shadow-2xl max-w-[95vw] max-h-[90vh]">
                          <CustomColorPicker
                            color={customColor}
                            onChange={(newHex) => {
                              setCustomColor(newHex);
                              setBrushColor(newHex);
                              setIsEraser(false);
                            }}
                            onClose={() => setShowCustomPicker(false)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 撤销与一键清空：移到笔画粗细的左侧 */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center gap-1 font-medium transition-all active:scale-95"
                    title="撤销上一笔（按完整笔划）"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>撤销</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 text-xs flex items-center gap-1 font-medium transition-all"
                    title="一键清空画板"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>清屏</span>
                  </button>
                </div>

                {/* 粗细自由滑动调节与笔刷尺寸视觉预览圆点（位于撤销清屏右边） */}
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                  {/* 实时尺寸预览圆点 */}
                  <div
                    className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0"
                    title={`当前笔刷粗细: ${brushSize}px`}
                  >
                    <div
                      style={{
                        width: Math.min(18, Math.max(2, brushSize)),
                        height: Math.min(18, Math.max(2, brushSize)),
                        backgroundColor: isEraser ? '#94a3b8' : brushColor,
                      }}
                      className="rounded-full shadow-xs transition-all"
                    />
                  </div>

                  {/* 连续自由滑动条 (1~40px) */}
                  <div className="flex items-center gap-1">
                    <input
                      type="range"
                      min={1}
                      max={40}
                      step={1}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-14 sm:w-20 accent-slate-900 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      title={`自由调整粗细: ${brushSize}px`}
                    />
                    <span className="text-[10px] font-mono font-bold text-slate-700 w-6 text-right">
                      {brushSize}px
                    </span>
                  </div>

                  {/* 橡皮擦切换 */}
                  <button
                    type="button"
                    onClick={() => setIsEraser(!isEraser)}
                    className={`p-1 rounded-lg border transition-all ${
                      isEraser
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-200 text-slate-500 hover:bg-white'
                    }`}
                    title="橡皮擦"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 右侧/下侧：聊天与竞猜互动区 (Pad 与 PC 占据 3~4 列并充满全高，小屏与竖屏保持紧凑防占位) */}
          <div className="md:col-span-4 lg:col-span-3 bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200 shadow-xs flex flex-col justify-between flex-1 md:flex-none h-full min-h-[140px] max-h-[190px] md:max-h-none overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 shrink-0">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1 font-mono uppercase">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                Live Chat & Guess
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">REALTIME</span>
            </div>

            {/* 消息滚动流（自动吸底） */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto space-y-1.5 py-1.5 pr-1 no-scrollbar text-xs"
            >
              {messages.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-mono">
                  输入文字直接发起竞猜
                </div>
              ) : (
                messages.map((m) => {
                  if (m.is_system) {
                    return (
                      <div
                        key={m.id}
                        className="py-1 px-2 rounded-lg bg-slate-100 text-slate-600 text-center text-[10px] font-mono"
                      >
                        {m.message}
                      </div>
                    );
                  }
                  const isMine = m.sender_id === userId;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[9px] text-slate-400 mb-0.5 font-mono">
                        {m.sender_nickname}
                      </span>
                      <div
                        className={`px-2.5 py-1 rounded-lg max-w-[85%] break-words ${
                          m.is_correct
                            ? 'bg-emerald-600 text-white font-bold shadow-xs'
                            : isMine
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {m.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 底部输入框 */}
            <form onSubmit={handleSendMessage} className="pt-1.5 border-t border-slate-100 flex gap-1.5 shrink-0">
              <input
                type="text"
                placeholder={isPainter ? '发送消息交流...' : '输入答案竞猜...'}
                value={inputGuess}
                onChange={(e) => setInputGuess(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
              />
              <button
                type="submit"
                disabled={!inputGuess.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1 font-mono"
              >
                <Send className="w-3 h-3" />
                {isPainter ? '发' : '猜'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 阶段 3：回合结算页 */}
      {session?.status === 'settled' && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg text-center space-y-5 max-w-md mx-auto animate-fade-in my-auto">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white mx-auto flex items-center justify-center shadow-md">
            <Trophy className="w-7 h-7 text-amber-400" />
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900">
              {session.winner_id ? '🎯 竞猜成功！' : '本轮时间到'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              ANSWER: <strong className="text-sm font-bold text-slate-900">{session.word}</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={() => handleStartNextRound(true)}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              互换画师再来一局
            </button>
            <button
              onClick={() => handleStartNextRound(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
            >
              保持角色继续
            </button>
          </div>
        </div>
      )}

      {/* 一键清空画板二次确认弹窗 */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-slate-200 text-center">
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">确认清空画板？</h3>
            <p className="text-xs text-slate-500 mb-4">清空后笔迹将被重置，对方画板也将同步抹除。</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirmClear}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
