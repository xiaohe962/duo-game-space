'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface QuickStatusBarProps {
  onSelectStatus: (icon: string, text: string) => void;
  disabled?: boolean;
}

export const STATUS_PRESETS = [
  { icon: '📍', text: '在路上' },
  { icon: '🔋', text: '没电了' },
  { icon: '☕', text: '学习中' },
  { icon: '🌙', text: '晚安打卡' },
  { icon: '🎮', text: '游戏中' },
  { icon: '💼', text: '打工人' },
  { icon: '🍜', text: '干饭啦' },
  { icon: '✨', text: '想你啦' },
];

export default function QuickStatusBar({ onSelectStatus, disabled }: QuickStatusBarProps) {
  return (
    <div className="w-full min-w-0 max-w-full flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar touch-pan-x overscroll-contain">
      <div className="flex items-center gap-1 text-[11px] font-mono text-[#545E79] shrink-0 mr-1">
        <Sparkles className="w-3 h-3 text-[#545E79]" />
        <span>快捷打卡:</span>
      </div>
      {STATUS_PRESETS.map((item) => (
        <button
          key={item.text}
          type="button"
          disabled={disabled}
          onClick={() => onSelectStatus(item.icon, item.text)}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#EEF3FD] hover:bg-white text-[#2C3345] hover:text-[#545E79] border border-[#BDC6E3] hover:border-[#545E79] transition-all shadow-2xs active:scale-95 disabled:opacity-50"
        >
          <span>{item.icon}</span>
          <span>{item.text}</span>
        </button>
      ))}
    </div>
  );
}
