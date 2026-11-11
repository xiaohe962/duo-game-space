'use client';

import React, { useState } from 'react';
import { BadgeBalance, BadgeLog, BadgeType } from '@/lib/types';
import { X, Award, Plus, Minus, History, Heart, Sparkles, Send } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BadgeLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairCode: string;
  userId: string;
  nickname: string;
  partnerNickname: string;
  partnerUserId: string;
  balances: BadgeBalance[];
  logs: BadgeLog[];
  onAddBadge: (
    receiverId: string,
    receiverNickname: string,
    badgeType: BadgeType,
    delta: number,
    reason: string,
    postId?: string
  ) => Promise<void>;
  prefilledPostId?: string | null;
}

export const BADGE_CONFIG: Record<
  BadgeType,
  { name: string; emoji: string; color: string; bg: string; border: string }
> = {
  flower: {
    name: '小红花',
    emoji: '🌸',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
  star: {
    name: '小星星',
    emoji: '🌟',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  coffee: {
    name: '爱心咖啡',
    emoji: '☕',
    color: 'text-amber-800',
    bg: 'bg-amber-100/50',
    border: 'border-amber-300',
  },
  hug: {
    name: '温暖抱抱',
    emoji: '🤗',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
};

export default function BadgeLedgerModal({
  isOpen,
  onClose,
  userId,
  nickname,
  partnerNickname,
  partnerUserId,
  balances,
  logs,
  onAddBadge,
  prefilledPostId,
}: BadgeLedgerModalProps) {
  const [tab, setTab] = useState<'balances' | 'logs' | 'adjust'>('balances');
  const [selectedTarget, setSelectedTarget] = useState<'partner' | 'self'>('partner');
  const [selectedBadge, setSelectedBadge] = useState<BadgeType>('flower');
  const [amount, setAmount] = useState<number>(1);
  const [direction, setDirection] = useState<1 | -1>(1); // +1 奖励 或 -1 扣除
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // 计算双方余额统计
  const getBalanceCount = (targetUid: string, bType: BadgeType) => {
    const item = balances.find((b) => b.user_id === targetUid && b.badge_type === bType);
    return item ? item.count : 0;
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDelta = direction * Math.max(1, amount || 1);
    const finalReason = reason.trim() || (direction > 0 ? '暖心鼓励奖励' : '日常小惩打卡');

    setSubmitting(true);
    const receiverId = selectedTarget === 'partner' ? partnerUserId : userId;
    const receiverNick = selectedTarget === 'partner' ? partnerNickname : nickname;

    try {
      await onAddBadge(
        receiverId,
        receiverNick,
        selectedBadge,
        finalDelta,
        finalReason,
        prefilledPostId || undefined
      );

      // 触发展开轻量动效与振动反馈
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }

      setReason('');
      setAmount(1);
      setDirection(1);
      setTab('logs');
    } catch (err) {
      console.error('更新徽章失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88dvh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-mono">
                徽章小红花账本
              </h3>
              <p className="text-[11px] text-slate-400">双人专属奖惩与暖心激励记录</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 选项卡切换 */}
        <div className="flex border-b border-slate-100 p-1 bg-slate-100/60 text-xs font-medium">
          <button
            onClick={() => setTab('balances')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              tab === 'balances'
                ? 'bg-white text-slate-900 font-bold shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            双方持有资产
          </button>
          <button
            onClick={() => setTab('logs')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              tab === 'logs'
                ? 'bg-white text-slate-900 font-bold shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            收支明细流水 ({logs.length})
          </button>
          <button
            onClick={() => setTab('adjust')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
              tab === 'adjust'
                ? 'bg-rose-600 text-white font-bold shadow-sm'
                : 'text-rose-600 hover:bg-rose-50'
            }`}
          >
            <Plus className="w-3 h-3" />
            奖惩调分
          </button>
        </div>

        {/* 内容主体 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 视图 1：双方持有资产看板 */}
          {tab === 'balances' && (
            <div className="space-y-4">
              {/* 我的徽章 */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>👑 我的资产 ({nickname})</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">MINE</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(BADGE_CONFIG) as BadgeType[]).map((type) => {
                    const cfg = BADGE_CONFIG[type];
                    const cnt = getBalanceCount(userId, type);
                    return (
                      <div
                        key={type}
                        className={`p-2.5 rounded-xl border text-center ${cfg.bg} ${cfg.border}`}
                      >
                        <span className="text-xl block mb-0.5">{cfg.emoji}</span>
                        <span className="text-xs font-black text-slate-900 block">{cnt}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{cfg.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 队友的徽章 */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>✨ {partnerNickname} 的资产</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">PARTNER</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(BADGE_CONFIG) as BadgeType[]).map((type) => {
                    const cfg = BADGE_CONFIG[type];
                    const cnt = getBalanceCount(partnerUserId, type);
                    return (
                      <div
                        key={type}
                        className={`p-2.5 rounded-xl border text-center ${cfg.bg} ${cfg.border}`}
                      >
                        <span className="text-xl block mb-0.5">{cfg.emoji}</span>
                        <span className="text-xs font-black text-slate-900 block">{cnt}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{cfg.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={() => setTab('adjust')}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>立即给对方发放小红花</span>
                </button>
              </div>
            </div>
          )}

          {/* 视图 2：收支明细流水 */}
          {tab === 'logs' && (
            <div className="space-y-2.5">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  暂无徽章变动记录，快去给对方发送第一朵小红花吧！
                </div>
              ) : (
                logs.map((log) => {
                  const cfg = BADGE_CONFIG[log.badge_type] || BADGE_CONFIG.flower;
                  const isPositive = log.delta > 0;
                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg shrink-0">{cfg.emoji}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            <span className="text-blue-600">@{log.sender_nickname}</span>
                            <span className="text-slate-400 mx-1">
                              {isPositive ? '奖励给' : '扣除了'}
                            </span>
                            <span className="text-purple-600">@{log.receiver_nickname}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            理由：{log.reason || '无理由暖心奖励'}
                          </p>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-black font-mono text-sm px-2 py-0.5 rounded-lg ${
                            isPositive
                              ? 'text-emerald-600 bg-emerald-50'
                              : 'text-rose-600 bg-rose-50'
                          }`}
                        >
                          {isPositive ? `+${log.delta}` : log.delta}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 视图 3：快捷调分奖惩 */}
          {tab === 'adjust' && (
            <form onSubmit={handleAdjustSubmit} className="space-y-3.5">
              {/* 对象选择 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. 选择奖惩对象
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTarget('partner')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      selectedTarget === 'partner'
                        ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    奖励给 {partnerNickname}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTarget('self')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      selectedTarget === 'self'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    奖励给自己 ({nickname})
                  </button>
                </div>
              </div>

              {/* 徽章类型 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  2. 选择徽章类型
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(BADGE_CONFIG) as BadgeType[]).map((type) => {
                    const cfg = BADGE_CONFIG[type];
                    return (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setSelectedBadge(type)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          selectedBadge === type
                            ? 'border-slate-900 bg-slate-900 text-white font-bold scale-105 shadow-md'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <span className="text-xl block">{cfg.emoji}</span>
                        <span className="text-[10px] mt-0.5 block">{cfg.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 数量增减：仅保留 +1 和 -1 两个按钮，支持手动输入数字（默认为 1） */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  3. 增减变动数量
                </label>
                <div className="flex items-center gap-2">
                  {/* 方向与快捷按钮：+1 (增加) 和 -1 (扣除) */}
                  <div className="flex items-center gap-1.5 flex-1">
                    <button
                      type="button"
                      onClick={() => setDirection(1)}
                      className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center justify-center gap-1 ${
                        direction === 1
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+1 奖励</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection(-1)}
                      className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center justify-center gap-1 ${
                        direction === -1
                          ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>-1 扣除</span>
                    </button>
                  </div>

                  {/* 手动输入数字输入框（默认 1） */}
                  <div className="flex items-center gap-1 shrink-0 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-medium text-slate-400">数量:</span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={amount}
                      onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 text-center font-mono font-bold text-xs bg-white border border-slate-200 rounded-md py-1 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* 理由说明 (非必填) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    4. 填写奖惩理由 (选填)
                  </label>
                  <span className="text-[10px] text-slate-400">不填默认日常互动</span>
                </div>
                <input
                  type="text"
                  placeholder="例如：做了好吃的早饭 / 熬夜打屁股 / 陪我聊天..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={50}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-98"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {submitting
                    ? '正在入账...'
                    : `确认${direction > 0 ? '奖励' : '扣除'} ${amount} 朵${BADGE_CONFIG[selectedBadge].name}`}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
