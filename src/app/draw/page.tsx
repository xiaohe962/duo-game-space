'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePairAuth } from '@/context/PairAuthContext';
import { getRandomWords, WordItem } from '@/lib/data/wordBank';
import { DrawSession, DrawMessage, DrawStrokePayload, DrawStrokePoint } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { soundEffects } from '@/lib/audio/sound';
import confetti from 'canvas-confetti';
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
} from 'lucide-react';

const PRESET_COLORS = [
  '#0f172a', // 深蓝黑
  '#334155', // 冷石灰
  '#64748b', // 钢灰
  '#cbd5e1', // 浅灰
  '#ffffff', // 纯白
  '#ef4444', // 鲜红
  '#f97316', // 暖橙
  '#eab308', // 金黄
  '#10b981', // 翡翠绿
  '#06b6d4', // 湖水青
  '#2563eb', // 皇家蓝
  '#6366f1', // 靛青蓝
  '#8b5cf6', // 浅紫
  '#ec4899', // 玫瑰红
  '#78350f', // 质感棕
  '#84cc16', // 荧光青绿
];

const BRUSH_SIZES = [2, 6, 12, 20];

export default function DrawPage() {
  const router = useRouter();
  const { pairCode, userId, nickname, room, isPaired, isHost, partnerNickname, isLoading } = usePairAuth();

  // 会话状态
  const [session, setSession] = useState<DrawSession | null>(null);
  const [messages, setMessages] = useState<DrawMessage[]>([]);
  const [candidateWords, setCandidateWords] = useState<WordItem[]>([]);
  const [inputGuess, setInputGuess] = useState('');
  const [remainingTime, setRemainingTime] = useState<number>(120);

  // 画板绘图配置
  const [brushColor, setBrushColor] = useState<string>('#0f172a');
  const [brushSize, setBrushSize] = useState<number>(6);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // 画板引用与贝塞尔平滑缓存
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<DrawStrokePoint | null>(null);
  const strokeHistoryRef = useRef<DrawStrokePayload[]>([]);

  // 角色判定
  const isPainter = session ? session.painter_id === userId : isHost;

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

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

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
        setSession(activeSession as DrawSession);
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
    setCandidateWords(getRandomWords(4));
  }, [initOrFetchSession]);

  // Supabase Realtime 笔迹广播与状态订阅
  useEffect(() => {
    if (!pairCode) return;

    const channel = supabase.channel(`draw_realtime_${pairCode}`, {
      config: { broadcast: { self: false } },
    });

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
    };
  }, [pairCode]);

  const broadcastStroke = (stroke: DrawStrokePayload) => {
    if (!pairCode) return;
    strokeHistoryRef.current.push(stroke);
    supabase.channel(`draw_realtime_${pairCode}`).send({
      type: 'broadcast',
      event: 'STROKE',
      payload: stroke,
    });
  };

  const broadcastState = (
    nextSession: DrawSession,
    nextMessages: DrawMessage[],
    event?: 'CORRECT' | 'DING'
  ) => {
    if (!pairCode) return;
    supabase.channel(`draw_realtime_${pairCode}`).send({
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
      strokeHistoryRef.current.pop();
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
    // 多指误触拦截：仅响应主触控点
    if (!e.isPrimary) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const point = getNormalizedPoint(e);
    if (!point) return;

    isDrawingRef.current = true;
    lastPointRef.current = point;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !isPainter || session?.status !== 'drawing' || !e.isPrimary) return;
    const currentPoint = getNormalizedPoint(e);
    if (!currentPoint || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

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

    // 广播平滑笔迹
    const strokePayload: DrawStrokePayload = {
      type: 'draw',
      color: currentColor,
      size: currentSize,
      from: lastPointRef.current,
      to: midPoint,
      control: lastPointRef.current,
    };
    broadcastStroke(strokePayload);

    lastPointRef.current = midPoint;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.isPrimary) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
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
    broadcastStroke({ type: 'clear' });
    setShowClearConfirm(false);
  };

  // 撤销上一笔
  const handleUndo = () => {
    if (!isPainter) return;
    strokeHistoryRef.current.pop();
    redrawAll();
    broadcastStroke({ type: 'undo' });
  };

  // 120 秒倒计时
  useEffect(() => {
    if (session?.status !== 'drawing') return;

    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.status]);

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

  // 画师选题
  const handleSelectWord = async (word: WordItem) => {
    if (!session) return;
    const nextSession: DrawSession = {
      ...session,
      status: 'drawing',
      word: word.name,
      category: word.theme,
      hint: word.drawHint || `一种常见的${word.theme}`,
      remaining_seconds: 120,
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

  // 下一轮对决
  const handleStartNextRound = async (swapRoles: boolean) => {
    if (!session || !pairCode) return;
    const nextPainter = swapRoles ? session.guesser_id : session.painter_id;
    const nextGuesser = swapRoles ? session.painter_id : session.guesser_id;

    const nextRound = session.round_number + 1;
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
          scores: session.scores,
        })
        .select()
        .single();
      if (data) setSession(data as DrawSession);
    }
  };

  const getGuesserWordMask = () => {
    if (!session?.word) return '_ _ _';
    const len = session.word.length;
    return Array(len).fill('_').join(' ') + ` (${len} 字)`;
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
    <div className="min-h-dvh max-w-6xl mx-auto px-3 sm:px-4 py-3 md:py-6 flex flex-col justify-between space-y-3">
      {/* 顶部对局与状态栏 */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold font-mono text-xs">
            #{session?.round_number || 1}
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
              你画我猜 · 第 {session?.round_number || 1} 局
            </h1>
            <p className="text-xs text-slate-500">
              当前角色：
              <strong className="text-blue-600 font-semibold ml-1">
                {isPainter ? '🎨 你是画师（作画中）' : '👀 你是猜词者（竞猜中）'}
              </strong>
            </p>
          </div>
        </div>

        {/* 倒计时与题目透出 */}
        <div className="flex items-center gap-2 sm:gap-3">
          {session?.status === 'drawing' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold font-mono">
              <Timer className="w-3.5 h-3.5 text-blue-400" />
              <span>{remainingTime}s</span>
            </div>
          )}

          <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-right">
            <span className="text-[10px] text-slate-400 font-mono block">TARGET</span>
            <span className="text-xs font-bold text-slate-900 font-mono tracking-wider">
              {isPainter ? session?.word || '选题中...' : getGuesserWordMask()}
            </span>
          </div>
        </div>
      </div>

      {/* 半程线索提示条 */}
      {session?.status === 'drawing' && remainingTime <= 60 && session.hint && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 px-4 text-xs text-blue-900 flex items-center gap-2 animate-fade-in font-mono">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>
            <strong>半程线索解锁：</strong>
            【分类：{session.category}】— {session.hint}
          </span>
        </div>
      )}

      {/* 阶段 1：画师挑选词条 */}
      {session?.status === 'word_selection' && (
        <div className="bg-white rounded-2xl p-6 md:p-10 border border-slate-200 shadow-sm">
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
            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {partnerNickname} 正在挑选题目...
              </h3>
              <p className="text-xs text-slate-500">
                作画开始后，请在右侧/下方聊天框输入文字发起竞猜。
              </p>
            </div>
          )}
        </div>
      )}

      {/* 阶段 2：作画与竞猜主面板（PC 左右分栏 / 平板竖屏自适应 / 手机流式） */}
      {session?.status === 'drawing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 flex-1">
          {/* 画板与工具条区域 (占据 lg: 2列) */}
          <div className="lg:col-span-2 flex flex-col space-y-2.5">
            {/* Canvas 画板容器：彻底防误触 touch-action: none; overscroll-behavior: none; */}
            <div
              className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 flex-1 flex flex-col"
              style={{ touchAction: 'none', overscrollBehavior: 'none' }}
            >
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={`touch-drawing w-full h-[340px] sm:h-[400px] md:h-[480px] lg:h-[520px] rounded-xl bg-white border border-slate-100 cursor-crosshair shadow-inner ${
                  !isPainter ? 'pointer-events-none' : ''
                }`}
                style={{ touchAction: 'none' }}
              />

              {!isPainter && (
                <div className="absolute top-3.5 left-3.5 pointer-events-none bg-slate-900/80 text-white backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-mono">
                  LIVE STREAM · 正在实时观摩 {partnerNickname} 作画
                </div>
              )}
            </div>

            {/* 画师工具条（色盘、调色器、笔刷粗细、实时预览圆点、清屏、撤销） */}
            {isPainter && (
              <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
                {/* 16 色预设色盘与自定义拾色器 */}
                <div className="flex items-center flex-wrap gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setBrushColor(c);
                        setIsEraser(false);
                      }}
                      style={{ backgroundColor: c }}
                      className={`w-5 h-5 rounded-md border transition-all ${
                        brushColor === c && !isEraser
                          ? 'scale-125 ring-2 ring-slate-900 border-white shadow-sm'
                          : 'border-slate-300'
                      }`}
                    />
                  ))}

                  {/* 自定义拾色器 input[type=color] */}
                  <label
                    title="自定义百万拾色"
                    className="relative w-6 h-6 rounded-md border border-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <Pipette className="w-3 h-3 text-slate-600" />
                    <input
                      type="color"
                      value={brushColor}
                      onChange={(e) => {
                        setBrushColor(e.target.value);
                        setIsEraser(false);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>

                {/* 粗细选择与笔刷尺寸视觉预览圆点 */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center" title="当前笔刷大小预览">
                    <div
                      style={{
                        width: Math.min(18, Math.max(3, brushSize)),
                        height: Math.min(18, Math.max(3, brushSize)),
                        backgroundColor: isEraser ? '#94a3b8' : brushColor,
                      }}
                      className="rounded-full shadow-sm"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    {BRUSH_SIZES.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setBrushSize(sz)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold transition-all ${
                          brushSize === sz
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                    <button
                      onClick={() => setIsEraser(!isEraser)}
                      className={`p-1 rounded-lg border transition-all ${
                        isEraser
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                      title="橡皮擦"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 撤销与一键清空 */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleUndo}
                    className="p-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center gap-1 font-mono"
                    title="撤销上一笔"
                  >
                    <Undo2 className="w-3 h-3" /> 撤销
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="p-1 px-2.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs flex items-center gap-1 font-mono transition-colors"
                    title="一键清屏"
                  >
                    <Trash2 className="w-3 h-3" /> 清屏
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 右侧：聊天与竞猜互动区 (在 PC 为侧边固定流，在手机与平板竖屏为底部紧凑栏) */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm flex flex-col justify-between h-[360px] sm:h-[420px] lg:h-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1 font-mono uppercase">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                Live Chat & Guess
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">REALTIME</span>
            </div>

            {/* 消息滚动流 */}
            <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 no-scrollbar text-xs">
              {messages.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs font-mono">
                  输入文字直接发起竞猜
                </div>
              ) : (
                messages.map((m) => {
                  if (m.is_system) {
                    return (
                      <div
                        key={m.id}
                        className="py-1 px-2.5 rounded-lg bg-slate-100 text-slate-600 text-center text-[11px] font-mono"
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
                      <span className="text-[10px] text-slate-400 mb-0.5 font-mono">
                        {m.sender_nickname}
                      </span>
                      <div
                        className={`px-3 py-1.5 rounded-xl max-w-[85%] break-words ${
                          m.is_correct
                            ? 'bg-emerald-600 text-white font-bold shadow-sm'
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

            {/* 底部输入框 (带 pb-safe 适配移动端虚拟键盘安全区域) */}
            <form onSubmit={handleSendMessage} className="pt-2 border-t border-slate-100 flex gap-1.5 pb-safe">
              <input
                type="text"
                placeholder={isPainter ? '发送消息交流...' : '输入答案竞猜...'}
                value={inputGuess}
                onChange={(e) => setInputGuess(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
              />
              <button
                type="submit"
                disabled={!inputGuess.trim()}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1 font-mono"
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
