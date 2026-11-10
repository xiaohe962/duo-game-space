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
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 shrink-0 mr-1">
        <Sparkles className="w-3 h-3 text-blue-500" />
        <span>快捷打卡:</span>
      </div>
      {STATUS_PRESETS.map((item) => (
        <button
          key={item.text}
          type="button"
          disabled={disabled}
          onClick={() => onSelectStatus(item.icon, item.text)}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 hover:bg-white text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-400 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <span>{item.icon}</span>
          <span>{item.text}</span>
        </button>
      ))}
    </div>
  );
}
