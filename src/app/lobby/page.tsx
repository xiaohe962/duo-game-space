'use client';

import React, { useState, useEffect } from 'react';
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
  Info,
  X,
  Sparkles,
} from 'lucide-react';

interface ModuleInfo {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  color: string;
  bgColor: string;
  textColor: string;
  href: string;
  icon: any;
  overview: string;
  rules: string[];
  tips: string;
}

const MODULE_DETAILS: Record<string, ModuleInfo> = {
  guess: {
    id: 'guess',
    title: 'GuessWhat',
    subtitle: '经典二十问是非猜词',
    badge: '20-Q',
    color: 'border-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    href: '/guess',
    icon: HelpCircle,
    overview: '经典的二十问（20 Questions）游戏。一人出题一人猜，通过一系列只能回答“是/否/不确定”的问题抽丝剥茧探寻秘密词条。',
    rules: [
      '出题人可在预设词库中挑选一个秘密词，亦可自由输入任意词汇。',
      '猜词人每次输入一个是非疑问句，出题人根据客观事实判定：【是】、【否】或【不确定/无关】。',
      '猜词人最多拥有 20 次提问机会与 5 次直接猜词机会。',
      '每局结束后支持一键互换角色再战，战绩双方自动沉淀记录。',
    ],
    tips: '建议先从大范围分类切入（如“这是活的生物吗？”、“在日常生活中常见吗？”），逐步锁定范围后再提问具体属性。',
  },
  draw: {
    id: 'draw',
    title: '你画我猜',
    subtitle: '双人极速实时画板',
    badge: 'CANVAS',
    color: 'border-indigo-500',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
    href: '/draw',
    icon: Palette,
    overview: '专为平板、触控笔与手机优化的实时画板对战。画师执笔挥洒创意，猜词人实时观摩并在对话框发起竞猜，毫秒级网络同步。',
    rules: [
      '每局开始时系统随机提供 4 个候选词供画师挑选，支持换一批。',
      '选定后进入 120 秒作画时间。开局仅向猜词人透漏字数（如“2个字”）。',
      '倒计时进入 60 秒后，系统自动解锁词条分类线索（如“分类：水果”），不再透露多余文字，保持竞猜张力。',
      '画板提供 11 种精选预制颜色与第 12 格专业 2D HSV 自选色板，支持 1~40px 自由滑动调节粗细与整笔撤回。',
    ],
    tips: '善用不同粗细与鲜明对比色先勾勒主体轮廓，再补充细节特征；猜词人可多次快速发消息尝试。',
  },
  moments: {
    id: 'moments',
    title: '动态空间',
    subtitle: '双人私密互动流与账本',
    badge: 'FEED',
    color: 'border-slate-800',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-800',
    href: '/moments',
    icon: Activity,
    overview: '双人专属的私密朋友圈与日常留言备忘墙。支持图文混排、图片直传、剪贴板截图、手绘便签以及专属小红花奖励账本。',
    rules: [
      '小红花与徽章系统：内置🌸小红花、🌟星星、☕咖啡、🤗抱抱，支持双方互相增减并记录详细流水明细。',
      '多媒体与涂鸦：支持直接上传本地图片、在输入框直接粘贴截图（Ctrl+V），以及使用即兴手绘板涂鸦插入。',
      '楼中楼与表态：点击动态可引用回复展开对话树，底部支持快捷表态表情一键点赞。',
      '快捷状态打卡：一键打卡当前状态（在路上、学习中、晚安等），即时同步给对方。',
    ],
    tips: '完成生活小约定或游戏胜利时，可以在小红花账本里为 TA 打赏奖励；重要备忘可直接配图发出。',
  },
};

export default function LobbyPage() {
  const router = useRouter();
  const {
    pairCode,
    nickname,
    role,
    isPaired,
    isLoading,
    partnerOnline,
    partnerNickname,
  } = usePairAuth();

  const [copied, setCopied] = useState(false);
  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null);

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

  const activeModule = activeInfoKey ? MODULE_DETAILS[activeInfoKey] : null;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-3 sm:space-y-4">
      {/* 顶部超紧凑深色状态条：减少无用信息，释放视觉面积 */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-white shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        {/* 左侧：昵称搭档与在线状态 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold tracking-tight">
            <span>{nickname}</span>
            <span className="text-slate-500 font-mono">&</span>
            <span className="text-blue-400">{partnerNickname}</span>
          </div>

          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
              partnerOnline
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${partnerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>{partnerOnline ? 'TA 在线' : 'TA 离线'}</span>
          </div>
        </div>

        {/* 右侧：房间码与身份 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-mono">
            <UserCheck className="w-3 h-3 text-blue-400" />
            <span>{role === 'host' ? '房主' : '队员'}</span>
          </div>

          <button
            onClick={handleCopyCode}
            title="点击复制 4 位房间码"
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors"
          >
            <Radio className="w-3 h-3 text-blue-400" />
            <span className="text-slate-400 text-[10px]">ROOM:</span>
            <span className="font-bold text-blue-400">{pairCode}</span>
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* 模块选择主入口卡片：精简内容，仅保留标题，简介折叠至感叹号里 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.values(MODULE_DETAILS).map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.id}
              className="relative flex flex-col justify-between p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group"
            >
              {/* 卡片头部：图标 + 标题 + 感叹号详情触发器 */}
              <div className="flex items-center justify-between">
                <Link
                  href={mod.href}
                  className="flex items-center gap-2.5 flex-1 min-w-0"
                >
                  <div
                    className={`w-9 h-9 rounded-lg ${mod.bgColor} ${mod.textColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h2 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {mod.title}
                    </h2>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {mod.subtitle}
                    </span>
                  </div>
                </Link>

                {/* 感叹号简介折叠按钮 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveInfoKey(mod.id);
                  }}
                  title={`查看 ${mod.title} 详细玩法与简介`}
                  className="w-7 h-7 rounded-full bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center border border-slate-200 hover:border-blue-300 transition-colors shrink-0 ml-1 active:scale-95"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 卡片底部直达链接 */}
              <Link
                href={mod.href}
                className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-blue-600 transition-colors"
              >
                <span className="font-mono text-[11px]">进入板块</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          );
        })}
      </div>

      {/* 底部极简漫游提示 */}
      <div className="rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>跨设备实时同步：任意设备输入房间码即刻秒级重连。</span>
        </span>
        <span className="text-[10px] font-mono text-slate-400">DUOSPACE v2.1</span>
      </div>

      {/* 感叹号展开的丰富简介与玩法规则弹窗 */}
      {activeModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* 弹窗头部 */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg ${activeModule.bgColor} ${activeModule.textColor} flex items-center justify-center`}
                >
                  <activeModule.icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    {activeModule.title} · 玩法与规则介绍
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {activeModule.subtitle}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveInfoKey(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 弹窗核心内容（滚动区） */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed">
              {/* 核心概述 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-medium">
                {activeModule.overview}
              </div>

              {/* 详细规则列表 */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  规则说明
                </h4>
                <ul className="space-y-1.5 pl-1">
                  {activeModule.rules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 战术与玩法小贴士 */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-amber-900">
                <span className="font-bold text-[11px] block mb-0.5">💡 玩法贴士：</span>
                <span className="text-[11px] leading-normal">{activeModule.tips}</span>
              </div>
            </div>

            {/* 弹窗底部操作 */}
            <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                type="button"
                onClick={() => setActiveInfoKey(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white"
              >
                关闭
              </button>
              <Link
                href={activeModule.href}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1"
              >
                <span>立即进入体验</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
