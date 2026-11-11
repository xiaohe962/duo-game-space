'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePairAuth } from '@/context/PairAuthContext';
import {
  Gamepad2,
  Copy,
  Check,
  LogOut,
  ArrowLeft,
  UserCheck,
  Palette,
  HelpCircle,
  Activity,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { pairCode, isPaired, partnerOnline, partnerNickname, unbind, role } = usePairAuth();
  const [copied, setCopied] = useState(false);
  const [showUnbindModal, setShowUnbindModal] = useState(false);

  if (!pairCode) return null;

  const handleCopy = () => {
    if (!pairCode) return;
    navigator.clipboard.writeText(pairCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLobby = pathname === '/' || pathname === '/lobby';

  // 映射当前板块名称与图标
  const getPlateInfo = () => {
    if (pathname.startsWith('/draw')) {
      return { title: '你画我猜', icon: Palette };
    }
    if (pathname.startsWith('/guess')) {
      return { title: 'GuessWhat', icon: HelpCircle };
    }
    if (pathname.startsWith('/moments')) {
      return { title: '动态空间', icon: Activity };
    }
    return { title: '', icon: null };
  };

  const plateInfo = getPlateInfo();
  const PlateIcon = plateInfo.icon;

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-xs transition-all">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-11 sm:h-12 flex items-center justify-between">
          {/* 左侧：主页显示 Logo，进入板块后显示“返回主页”与板块名称 */}
          {isLobby ? (
            <Link href="/lobby" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm group-hover:bg-blue-500 transition-colors">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-extrabold tracking-tight text-white text-sm">
                  DUOSPACE
                </span>
                <span className="text-[10px] text-blue-400 font-medium">主页</span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/lobby"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors active:scale-95"
                title="返回主页大厅"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>返回主页</span>
              </Link>
              {plateInfo.title && (
                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
                  {PlateIcon && <PlateIcon className="w-3.5 h-3.5 text-blue-400" />}
                  <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                    {plateInfo.title}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 右侧：紧凑房间码与状态 */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 角色标识 */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono">
              <UserCheck className="w-3 h-3 text-blue-400" />
              <span>{role === 'host' ? '房主' : '队员'}</span>
            </div>

            {/* 4 位房间码徽章 */}
            <button
              onClick={handleCopy}
              title="点击复制 4 位房间码"
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors"
            >
              <span className="text-slate-400 text-[10px]">ROOM:</span>
              <span className="font-bold text-blue-400">{pairCode}</span>
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-slate-400" />
              )}
            </button>

            {/* 在线指示点 */}
            <div
              className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-[10px] font-mono"
              title={partnerOnline ? `${partnerNickname} 在线` : `${partnerNickname} 离线`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  partnerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span className="hidden sm:inline text-slate-400 truncate max-w-[60px]">
                {partnerNickname}
              </span>
            </div>

            {/* 切换房间 / 退出 */}
            <button
              onClick={() => setShowUnbindModal(true)}
              title="切换房间 / 退出"
              className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors ml-0.5"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 退出绑定确认弹窗 */}
      {showUnbindModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-xs w-full shadow-2xl text-slate-100">
            <h3 className="text-sm font-bold text-white mb-1.5">切换房间或退出？</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              退出当前房间码（{pairCode}）。下次可在主页随时输入房间码重新连接。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUnbindModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  unbind();
                  setShowUnbindModal(false);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
              >
                退出房间
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
