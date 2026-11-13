'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  const router = useRouter();
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
      <header className="sticky top-0 z-40 bg-[#2C3345] border-b border-[#3D465C] text-slate-100 shadow-xs transition-all">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-11 sm:h-12 flex items-center justify-between">
          {/* 左侧：主页显示 Logo，进入板块后显示“返回主页”与板块名称 */}
          {isLobby ? (
            <Link href="/lobby" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-[#545E79] group-hover:bg-[#64708F] flex items-center justify-center text-white shadow-sm transition-colors border border-[#64708F]">
                <Gamepad2 className="w-4 h-4 text-[#D8E2FD]" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-extrabold tracking-tight text-white text-sm">
                  DUOSPACE
                </span>
                <span className="text-[10px] text-[#D8E2FD] font-medium">主页</span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push('/lobby')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#3D465C] hover:bg-[#545E79] active:bg-[#2C3345] text-[#D8E2FD] text-xs font-semibold transition-colors touch-manipulation select-none cursor-pointer border border-[#545E79]"
                title="返回主页大厅"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>返回主页</span>
              </button>
              {plateInfo.title && (
                <div className="flex items-center gap-1.5 pl-2 border-l border-[#545E79]">
                  {PlateIcon && <PlateIcon className="w-3.5 h-3.5 text-[#BDC6E3]" />}
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
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#3D465C] text-[#D8E2FD] border border-[#545E79] text-[10px] font-mono">
              <UserCheck className="w-3 h-3 text-[#BDC6E3]" />
              <span>{role === 'host' ? '房主' : '队员'}</span>
            </div>

            {/* 4 位房间码徽章 */}
            <button
              onClick={handleCopy}
              title="点击复制 4 位房间码"
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#3D465C] hover:bg-[#545E79] text-slate-100 text-xs font-mono border border-[#545E79] transition-colors"
            >
              <span className="text-slate-300 text-[10px]">ROOM:</span>
              <span className="font-bold text-[#D8E2FD]">{pairCode}</span>
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-[#BDC6E3]" />
              )}
            </button>

            {/* 在线指示点 */}
            <div
              className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-[#3D465C]/80 border border-[#545E79] text-[10px] font-mono"
              title={partnerOnline ? `${partnerNickname} 在线` : `${partnerNickname} 离线`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  partnerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span className="hidden sm:inline text-slate-300 truncate max-w-[60px]">
                {partnerNickname}
              </span>
            </div>

            {/* 切换房间 / 退出 */}
            <button
              onClick={() => setShowUnbindModal(true)}
              title="切换房间 / 退出"
              className="p-1 rounded-md hover:bg-[#3D465C] text-slate-300 hover:text-red-400 transition-colors ml-0.5"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 退出绑定确认弹窗 */}
      {showUnbindModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#2C3345] border border-[#3D465C] rounded-2xl p-5 max-w-xs w-full shadow-2xl text-slate-100">
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
