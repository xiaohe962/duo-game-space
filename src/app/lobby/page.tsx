'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePairAuth } from '@/context/PairAuthContext';
import {
  HelpCircle,
  Palette,
  Activity,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Radio,
  UserCheck,
} from 'lucide-react';

export default function LobbyPage() {
  const router = useRouter();
  const {
    pairCode,
    nickname,
    room,
    role,
    isPaired,
    isLoading,
    partnerOnline,
    partnerNickname,
  } = usePairAuth();

  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (!isLoading && !pairCode) {
      router.replace('/');
    }
  }, [isLoading, pairCode, router]);

  if (isLoading || !pairCode) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-mono">CONNECTING ROOM...</p>
      </div>
    );
  }

  const handleCopyCode = () => {
    if (pairCode) {
      navigator.clipboard.writeText(pairCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-dvh max-w-5xl mx-auto px-4 py-4 md:py-8 space-y-5">
      {/* 顶部深蓝核心状态面板 */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-5 md:p-7 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs font-mono">
                <Radio className="w-3.5 h-3.5 text-blue-400" />
                <span>ROOM: {pairCode}</span>
                <button
                  onClick={handleCopyCode}
                  className="ml-1 p-0.5 hover:bg-slate-700 rounded transition-colors"
                  title="复制房间码"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>

              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-[11px] font-mono text-slate-300">
                <UserCheck className="w-3 h-3 text-blue-400" />
                <span>{role === 'host' ? 'ROLE A (房主)' : 'ROLE B (队员)'}</span>
              </div>
            </div>

            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              {nickname} & {partnerNickname}
            </h1>
            <p className="mt-1 text-xs text-slate-400 font-mono">
              {isPaired
                ? `双端连接正常 (2/2) · 对方状态：${partnerOnline ? '在线 ONLINE' : '离线 OFFLINE'}`
                : `等待队友在任意设备输入 4 位房间码 [ ${pairCode} ] 加入连接...`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/90 px-4 py-2.5 rounded-xl border border-slate-700 text-center min-w-[120px]">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Channel State</span>
              <span className="text-xs font-bold font-mono flex items-center justify-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${partnerOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                {isPaired ? (partnerOnline ? 'DUO ONLINE' : 'STANDBY') : 'WAITING'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 模块选择主入口卡片（严格统一命名） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 模块 1：GuessWhat */}
        <Link
          href="/guess"
          className="group relative flex flex-col justify-between p-5 md:p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                GuessWhat
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-600 font-semibold">
                20-Q
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              移植自经典猜词内核。一人出题一人猜，通过“是/否/不确定”抽丝剥茧探寻秘密词语，支持双方互换角色与战绩记录。
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 font-mono">
            <span>START GAME</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 模块 2：你画我猜 */}
        <Link
          href="/draw"
          className="group relative flex flex-col justify-between p-5 md:p-6 rounded-2xl bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Palette className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                你画我猜
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-600 font-semibold">
                CANVAS
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              基于 Pointer Events 与 Retina 高清校准，专为平板、触控笔与手机作画深度优化。120 秒竞速、60 秒半程提示与自定义调色板。
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600 font-mono">
            <span>ENTER STUDIO</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 模块 3：动态空间 */}
        <Link
          href="/moments"
          className="group relative flex flex-col justify-between p-5 md:p-6 rounded-2xl bg-white border border-slate-200 hover:border-slate-800 hover:shadow-md transition-all"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                动态空间
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-600 font-semibold">
                FEED
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              双人专属信息流与留言墙。随手发布想法与战术备忘，全端账号统一漫游，Postgres Changes 免刷新即时推流。
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-800 font-mono">
            <span>VIEW FEED</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* 底部信息栏 */}
      <div className="rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[11px]">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          跨设备账号漫游已就绪：在平板、电脑或手机输入“房间码 + 角色 + 密钥”即可无缝登录。
        </span>
        <span className="font-mono text-slate-400 text-[11px]">
          DUOSPACE ENGINE v2.0
        </span>
      </div>
    </div>
  );
}
