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
  Send,
  Image as ImageIcon,
  Trash2,
  Award,
  MessageSquareReply,
  X,
  Palette,
  Sparkles,
  Smile,
  ChevronDown,
} from 'lucide-react';
import BadgeLedgerModal, { BADGE_CONFIG } from '@/components/moments/BadgeLedgerModal';
import DoodleModal from '@/components/moments/DoodleModal';
import ReactionCapsules from '@/components/moments/ReactionCapsules';
import QuickStatusBar from '@/components/moments/QuickStatusBar';

// 解析支持单图、多图 JSON 数组或分隔符格式
function parseImages(imageUrl: string | null | undefined): string[] {
  if (!imageUrl) return [];
  if (imageUrl.startsWith('[')) {
    try {
      const arr = JSON.parse(imageUrl);
      if (Array.isArray(arr)) return arr;
    } catch (_) {}
  }
  if (imageUrl.includes('||')) {
    return imageUrl.split('||').filter(Boolean);
  }
  return [imageUrl];
}

// 友好时间格式
function formatChatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  if (isToday) {
    return `${hours}:${minutes}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${hours}:${minutes}`;
}

// 检查是否为有效 UUID
function isValidUuid(str: string | null | undefined): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

const MOOD_OPTIONS = [
  { emoji: '', label: '无心情' },
  { emoji: '📌', label: '置顶' },
  { emoji: '🎮', label: '开黑' },
  { emoji: '☕', label: '咖啡' },
  { emoji: '💡', label: '灵感' },
  { emoji: '🚀', label: '冲呀' },
  { emoji: '✨', label: '开心' },
  { emoji: '🌙', label: '晚安' },
  { emoji: '🥰', label: '贴贴' },
  { emoji: '🥺', label: '委屈' },
];

