'use client';

import React, { useState } from 'react';
import { PostReaction } from '@/lib/types';
import { SmilePlus } from 'lucide-react';

interface ReactionCapsulesProps {
  postId: string;
  reactions: PostReaction[];
  currentUserId: string;
  onToggleReaction: (postId: string, emoji: string) => void;
}

const PRESET_EMOJIS = ['❤️', '🌸', '👏', '🥺', '⚡', '🎉'];

export default function ReactionCapsules({
  postId,
  reactions,
  currentUserId,
  onToggleReaction,
}: ReactionCapsulesProps) {
  const [showPicker, setShowPicker] = useState(false);

  // 聚合该动态的所有表情计数及本人是否已点赞
  const reactionMap = React.useMemo(() => {
    const map: Record<string, { count: number; hasReacted: boolean; names: string[] }> = {};
    reactions.forEach((r) => {
      if (!map[r.emoji]) {
        map[r.emoji] = { count: 0, hasReacted: false, names: [] };
      }
      map[r.emoji].count += 1;
      map[r.emoji].names.push(r.user_nickname);
      if (r.user_id === currentUserId) {
        map[r.emoji].hasReacted = true;
      }
    });
    return map;
  }, [reactions, currentUserId]);

  const emojiList = Object.entries(reactionMap);

  const handleSelectEmoji = (emoji: string) => {
    onToggleReaction(postId, emoji);
    setShowPicker(false);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap pt-2 relative">
      {/* 已有表态胶囊 */}
      {emojiList.map(([emoji, data]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onToggleReaction(postId, emoji)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all border ${
            data.hasReacted
              ? 'bg-blue-50/80 border-blue-400 text-blue-700 font-bold scale-105 shadow-sm'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
          title={data.names.join(', ')}
        >
          <span>{emoji}</span>
          <span className="font-mono text-[11px]">{data.count}</span>
        </button>
      ))}

      {/* 展开 Emoji 选择面板按钮 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-xs transition-colors"
          title="添加表情表态"
        >
          <SmilePlus className="w-3.5 h-3.5" />
        </button>

        {showPicker && (
          <div className="absolute left-0 bottom-full mb-1.5 z-30 flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-1 shadow-lg animate-fade-in">
            {PRESET_EMOJIS.map((emoji) => {
              const hasReacted = reactionMap[emoji]?.hasReacted;
              return (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => handleSelectEmoji(emoji)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-125 ${
                    hasReacted ? 'bg-blue-50 ring-1 ring-blue-400' : ''
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
