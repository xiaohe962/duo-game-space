'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePairAuth } from '@/context/PairAuthContext';
import {
  CouplePost,
  BadgeBalance,
  BadgeLog,
  PostReaction,
  UserStatus,
  BadgeType,
  PostType,
} from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { soundEffects } from '@/lib/audio/sound';
import confetti from 'canvas-confetti';
import {
  Activity,
  Send,
  Image as ImageIcon,
  Clock,
  Trash2,
  Radio,
  UserCheck,
  Award,
  Sparkles,
  MessageSquareReply,
  X,
  Palette,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import BadgeLedgerModal, { BADGE_CONFIG } from '@/components/moments/BadgeLedgerModal';
import DoodleModal from '@/components/moments/DoodleModal';
import ReactionCapsules from '@/components/moments/ReactionCapsules';
import QuickStatusBar from '@/components/moments/QuickStatusBar';

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}m 前`;
  if (diffHour < 24) return `${diffHour}h 前`;
  if (diffHour < 48) {
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `昨天 ${hours}:${mins}`;
  }
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MOODS = ['📌', '🎮', '☕', '💡', '🚀', '✨', '⚡', '🌙'];

export default function MomentsPage() {
  const router = useRouter();
  const { pairCode, userId, role, nickname, partnerNickname, isLoading } = usePairAuth();

  // 数据集合
  const [posts, setPosts] = useState<CouplePost[]>([]);
  const [balances, setBalances] = useState<BadgeBalance[]>([]);
  const [badgeLogs, setBadgeLogs] = useState<BadgeLog[]>([]);
  const [reactions, setReactions] = useState<PostReaction[]>([]);
  const [partnerStatus, setPartnerStatus] = useState<UserStatus | null>(null);

  // 输入表单状态
  const [content, setContent] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isDoodle, setIsDoodle] = useState(false);
  const [selectedMood, setSelectedMood] = useState('📌');
  const [replyingTo, setReplyingTo] = useState<CouplePost | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // 弹窗状态
  const [showBadgeLedger, setShowBadgeLedger] = useState(false);
  const [prefilledPostId, setPrefilledPostId] = useState<string | null>(null);
  const [showDoodleModal, setShowDoodleModal] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const partnerUserId = pairCode ? `pair_${pairCode}_${role === 'host' ? 'guest' : 'host'}` : '';

  useEffect(() => {
    if (!isLoading && !pairCode) router.replace('/');
  }, [isLoading, pairCode, router]);

  // 1. 初始化拉取全量数据
  const fetchAllData = useCallback(async () => {
    if (!pairCode) return;

    if (!isSupabaseConfigured) {
      // 本地演示备用数据
      setPosts([
        {
          id: 'mock-1',
          pair_code: pairCode,
          author_id: `pair_${pairCode}_host`,
          author_nickname: role === 'host' ? nickname : partnerNickname,
          content: '双人专属空间已建立。小红花账本与实时互动流已全量上线！',
          mood: '🚀',
          post_type: 'normal',
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
      ]);
      setBalances([
        { pair_code: pairCode, user_id: userId, badge_type: 'flower', count: 5, updated_at: new Date().toISOString() },
        { pair_code: pairCode, user_id: partnerUserId, badge_type: 'flower', count: 3, updated_at: new Date().toISOString() },
      ]);
      setLoading(false);
      return;
    }

    try {
      // 动态列表
      const { data: postsData } = await supabase
        .from('couple_posts')
        .select('*')
        .eq('pair_code', pairCode)
        .order('created_at', { ascending: false });
      if (postsData) setPosts(postsData as CouplePost[]);

      // 徽章余额与明细
      const { data: balanceData } = await supabase
        .from('badge_balances')
        .select('*')
        .eq('pair_code', pairCode);
      if (balanceData) setBalances(balanceData as BadgeBalance[]);

      const { data: logsData } = await supabase
        .from('badge_logs')
        .select('*')
        .eq('pair_code', pairCode)
        .order('created_at', { ascending: false })
        .limit(50);
      if (logsData) setBadgeLogs(logsData as BadgeLog[]);

      // 表情表态
      const { data: reactionData } = await supabase
        .from('post_reactions')
        .select('*')
        .eq('pair_code', pairCode);
      if (reactionData) setReactions(reactionData as PostReaction[]);

      // 对方状态
      const { data: statusData } = await supabase
        .from('user_status')
        .select('*')
        .eq('user_id', partnerUserId)
        .maybeSingle();
      if (statusData) setPartnerStatus(statusData as UserStatus);
    } catch (e) {
      console.error('拉取空间数据异常:', e);
    } finally {
      setLoading(false);
    }
  }, [pairCode, role, nickname, partnerNickname, userId, partnerUserId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // 2. 建立统一的 Realtime Postgres Changes 监听流
  useEffect(() => {
    if (!pairCode || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`moments_unified_${pairCode}`)
      // 监听动态插入与删除
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_posts', filter: `pair_code=eq.${pairCode}` },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            setPosts((prev) => {
              if (prev.some((p) => p.id === payload.new.id)) return prev;
              return [payload.new as CouplePost, ...prev];
            });
            soundEffects.playPop();
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      // 监听徽章余额变动
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'badge_balances', filter: `pair_code=eq.${pairCode}` },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as BadgeBalance;
            setBalances((prev) => {
              const idx = prev.findIndex(
                (b) => b.user_id === updated.user_id && b.badge_type === updated.badge_type
              );
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = updated;
                return next;
              }
              return [...prev, updated];
            });
          }
        }
      )
      // 监听徽章流水日志
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'badge_logs', filter: `pair_code=eq.${pairCode}` },
        (payload) => {
          if (payload.new) {
            const newLog = payload.new as BadgeLog;
            setBadgeLogs((prev) => [newLog, ...prev]);
            // 如果接收者是自己，触发撒花动效与振动
            if (newLog.receiver_id === userId) {
              confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([40, 60, 40]);
              }
            }
          }
        }
      )
      // 监听表情表态
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reactions', filter: `pair_code=eq.${pairCode}` },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            setReactions((prev) => {
              if (prev.some((r) => r.id === payload.new.id)) return prev;
              return [...prev, payload.new as PostReaction];
            });
            soundEffects.playDing();
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setReactions((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      // 监听状态打卡更新
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_status', filter: `pair_code=eq.${pairCode}` },
        (payload) => {
          if (payload.new) {
            const st = payload.new as UserStatus;
            if (st.user_id === partnerUserId) {
              setPartnerStatus(st);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairCode, userId, partnerUserId]);

  // 3. 处理本地图片上传与剪贴板粘贴
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setAttachedImage(e.target.result as string);
        setIsDoodle(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleImageFile(file);
          break;
        }
      }
    }
  };

  // 4. 发布动态（支持图片、手绘涂鸦便签、楼中楼引用）
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !attachedImage) || !pairCode) return;

    setSubmitting(true);
    let finalImageUrl = attachedImage;

    // 尝试上传至 Supabase Storage，遇未配置时无损降级为 Base64
    if (attachedImage && isSupabaseConfigured) {
      try {
        const fileName = `${pairCode}/${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
        const res = await fetch(attachedImage);
        const blob = await res.blob();
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('chat-media')
          .upload(fileName, blob, { contentType: 'image/png' });

        if (!uploadErr && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('chat-media')
            .getPublicUrl(fileName);
          if (publicUrlData?.publicUrl) {
            finalImageUrl = publicUrlData.publicUrl;
          }
        }
      } catch (err) {
        console.warn('Storage 存储降级至 DataURL:', err);
      }
    }

    const postType: PostType = isDoodle ? 'doodle' : 'normal';
    const newPost: CouplePost = {
      id: 'post_' + Date.now(),
      pair_code: pairCode,
      author_id: userId,
      author_nickname: nickname,
      content: content.trim(),
      image_url: finalImageUrl,
      mood: selectedMood,
      parent_id: replyingTo?.id || null,
      post_type: postType,
      created_at: new Date().toISOString(),
    };

    setPosts((prev) => [newPost, ...prev]);
    setContent('');
    setAttachedImage(null);
    setIsDoodle(false);
    setReplyingTo(null);
    setSubmitting(false);
    soundEffects.playPop();

    if (isSupabaseConfigured) {
      try {
        await supabase.from('couple_posts').insert({
          pair_code: pairCode,
          author_id: userId,
          author_nickname: nickname,
          content: newPost.content,
          image_url: newPost.image_url,
          mood: newPost.mood,
          parent_id: newPost.parent_id,
          post_type: newPost.post_type,
        });
      } catch (e) {
        console.error('发布动态失败:', e);
      }
    }
  };

  // 5. 快捷状态打卡
  const handleSelectQuickStatus = async (icon: string, text: string) => {
    if (!pairCode) return;
    const statusPostContent = `打卡了实时状态：${icon} ${text}`;

    // 更新本地与远端 user_status
    if (isSupabaseConfigured) {
      try {
        await supabase.from('user_status').upsert({
          user_id: userId,
          pair_code: pairCode,
          status_icon: icon,
          status_text: text,
          updated_at: new Date().toISOString(),
        });

        // 自动落一条 post_type = 'status' 的卡片入信息流
        await supabase.from('couple_posts').insert({
          pair_code: pairCode,
          author_id: userId,
          author_nickname: nickname,
          content: statusPostContent,
          mood: icon,
          post_type: 'status',
        });
      } catch (err) {
        console.error('状态打卡失败:', err);
      }
    } else {
      const mockStatusPost: CouplePost = {
        id: 'post_' + Date.now(),
        pair_code: pairCode,
        author_id: userId,
        author_nickname: nickname,
        content: statusPostContent,
        mood: icon,
        post_type: 'status',
        created_at: new Date().toISOString(),
      };
      setPosts((prev) => [mockStatusPost, ...prev]);
    }

    soundEffects.playDing();
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
  };

  // 6. 徽章奖惩入账
  const handleAddBadge = async (
    receiverId: string,
    receiverNickname: string,
    badgeType: BadgeType,
    delta: number,
    reasonText: string,
    postId?: string
  ) => {
    if (!pairCode) return;

    if (isSupabaseConfigured) {
      try {
        // 记录流水
        await supabase.from('badge_logs').insert({
          pair_code: pairCode,
          sender_id: userId,
          sender_nickname: nickname,
          receiver_id: receiverId,
          receiver_nickname: receiverNickname,
          badge_type: badgeType,
          delta,
          reason: reasonText,
          post_id: postId || null,
        });

        // 更新余额表
        const existing = balances.find((b) => b.user_id === receiverId && b.badge_type === badgeType);
        const newCount = Math.max(0, (existing ? existing.count : 0) + delta);
        await supabase.from('badge_balances').upsert({
          pair_code: pairCode,
          user_id: receiverId,
          badge_type: badgeType,
          count: newCount,
          updated_at: new Date().toISOString(),
        });

        // 同步生成一条徽章奖励专属动态
        const badgeCfg = BADGE_CONFIG[badgeType];
        const rewardMsg = `${delta > 0 ? '✨ 奖励了' : '⚠️ 扣除了'} @${receiverNickname} ${
          delta > 0 ? '+' + delta : delta
        } 个 ${badgeCfg.emoji} ${badgeCfg.name}！理由：${reasonText}`;

        await supabase.from('couple_posts').insert({
          pair_code: pairCode,
          author_id: userId,
          author_nickname: nickname,
          content: rewardMsg,
          mood: badgeCfg.emoji,
          post_type: 'badge_reward',
          parent_id: postId || null,
        });
      } catch (err) {
        console.error('增加徽章失败:', err);
      }
    } else {
      // 纯本地兜底更新
      setBalances((prev) => {
        const idx = prev.findIndex((b) => b.user_id === receiverId && b.badge_type === badgeType);
        if (idx >= 0) {
          const next = [...prev];
          next[idx].count = Math.max(0, next[idx].count + delta);
          return next;
        }
        return [
          ...prev,
          { pair_code: pairCode, user_id: receiverId, badge_type: badgeType, count: delta, updated_at: new Date().toISOString() },
        ];
      });
    }
  };

  // 7. 行内表情表态切换
  const handleToggleReaction = async (postId: string, emoji: string) => {
    if (!pairCode) return;
    const existing = reactions.find(
      (r) => r.post_id === postId && r.user_id === userId && r.emoji === emoji
    );

    if (existing) {
      // 取消表态
      setReactions((prev) => prev.filter((r) => r.id !== existing.id));
      if (isSupabaseConfigured) {
        await supabase.from('post_reactions').delete().eq('id', existing.id);
      }
    } else {
      // 新增表态
      const newReaction: PostReaction = {
        id: 'react_' + Date.now(),
        pair_code: pairCode,
        post_id: postId,
        user_id: userId,
        user_nickname: nickname,
        emoji,
        created_at: new Date().toISOString(),
      };
      setReactions((prev) => [...prev, newReaction]);
      soundEffects.playDing();
      if (isSupabaseConfigured) {
        await supabase.from('post_reactions').insert({
          pair_code: pairCode,
          post_id: postId,
          user_id: userId,
          user_nickname: nickname,
          emoji,
        });
      }
    }
  };

  // 8. 删除动态
  const handleDeletePost = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (isSupabaseConfigured) {
      await supabase.from('couple_posts').delete().eq('id', postId);
    }
  };

  // 9. 开启引用回复
  const handleStartReply = (post: CouplePost) => {
    setReplyingTo(post);
    textareaRef.current?.focus();
  };

  if (isLoading || !pairCode) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-mono">LOADING MOMENTS...</p>
      </div>
    );
  }

  // 区分主动态与楼中楼回复
  const topLevelPosts = posts.filter((p) => !p.parent_id);
  const repliesByParentId = posts.reduce<Record<string, CouplePost[]>>((acc, p) => {
    if (p.parent_id) {
      if (!acc[p.parent_id]) acc[p.parent_id] = [];
      acc[p.parent_id].push(p);
    }
    return acc;
  }, {});

  // 计算小红花汇总
  const myFlowerCount = balances.find((b) => b.user_id === userId && b.badge_type === 'flower')?.count || 0;
  const partnerFlowerCount = balances.find((b) => b.user_id === partnerUserId && b.badge_type === 'flower')?.count || 0;

  return (
    <div className="min-h-dvh max-w-3xl mx-auto px-3 sm:px-4 py-3 md:py-6 space-y-4">
      {/* 顶部深色状态横幅与徽章条 */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white border border-slate-800 shadow-lg space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-bold flex items-center gap-2 font-mono">
              动态空间 <Activity className="w-4 h-4 text-blue-400" />
            </h1>
            <p className="mt-0.5 text-xs text-slate-400 font-mono">
              双人私密互动流 · 小红花勋章 · 即时涂鸦便签 · 楼中楼
            </p>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <div className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1">
              <Radio className="w-3 h-3 text-blue-400" />
              <span>#{pairCode}</span>
            </div>
            <div className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
              {role === 'host' ? 'ROLE A' : 'ROLE B'}
            </div>
          </div>
        </div>

        {/* 顶部徽章看板胶囊（点击唤起账本 Modal） */}
        <div className="pt-1 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setPrefilledPostId(null);
                setShowBadgeLedger(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-rose-500/50 text-xs transition-all shadow-sm group"
            >
              <Award className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-rose-300">🌸 我的红花: {myFlowerCount}</span>
              <span className="text-slate-500 font-mono text-[10px]">|</span>
              <span className="text-slate-300">TA: {partnerFlowerCount}</span>
            </button>

            {/* 其他徽章胶囊快速透出 */}
            {(['star', 'coffee', 'hug'] as BadgeType[]).map((bType) => {
              const cfg = BADGE_CONFIG[bType];
              const cnt = balances.find((b) => b.user_id === userId && b.badge_type === bType)?.count || 0;
              return (
                <button
                  key={bType}
                  onClick={() => setShowBadgeLedger(true)}
                  className="px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 flex items-center gap-1"
                >
                  <span>{cfg.emoji}</span>
                  <span className="font-mono font-bold">{cnt}</span>
                </button>
              );
            })}
          </div>

          {/* 对方实时状态透出 */}
          <div className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-400">{partnerNickname}:</span>
            {partnerStatus ? (
              <span className="text-blue-300 font-semibold flex items-center gap-1">
                <span>{partnerStatus.status_icon}</span>
                <span>{partnerStatus.status_text}</span>
              </span>
            ) : (
              <span className="text-slate-500">在线</span>
            )}
          </div>
        </div>
      </div>

      {/* 发表动态区域卡片 */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
        {/* 专属快捷状态打卡条 */}
        <QuickStatusBar onSelectStatus={handleSelectQuickStatus} disabled={submitting} />

        <form onSubmit={handlePublish} className="space-y-3">
          {/* 引用回复指示浮层 */}
          {replyingTo && (
            <div className="flex items-center justify-between p-2 px-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 animate-fade-in font-mono">
              <div className="flex items-center gap-1.5 truncate">
                <MessageSquareReply className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">
                  正在回复 <strong>@{replyingTo.author_nickname}</strong>: &ldquo;{replyingTo.content.slice(0, 32)}&rdquo;
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-blue-100 rounded text-blue-600 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 动态心情标签 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 font-mono">MOOD:</span>
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {MOODS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setSelectedMood(emoji)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-transform ${
                    selectedMood === emoji
                      ? 'bg-slate-900 text-white scale-110 shadow-sm'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* 文本输入框（带剪贴板图片粘贴拦截监听） */}
          <textarea
            ref={textareaRef}
            placeholder={`在此写下动态、想法或截图直接 Ctrl+V 粘贴分享给 ${partnerNickname}...`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 resize-none"
          />

          {/* 图片 / 涂鸦预览缩略图卡片 */}
          {attachedImage && (
            <div className="relative inline-block animate-fade-in">
              <div className="p-1 bg-slate-100 rounded-xl border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachedImage}
                  alt="附件预览"
                  className="max-h-36 max-w-full rounded-lg object-contain bg-white shadow-sm"
                />
                {isDoodle && (
                  <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                    🎨 涂鸦便签
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachedImage(null);
                  setIsDoodle(false);
                }}
                className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700 transition-colors"
                title="移除配图"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* 隐藏的文件输入 */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleImageFile(e.target.files[0]);
              }
            }}
          />

          {/* 底部工具条与提交 */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <div className="flex items-center gap-2">
              {/* 添加图片按钮 */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center gap-1 font-mono transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>传图/截图</span>
              </button>

              {/* 即兴涂鸦按钮 */}
              <button
                type="button"
                onClick={() => setShowDoodleModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center gap-1 font-mono transition-colors"
              >
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                <span>手绘涂鸦</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={(!content.trim() && !attachedImage) || submitting}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 font-mono"
            >
              <Send className="w-3 h-3" />
              <span>{submitting ? 'SENDING...' : 'POST'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 动态信息流列表 */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
          <span>ALL MOMENTS ({posts.length})</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> REALTIME STREAM
          </span>
        </div>

        {topLevelPosts.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center font-mono">
              💬
            </div>
            <p className="text-xs font-semibold text-slate-700">暂无互动说说</p>
            <p className="text-[11px] text-slate-400">
              在上方写下一句话或分享手绘便签，记录你们的专属日常吧！
            </p>
          </div>
        ) : (
          topLevelPosts.map((post) => {
            const isMe = post.author_id === userId;
            const replies = repliesByParentId[post.id] || [];
            const isThreadExpanded = expandedThreads[post.id] ?? true;

            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3 hover:border-slate-300 transition-colors"
              >
                {/* 动态卡片头部 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{post.mood || '📌'}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {post.author_nickname}
                        </span>
                        {isMe && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                            ME
                          </span>
                        )}
                        {/* 状态徽章标注 */}
                        {post.post_type === 'status' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                            打卡状态
                          </span>
                        )}
                        {post.post_type === 'doodle' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                            🎨 手绘涂鸦
                          </span>
                        )}
                        {post.post_type === 'badge_reward' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                            🌸 小红花奖励
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatRelativeTime(post.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* 删除操作 */}
                  {isMe && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="删除动态"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 动态文本正文 */}
                {post.content && (
                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                )}

                {/* 动态配图 / 手绘便签 */}
                {post.image_url && (
                  <div className="pt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image_url}
                      alt="动态图片"
                      className="max-h-72 rounded-xl object-contain bg-slate-50 border border-slate-100 shadow-sm"
                    />
                  </div>
                )}

                {/* 动态卡片底部操作栏 */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  {/* 行内表情表态胶囊 */}
                  <ReactionCapsules
                    postId={post.id}
                    reactions={reactions.filter((r) => r.post_id === post.id)}
                    currentUserId={userId}
                    onToggleReaction={handleToggleReaction}
                  />

                  {/* 快捷奖惩打赏与引用回复入口 */}
                  <div className="flex items-center gap-1.5">
                    {/* 快捷奖励小红花 */}
                    <button
                      type="button"
                      onClick={() => {
                        setPrefilledPostId(post.id);
                        setShowBadgeLedger(true);
                      }}
                      className="px-2 py-1 rounded-lg bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-medium flex items-center gap-1 border border-rose-200 transition-colors"
                      title="为此动态发放奖励"
                    >
                      <span>🌸</span>
                      <span className="hidden sm:inline text-[11px]">打赏</span>
                    </button>

                    {/* 引用回复 */}
                    <button
                      type="button"
                      onClick={() => handleStartReply(post)}
                      className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs flex items-center gap-1 border border-slate-200 transition-colors font-mono"
                      title="引用回复"
                    >
                      <MessageSquareReply className="w-3 h-3 text-blue-600" />
                      <span className="text-[11px]">回复</span>
                    </button>
                  </div>
                </div>

                {/* 楼中楼回复列表嵌套区域 */}
                {replies.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 pl-3 border-l-2 border-l-blue-400 space-y-2.5 bg-slate-50/60 p-2.5 rounded-xl">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>楼中楼回复 ({replies.length})</span>
                      <button
                        onClick={() =>
                          setExpandedThreads((prev) => ({
                            ...prev,
                            [post.id]: !isThreadExpanded,
                          }))
                        }
                        className="flex items-center gap-0.5 text-blue-600 hover:underline"
                      >
                        {isThreadExpanded ? (
                          <>
                            <span>收起</span>
                            <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            <span>展开 ({replies.length})</span>
                            <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>

                    {isThreadExpanded &&
                      replies.map((reply) => (
                        <div
                          key={reply.id}
                          className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="font-bold text-slate-900">
                                {reply.author_nickname}
                              </span>
                              {reply.author_id === userId && (
                                <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-500 font-mono">
                                  ME
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatRelativeTime(reply.created_at)}
                              </span>
                            </div>
                            {reply.author_id === userId && (
                              <button
                                onClick={() => handleDeletePost(reply.id)}
                                className="text-slate-300 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-slate-800 whitespace-pre-wrap">
                            {reply.content}
                          </p>

                          {reply.image_url && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={reply.image_url}
                              alt="回复图片"
                              className="max-h-40 rounded-lg object-contain border border-slate-100"
                            />
                          )}

                          {/* 楼中楼回复同样支持贴纸表态 */}
                          <ReactionCapsules
                            postId={reply.id}
                            reactions={reactions.filter((r) => r.post_id === reply.id)}
                            currentUserId={userId}
                            onToggleReaction={handleToggleReaction}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 徽章账本抽屉 / 奖惩弹窗 */}
      <BadgeLedgerModal
        isOpen={showBadgeLedger}
        onClose={() => {
          setShowBadgeLedger(false);
          setPrefilledPostId(null);
        }}
        pairCode={pairCode}
        userId={userId}
        nickname={nickname}
        partnerNickname={partnerNickname}
        partnerUserId={partnerUserId}
        balances={balances}
        logs={badgeLogs}
        onAddBadge={handleAddBadge}
        prefilledPostId={prefilledPostId}
      />

      {/* 即兴手绘涂鸦便签 Modal */}
      <DoodleModal
        isOpen={showDoodleModal}
        onClose={() => setShowDoodleModal(false)}
        onSaveDoodle={(dataUrl) => {
          setAttachedImage(dataUrl);
          setIsDoodle(true);
        }}
      />
    </div>
  );
}
