'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePairAuth } from '@/context/PairAuthContext';
import { CouplePost } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { soundEffects } from '@/lib/audio/sound';
import {
  Activity,
  Send,
  Image as ImageIcon,
  Clock,
  Trash2,
  Calendar,
  Radio,
  UserCheck,
} from 'lucide-react';

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

function formatExactTime(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

const MOODS = ['📌', '🎮', '☕', '💡', '🚀', '✨', '⚡', '🌙'];

export default function MomentsPage() {
  const router = useRouter();
  const { pairCode, userId, role, nickname, partnerNickname } = usePairAuth();

  const [posts, setPosts] = useState<CouplePost[]>([]);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [selectedMood, setSelectedMood] = useState('📌');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pairCode) router.replace('/');
  }, [pairCode, router]);

  const fetchPosts = useCallback(async () => {
    if (!pairCode) return;

    if (!isSupabaseConfigured) {
      const mockPosts: CouplePost[] = [
        {
          id: 'mock-1',
          pair_code: pairCode,
          author_id: `pair_${pairCode}_host`,
          author_nickname: role === 'host' ? nickname : partnerNickname,
          content: '双人专属空间已建立。跨设备账号体系已就绪，所有动态与战绩多端漫游同步。',
          mood: '🚀',
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
        {
          id: 'mock-2',
          pair_code: pairCode,
          author_id: `pair_${pairCode}_guest`,
          author_nickname: role === 'guest' ? nickname : partnerNickname,
          content: '收到 4 位房间码。已连接进入空间，平板作画非常丝滑！',
          mood: '⚡',
          created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        },
      ];
      setPosts(mockPosts);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('couple_posts')
        .select('*')
        .eq('pair_code', pairCode)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPosts(data as CouplePost[]);
      }
    } catch (e) {
      console.error('拉取动态失败:', e);
    } finally {
      setLoading(false);
    }
  }, [pairCode, role, nickname, partnerNickname]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (!pairCode || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`moments_changes_${pairCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couple_posts',
          filter: `pair_code=eq.${pairCode}`,
        },
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairCode]);

  // 发布动态（绑定固定 userId）
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !pairCode) return;

    setSubmitting(true);
    const newPost: CouplePost = {
      id: 'post_' + Date.now(),
      pair_code: pairCode,
      author_id: userId,
      author_nickname: nickname,
      content: content.trim(),
      image_url: imageUrl.trim() || null,
      mood: selectedMood,
      created_at: new Date().toISOString(),
    };

    setPosts((prev) => [newPost, ...prev]);
    setContent('');
    setImageUrl('');
    setShowImageInput(false);
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
        });
      } catch (e) {
        console.error('发布动态失败:', e);
      }
    }
  };

  const handleDeletePost = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (isSupabaseConfigured) {
      await supabase.from('couple_posts').delete().eq('id', postId);
    }
  };

  return (
    <div className="min-h-dvh max-w-3xl mx-auto px-4 py-4 md:py-8 space-y-5">
      {/* 头部标题 */}
      <div className="bg-slate-900 rounded-2xl p-5 md:p-6 text-white border border-slate-800 shadow-md flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold flex items-center gap-2 font-mono">
            动态空间 <Activity className="w-5 h-5 text-blue-400" />
          </h1>
          <p className="mt-1 text-xs text-slate-400 font-mono">
            双人私密信息流 · 全端账号统一漫游 · Postgres Changes 免刷新推流
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
            <Radio className="w-3.5 h-3.5 text-blue-400" />
            <span>ROOM #{pairCode}</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-[11px] font-mono text-slate-300">
            <UserCheck className="w-3 h-3 text-blue-400" />
            <span>{role === 'host' ? 'ROLE A' : 'ROLE B'}</span>
          </div>
        </div>
      </div>

      {/* 发表动态卡片 */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm space-y-3.5">
        <form onSubmit={handlePublish} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 font-mono">TAG:</span>
            <div className="flex items-center gap-1">
              {MOODS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setSelectedMood(emoji)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-transform ${
                    selectedMood === emoji ? 'bg-slate-900 text-white scale-110 shadow-sm' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <textarea
            placeholder={`在此写下即时动态或想法分享给 ${partnerNickname}...`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 resize-none"
          />

          {showImageInput && (
            <div className="flex items-center gap-2 animate-fade-in">
              <input
                type="url"
                placeholder="粘贴图片链接 URL..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowImageInput(!showImageInput)}
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors font-mono"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{showImageInput ? '收起配图' : '添加配图链接'}</span>
            </button>

            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 font-mono"
            >
              <Send className="w-3 h-3" />
              <span>POST</span>
            </button>
          </div>
        </form>
      </div>

      {/* 倒序时间轴流式呈现 */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
          <span>ALL POSTS ({posts.length})</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> REALTIME STREAM READY
          </span>
        </div>

        {posts.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center font-mono">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700 font-mono">NO POSTS YET</p>
            <p className="text-[11px] text-slate-400">在上方写下第一条动态开启空间信息流。</p>
          </div>
        ) : (
          posts.map((post) => {
            const isMine = post.author_id === userId;
            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-colors space-y-2.5"
              >
                {/* 头部：作者与时间戳 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-xs ${
                        isMine
                          ? 'bg-slate-900 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {post.author_nickname.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {post.author_nickname}
                        </span>
                        {isMine && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-100 text-slate-600 font-semibold">
                            YOU
                          </span>
                        )}
                        <span className="text-xs">{post.mood || '📌'}</span>
                      </div>
                      <div
                        className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono"
                        title={formatExactTime(post.created_at)}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{formatRelativeTime(post.created_at)}</span>
                        <span className="opacity-50">· {formatExactTime(post.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 删除按钮（严格绑定固定账号：仅本人在任意设备均可删除） */}
                  {isMine && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-slate-50 transition-colors"
                      title="删除动态"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 正文内容 */}
                <p className="text-xs md:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* 配图 */}
                {post.image_url && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 max-h-72 max-w-md">
                    <img
                      src={post.image_url}
                      alt="动态配图"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