export default function MomentsPage() {
  const router = useRouter();
  const { pairCode, userId, role, nickname, partnerNickname, isLoading } = usePairAuth();

  // 数据集合（持久化缓存优先）
  const [posts, setPosts] = useState<CouplePost[]>([]);
  const [balances, setBalances] = useState<BadgeBalance[]>([]);
  const [badgeLogs, setBadgeLogs] = useState<BadgeLog[]>([]);
  const [reactions, setReactions] = useState<PostReaction[]>([]);
  const [partnerStatus, setPartnerStatus] = useState<UserStatus | null>(null);

  // 底部输入表单状态
  const [content, setContent] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]); // 多图与涂鸦并存
  const [selectedMood, setSelectedMood] = useState<string | null>(null); // 允许空心情
  const [showMoodMenu, setShowMoodMenu] = useState(false);
  const [showQuickStatus, setShowQuickStatus] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CouplePost | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // 弹窗状态
  const [showBadgeLedger, setShowBadgeLedger] = useState(false);
  const [prefilledPostId, setPrefilledPostId] = useState<string | null>(null);
  const [showDoodleModal, setShowDoodleModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const partnerUserId = pairCode ? `pair_${pairCode}_${role === 'host' ? 'guest' : 'host'}` : '';

  // 0. 本地持久化缓存快速秒开（修复重新进入记录丢失问题）
  useEffect(() => {
    if (!pairCode) return;
    try {
      const savedPosts = localStorage.getItem(`duo_moments_posts_${pairCode}`);
      if (savedPosts) {
        const parsed = JSON.parse(savedPosts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPosts(parsed);
          setLoading(false);
        }
      }
      const savedBalances = localStorage.getItem(`duo_moments_balances_${pairCode}`);
      if (savedBalances) {
        setBalances(JSON.parse(savedBalances));
      }
    } catch (e) {
      console.warn('读取本地缓存失败:', e);
    }
  }, [pairCode]);

  useEffect(() => {
    if (!isLoading && !pairCode) router.replace('/');
  }, [isLoading, pairCode, router]);

  // 1. 初始化拉取并与 Supabase 同步更新
  const fetchAllData = useCallback(async () => {
    if (!pairCode) return;

    if (!isSupabaseConfigured) {
      // 演示备用数据
      if (posts.length === 0) {
        const initialMock: CouplePost = {
          id: 'mock-1',
          pair_code: pairCode,
          author_id: partnerUserId || 'partner_user',
          author_nickname: partnerNickname || 'TA',
          content: '欢迎来到我们的专属聊天与动态空间！这里支持文字、截图直传、即兴涂鸦与小红花互动。',
          mood: '✨',
          post_type: 'normal',
          created_at: new Date().toISOString(),
        };
        setPosts([initialMock]);
        try {
          localStorage.setItem(`duo_moments_posts_${pairCode}`, JSON.stringify([initialMock]));
        } catch (_) {}
      }
      setLoading(false);
      return;
    }

    try {
      // 按时间正序拉取对话记录（旧的在上，新的在下）
      const { data: postsData } = await supabase
        .from('couple_posts')
        .select('*')
        .eq('pair_code', pairCode)
        .order('created_at', { ascending: true });

      if (postsData && postsData.length > 0) {
        setPosts(postsData as CouplePost[]);
        try {
          localStorage.setItem(`duo_moments_posts_${pairCode}`, JSON.stringify(postsData));
        } catch (_) {}
      }

      // 徽章与资产
      const { data: balanceData } = await supabase
        .from('badge_balances')
        .select('*')
        .eq('pair_code', pairCode);
      if (balanceData) {
        setBalances(balanceData as BadgeBalance[]);
        try {
          localStorage.setItem(`duo_moments_balances_${pairCode}`, JSON.stringify(balanceData));
        } catch (_) {}
      }

      const { data: logsData } = await supabase
        .from('badge_logs')
        .select('*')
        .eq('pair_code', pairCode)
        .order('created_at', { ascending: false })
        .limit(50);
      if (logsData) setBadgeLogs(logsData as BadgeLog[]);

      // 表态
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
  }, [pairCode, partnerUserId, partnerNickname, posts.length]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // 2. 聊天消息自动吸底
  const scrollToBottom = useCallback((smooth = true) => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [posts.length, scrollToBottom]);

  // 3. Supabase Realtime 订阅
  useEffect(() => {
    if (!pairCode || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`moments_chat_${pairCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_posts', filter: `pair_code=eq.${pairCode}` },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            setPosts((prev) => {
              if (prev.some((p) => p.id === payload.new.id)) return prev;
              const next = [...prev, payload.new as CouplePost];
              try {
                localStorage.setItem(`duo_moments_posts_${pairCode}`, JSON.stringify(next));
              } catch (_) {}
              return next;
            });
            soundEffects.playPop();
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setPosts((prev) => {
              const next = prev.filter((p) => p.id !== payload.old.id);
              try {
                localStorage.setItem(`duo_moments_posts_${pairCode}`, JSON.stringify(next));
              } catch (_) {}
              return next;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'badge_balances', filter: `pair_code=eq.${pairCode}` },
        (payload) => {
          if (payload.new) {
            setBalances((prev) => {
              const updated = payload.new as BadgeBalance;
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reactions', filter: `pair_code=eq.${pairCode}` },
        () => {
          supabase
            .from('post_reactions')
            .select('*')
            .eq('pair_code', pairCode)
            .then(({ data }) => {
              if (data) setReactions(data as PostReaction[]);
            });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_status', filter: `pair_code=eq.${pairCode}` },
        (payload) => {
          if (payload.new && (payload.new as UserStatus).user_id === partnerUserId) {
            setPartnerStatus(payload.new as UserStatus);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairCode, partnerUserId]);

  // 4. 多文件与剪贴板选图处理
  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setAttachedImages((prev) => [...prev, evt.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            if (evt.target?.result) {
              setAttachedImages((prev) => [...prev, evt.target!.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // 5. 发送聊天消息（支持多图 + 手绘涂鸦并发发送，持久化双写）
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && attachedImages.length === 0) return;
    if (!pairCode) return;

    setSubmitting(true);
    const imagesToUpload = [...attachedImages];
    const uploadedUrls: string[] = [];

    // 上传图片（遇未配置 Storage 时自动降级为 DataURL 本地存储）
    for (const img of imagesToUpload) {
      if (img.startsWith('data:') && isSupabaseConfigured) {
        try {
          const fileName = `${pairCode}/${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
          const blob = await (await fetch(img)).blob();
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('chat-media')
            .upload(fileName, blob, { contentType: 'image/png' });

          if (!uploadErr && uploadData) {
            const { data: pubData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
            if (pubData?.publicUrl) {
              uploadedUrls.push(pubData.publicUrl);
              continue;
            }
          }
        } catch (_) {}
      }
      uploadedUrls.push(img);
    }

    // 格式化图片存储字段：单张存 URL，多张存 JSON 数组
    let finalImageUrl: string | null = null;
    if (uploadedUrls.length === 1) {
      finalImageUrl = uploadedUrls[0];
    } else if (uploadedUrls.length > 1) {
      finalImageUrl = JSON.stringify(uploadedUrls);
    }

    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'p_' + Date.now();

    const parentPostId = replyingTo && isValidUuid(replyingTo.id) ? replyingTo.id : null;

    const newPost: CouplePost = {
      id: newId,
      pair_code: pairCode,
      author_id: userId,
      author_nickname: nickname,
      content: content.trim(),
      image_url: finalImageUrl,
      mood: selectedMood || null,
      parent_id: parentPostId,
      post_type: 'normal',
      created_at: new Date().toISOString(),
    };

    // 立即更新本地状态并保存至 localStorage
    const nextPosts = [...posts, newPost];
    setPosts(nextPosts);
    try {
      localStorage.setItem(`duo_moments_posts_${pairCode}`, JSON.stringify(nextPosts));
    } catch (_) {}

    // 清空输入区
    setContent('');
    setAttachedImages([]);
    setReplyingTo(null);
    setShowMoodMenu(false);
    setSubmitting(false);
    soundEffects.playPop();

    // 同步到 Supabase
    if (isSupabaseConfigured) {
      try {
        await supabase.from('couple_posts').insert({
          id: newId,
          pair_code: pairCode,
          author_id: userId,
          author_nickname: nickname,
          content: newPost.content,
          image_url: newPost.image_url,
          mood: newPost.mood || null,
          parent_id: parentPostId,
          post_type: newPost.post_type,
        });
      } catch (err) {
        console.error('上传动态失败:', err);
      }
    }
  };

  // 6. 快捷状态打卡
  const handleSelectQuickStatus = async (icon: string, text: string) => {
    if (!pairCode) return;
    const statusPostContent = `打卡状态：${icon} ${text}`;

    if (isSupabaseConfigured) {
      try {
        await supabase.from('user_status').upsert({
          user_id: userId,
          pair_code: pairCode,
          status_icon: icon,
          status_text: text,
          updated_at: new Date().toISOString(),
        });
      } catch (_) {}
    }

    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'p_' + Date.now();

    const newPost: CouplePost = {
      id: newId,
      pair_code: pairCode,
      author_id: userId,
      author_nickname: nickname,
      content: statusPostContent,
      mood: icon,
      post_type: 'status',
      created_at: new Date().toISOString(),
    };

    const nextPosts = [...posts, newPost];
    setPosts(nextPosts);
    try {
      localStorage.setItem(`duo_moments_posts_${pairCode}`, JSON.stringify(nextPosts));
    } catch (_) {}

    if (isSupabaseConfigured) {
      try {
        await supabase.from('couple_posts').insert({
          id: newId,
          pair_code: pairCode,
          author_id: userId,
          author_nickname: nickname,
          content: statusPostContent,
          mood: icon,
          post_type: 'status',
        });
      } catch (_) {}
    }

    soundEffects.playDing();
    setShowQuickStatus(false);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
  };

  // 7. 徽章增减入账
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
        const { data: currentRecord } = await supabase
          .from('badge_balances')
          .select('count')
          .eq('pair_code', pairCode)
          .eq('user_id', receiverId)
          .eq('badge_type', badgeType)
          .maybeSingle();

        const currentCount = currentRecord?.count || 0;
        const nextCount = Math.max(0, currentCount + delta);

        await supabase.from('badge_balances').upsert({
          pair_code: pairCode,
          user_id: receiverId,
          badge_type: badgeType,
          count: nextCount,
          updated_at: new Date().toISOString(),
        });

        await supabase.from('badge_logs').insert({
          pair_code: pairCode,
          sender_id: userId,
          sender_nickname: nickname,
          receiver_id: receiverId,
          receiver_nickname: receiverNickname,
          badge_type: badgeType,
          delta,
          reason: reasonText,
          post_id: isValidUuid(postId) ? postId : null,
        });

        fetchAllData();
      } catch (err) {
        console.error('增加徽章失败:', err);
      }
    } else {
      setBalances((prev) => {
        const idx = prev.findIndex((b) => b.user_id === receiverId && b.badge_type === badgeType);
        if (idx >= 0) {
          const next = [...prev];
          next[idx].count = Math.max(0, next[idx].count + delta);
          return next;
        }
        return [
          ...prev,
          {
            pair_code: pairCode,
            user_id: receiverId,
            badge_type: badgeType,
            count: delta,
            updated_at: new Date().toISOString(),
          },
        ];
      });
    }
  };

  // 8. 贴纸表态切换
  const handleToggleReaction = async (postId: string, emoji: string) => {
    if (!pairCode) return;
    const existing = reactions.find(
      (r) => r.post_id === postId && r.user_id === userId && r.emoji === emoji
    );

    if (existing) {
      setReactions((prev) => prev.filter((r) => r.id !== existing.id));
      if (isSupabaseConfigured) {
        await supabase.from('post_reactions').delete().eq('id', existing.id);
      }
    } else {
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

  // 9. 删除消息
  const handleDeletePost = async (postId: string) => {
    const nextPosts = posts.filter((p) => p.id !== postId);
    setPosts(nextPosts);
    try {
      localStorage.setItem(`duo_moments_posts_${pairCode}`, JSON.stringify(nextPosts));
    } catch (_) {}

    if (isSupabaseConfigured) {
      await supabase.from('couple_posts').delete().eq('id', postId);
    }
  };

  // 10. 引用回复
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

  // 小红花余额统计
  const myFlowerCount =
    balances.find((b) => b.user_id === userId && b.badge_type === 'flower')?.count || 0;
  const partnerFlowerCount =
    balances.find((b) => b.user_id === partnerUserId && b.badge_type === 'flower')?.count || 0;

  return (
    <div className="h-[calc(100dvh-50px)] max-w-3xl mx-auto px-2 sm:px-4 py-1.5 flex flex-col justify-between overflow-hidden">
      {/* 顶部紧凑看板：徽章条与对方状态 */}
      <div className="bg-slate-900 rounded-xl px-3 py-1.5 text-white border border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => {
              setPrefilledPostId(null);
              setShowBadgeLedger(true);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-rose-500/50 text-xs transition-all shadow-xs group"
          >
            <Award className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-rose-300">🌸 我的红花: {myFlowerCount}</span>
            <span className="text-slate-500 font-mono text-[10px]">|</span>
            <span className="text-slate-300">TA: {partnerFlowerCount}</span>
          </button>

          {(['star', 'coffee', 'hug'] as BadgeType[]).map((bType) => {
            const cfg = BADGE_CONFIG[bType];
            const cnt = balances.find((b) => b.user_id === userId && b.badge_type === bType)?.count || 0;
            return (
              <button
                key={bType}
                onClick={() => setShowBadgeLedger(true)}
                className="px-2 py-0.5 rounded-md bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 flex items-center gap-1"
              >
                <span>{cfg.emoji}</span>
                <span className="font-mono font-bold">{cnt}</span>
              </button>
            );
          })}
        </div>

        {/* 对方实时状态 */}
        <div className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
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

      {/* 中间核心：QQ 式对话布局消息流（左侧对方，右侧自己） */}
      <div
        ref={chatScrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-1 sm:px-2 py-2 space-y-3 no-scrollbar"
      >
        {posts.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs font-mono space-y-1">
            <p>还没有聊天记录</p>
            <p className="text-[11px] text-slate-300">发一条文字、拍一张照片或画一张涂鸦吧！</p>
          </div>
        ) : (
          posts.map((post, idx) => {
            const isMine = post.author_id === userId;
            const images = parseImages(post.image_url);
            const parentPost = post.parent_id
              ? posts.find((p) => p.id === post.parent_id)
              : null;

            // 时间分割线（相邻消息间隔大于 5 分钟显示）
            let showTimeDivider = false;
            if (idx === 0) {
              showTimeDivider = true;
            } else {
              const prevTime = new Date(posts[idx - 1].created_at).getTime();
              const currTime = new Date(post.created_at).getTime();
              if (currTime - prevTime > 5 * 60 * 1000) {
                showTimeDivider = true;
              }
            }

            return (
              <div key={post.id} className="space-y-1">
                {showTimeDivider && (
                  <div className="text-center py-1">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100/90 px-2.5 py-0.5 rounded-full shadow-2xs">
                      {formatChatTime(post.created_at)}
                    </span>
                  </div>
                )}

                {/* 气泡外层 */}
                <div
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-full`}
                >
                  {/* 发送者昵称 */}
                  <span className="text-[10px] text-slate-400 font-mono mb-0.5 px-1">
                    {post.author_nickname}
                  </span>

                  {/* 聊天气泡主体 */}
                  <div
                    className={`relative p-3 rounded-2xl shadow-xs transition-all max-w-[88%] sm:max-w-[78%] ${
                      isMine
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-white border border-slate-200/90 text-slate-900 rounded-tl-xs'
                    }`}
                  >
                    {/* 心情角标（仅当有 mood 时显示） */}
                    {post.mood && (
                      <div
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full mb-1.5 font-medium ${
                          isMine ? 'bg-blue-700/80 text-blue-100' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span>{post.mood}</span>
                        <span>心情</span>
                      </div>
                    )}

                    {/* 引用回复摘要 */}
                    {parentPost && (
                      <div
                        className={`text-xs p-2 rounded-lg border-l-2 mb-2 line-clamp-2 ${
                          isMine
                            ? 'bg-blue-700/60 border-blue-300 text-blue-100'
                            : 'bg-slate-50 border-blue-500 text-slate-600'
                        }`}
                      >
                        <span className="font-bold mr-1">@{parentPost.author_nickname}:</span>
                        <span>{parentPost.content || '[图片/涂鸦]'}</span>
                      </div>
                    )}

                    {/* 文本内容 */}
                    {post.content && (
                      <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {post.content}
                      </p>
                    )}

                    {/* 图片与涂鸦多图矩阵 */}
                    {images.length > 0 && (
                      <div
                        className={`mt-2 gap-1.5 ${
                          images.length === 1
                            ? 'flex'
                            : images.length === 2
                            ? 'grid grid-cols-2'
                            : 'grid grid-cols-3'
                        }`}
                      >
                        {images.map((imgUrl, imgIdx) => (
                          <div
                            key={imgIdx}
                            onClick={() => setPreviewImage(imgUrl)}
                            className="relative rounded-xl overflow-hidden cursor-zoom-in bg-black/5 hover:opacity-90 transition-opacity border border-black/5"
                          >
                            <img
                              src={imgUrl}
                              alt="media"
                              className={`object-cover ${
                                images.length === 1
                                  ? 'max-h-56 max-w-full rounded-xl'
                                  : 'w-full h-24 sm:h-28 rounded-xl'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 气泡下方：快捷表态胶囊与操作 */}
                  <div
                    className={`flex items-center gap-2 mt-1 px-1 flex-wrap ${
                      isMine ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {/* 表情表态 */}
                    <ReactionCapsules
                      postId={post.id}
                      reactions={reactions}
                      currentUserId={userId}
                      onToggleReaction={handleToggleReaction}
                    />

                    {/* 快捷操作：引用回复 */}
                    <button
                      type="button"
                      onClick={() => handleStartReply(post)}
                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                      title="引用回复"
                    >
                      <MessageSquareReply className="w-3.5 h-3.5" />
                    </button>

                    {/* 若是对方发送，支持打赏小红花 */}
                    {!isMine && (
                      <button
                        type="button"
                        onClick={() => {
                          setPrefilledPostId(post.id);
                          setShowBadgeLedger(true);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        title="给此动态打赏小红花"
                      >
                        <Award className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* 若是自己发送，支持删除 */}
                    {isMine && (
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        title="删除消息"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 底部固定输入区（QQ 式输入条） */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 sm:p-2.5 space-y-1.5 shrink-0 mt-1">
        {/* 引用回复提示条 */}
        {replyingTo && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1 text-xs text-blue-900 animate-fade-in">
            <div className="flex items-center gap-1.5 truncate">
              <MessageSquareReply className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">
                回复 <strong>@{replyingTo.author_nickname}</strong>: {replyingTo.content.slice(0, 30)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-blue-400 hover:text-blue-700 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 多图及涂鸦预览横条 */}
        {attachedImages.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar animate-fade-in">
            {attachedImages.map((img, i) => (
              <div key={i} className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-slate-200">
                <img src={img} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setAttachedImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-slate-900/80 text-white flex items-center justify-center text-[10px]"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            <span className="text-[10px] text-slate-400 font-mono shrink-0">
              已选 {attachedImages.length} 张
            </span>
          </div>
        )}

        {/* 快捷打卡展开抽屉 */}
        {showQuickStatus && (
          <div className="pt-1 pb-1.5 border-b border-slate-100 animate-fade-in">
            <QuickStatusBar onSelectStatus={handleSelectQuickStatus} disabled={submitting} />
          </div>
        )}

        {/* 工具栏排：多选图片、即兴涂鸦、心情选择（支持空心情）、打卡入口 */}
        <div className="flex items-center justify-between gap-1 text-slate-600">
          <div className="flex items-center gap-1">
            {/* 多图上传 */}
            <input
              type="file"
              multiple
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFilesSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center gap-1 text-xs transition-colors"
              title="上传图片 (支持同时上传多张)"
            >
              <ImageIcon className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline text-[11px]">图片</span>
            </button>

            {/* 即兴涂鸦便签 */}
            <button
              type="button"
              onClick={() => setShowDoodleModal(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center gap-1 text-xs transition-colors"
              title="即兴手绘涂鸦 (可与图片同时发送)"
            >
              <Palette className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline text-[11px]">手绘涂鸦</span>
            </button>

            {/* 心情下拉选择（支持“无心情”空选项） */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoodMenu(!showMoodMenu)}
                className={`p-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-1 text-xs transition-colors ${
                  selectedMood ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-600'
                }`}
                title="选择心情 (支持不选)"
              >
                <span>{selectedMood || <Smile className="w-4 h-4 text-amber-500" />}</span>
                <span className="text-[11px]">{selectedMood ? '已选' : '心情'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showMoodMenu && (
                <div className="absolute bottom-8 left-0 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-2 grid grid-cols-5 gap-1.5 w-52 animate-fade-in">
                  {MOOD_OPTIONS.map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => {
                        setSelectedMood(m.emoji || null);
                        setShowMoodMenu(false);
                      }}
                      className={`p-1.5 rounded-lg text-center text-xs transition-all ${
                        selectedMood === m.emoji || (!selectedMood && !m.emoji)
                          ? 'bg-slate-900 text-white font-bold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="text-base block">{m.emoji || '🚫'}</span>
                      <span className="text-[9px] block mt-0.5 truncate">{m.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 状态打卡入口切换 */}
            <button
              type="button"
              onClick={() => setShowQuickStatus(!showQuickStatus)}
              className={`p-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-1 text-xs transition-colors ${
                showQuickStatus ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600'
              }`}
              title="快速状态打卡"
            >
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline text-[11px]">打卡</span>
            </button>
          </div>

          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            Enter 发送 · Shift+Enter 换行
          </span>
        </div>

        {/* 输入框与发送按钮 */}
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="发送消息交流（支持 Ctrl+V 粘贴截图）..."
            className="flex-1 max-h-24 min-h-[36px] py-1.5 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 resize-none leading-relaxed"
          />

          <button
            type="submit"
            disabled={submitting || (!content.trim() && attachedImages.length === 0)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1 font-mono shrink-0 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>发送</span>
          </button>
        </form>
      </div>

      {/* 徽章与小红花账本 Modal */}
      <BadgeLedgerModal
        isOpen={showBadgeLedger}
        onClose={() => setShowBadgeLedger(false)}
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

      {/* 即兴手绘涂鸦 Modal（保存后加入待发送多媒体队列，支持与照片一起发送） */}
      <DoodleModal
        isOpen={showDoodleModal}
        onClose={() => setShowDoodleModal(false)}
        onSaveDoodle={(dataUrl) => {
          setAttachedImages((prev) => [...prev, dataUrl]);
          setShowDoodleModal(false);
        }}
      />

      {/* 大图预览灯箱 */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in cursor-zoom-out"
        >
          <img
            src={previewImage}
            alt="full preview"
            className="max-w-[95vw] max-h-[90vh] rounded-2xl shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
