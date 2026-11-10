'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePairAuth } from '@/context/PairAuthContext';
import { Gamepad2, Copy, Check, LogOut, Palette, HelpCircle, Activity, LayoutGrid, UserCheck } from 'lucide-react';

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

  const navItems = [
    { name: '大厅', href: '/lobby', icon: LayoutGrid },
    { name: 'GuessWhat', href: '/guess', icon: HelpCircle },
    { name: '你画我猜', href: '/draw', icon: Palette },
    { name: '动态空间', href: '/moments', icon: Activity },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-sm transition-all">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* 左侧 Logo */}
          <Link href="/lobby" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-900/30 group-hover:bg-blue-500 transition-colors">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-white text-base">
                DUOSPACE
              </span>
              <p className="text-[10px] text-slate-400 font-mono tracking-wide uppercase">双人极简互动空间</p>
            </div>
          </Link>

          {/* 中间导航链接 (桌面与平板端) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* 右侧房间状态与身份标识 */}
          <div className="flex items-center gap-2">
            {/* 当前角色标签 */}
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-mono">
              <UserCheck className="w-3 h-3 text-blue-400" />
              <span>{role === 'host' ? 'ROLE A (房主)' : 'ROLE B (队员)'}</span>
            </div>

            {/* 4 位房间码徽章 */}
            <button
              onClick={handleCopy}
              title="点击复制 4 位房间码分享给搭档"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <span className="text-slate-400 font-mono text-[11px]">ROOM:</span>
              <span className="font-mono text-sm tracking-wider font-bold text-blue-400">{pairCode}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {/* 在线状态 */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border ${
                partnerOnline
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${partnerOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <span>{partnerNickname} {partnerOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            {/* 切换房间 / 退出 */}
            <button
              onClick={() => setShowUnbindModal(true)}
              title="切换房间 / 退出绑定"
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 移动端底部快捷导航栏 */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 flex items-center justify-around py-2 px-2 shadow-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all ${
                  active ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[11px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* 退出绑定确认弹窗 */}
      {showUnbindModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white mb-2">切换房间或退出？</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              退出当前绑定的 4 位房间码（{pairCode}）。由于已开启多端账号体系，下次在任意设备输入“房间码 + 角色 + 独立密钥”即可秒级恢复本账号。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUnbindModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  unbind();
                  setShowUnbindModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
