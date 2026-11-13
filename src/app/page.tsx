'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePairAuth } from '@/context/PairAuthContext';
import { PlayerRole } from '@/lib/types';
import { Gamepad2, Sparkles, KeyRound, ArrowRight, Palette, HelpCircle, Activity, User, Lock } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { pairCode, isLoading, createRoom, joinRoom } = usePairAuth();

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [nickname, setNickname] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<PlayerRole>('guest');
  const [pin, setPin] = useState('0000');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && pairCode) {
      router.replace('/lobby');
    }
  }, [isLoading, pairCode, router]);

  if (isLoading || pairCode) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-mono">LOADING SESSION...</p>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createRoom(nickname || 'Player 1', pin || '0000');
      router.push('/lobby');
    } catch (err: any) {
      setError(err.message || '生成失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinOrClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(inputCode.trim())) {
      setError('请输入正确的 4 位数字房间码');
      return;
    }
    setSubmitting(true);
    try {
      await joinRoom(inputCode.trim(), selectedRole, nickname, pin || '0000');
      router.push('/lobby');
    } catch (err: any) {
      setError(err.message || '登录失败，请检查房间码或密钥');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh max-w-md mx-auto px-4 py-8 md:py-16 flex flex-col justify-center">
      {/* 头部标题与标语 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#545E79] text-white shadow-xl shadow-[#545E79]/20 mb-3 border border-[#64708F]">
          <Gamepad2 className="w-6 h-6 text-[#D8E2FD]" />
        </div>
        <h1 className="text-2xl font-black text-[#2C3345] tracking-tight">
          DUOSPACE
        </h1>
        <p className="mt-1 text-xs text-[#545E79] font-mono font-medium">
          双人极简互动空间 · 4 位房间码跨设备即时联机
        </p>
      </div>

      {/* 主卡片 */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#BDC6E3]">
        <div className="flex bg-[#EEF3FD] p-1 rounded-xl mb-6 border border-[#BDC6E3]/60">
          <button
            onClick={() => {
              setTab('create');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'create'
                ? 'bg-white text-[#2C3345] shadow-xs'
                : 'text-[#64708F] hover:text-[#2C3345]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#545E79]" />
            创建新房间
          </button>
          <button
            onClick={() => {
              setTab('join');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'join'
                ? 'bg-white text-[#2C3345] shadow-xs'
                : 'text-[#64708F] hover:text-[#2C3345]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-[#545E79]" />
            加入 / 多端登录
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#2C3345] mb-1.5">
                设置房主昵称 (角色 A)
              </label>
              <input
                type="text"
                placeholder="例如：Player 1"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={16}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#BDC6E3] focus:outline-none focus:ring-2 focus:ring-[#545E79] text-xs bg-[#F7FAFE] text-[#2C3345]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2C3345] mb-1.5 flex items-center justify-between">
                <span>跨设备登录密钥 PIN (选填)</span>
                <span className="text-[10px] text-[#64708F] font-mono">默认 0000</span>
              </label>
              <input
                type="text"
                maxLength={8}
                placeholder="4~8位密码 (如 8888)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#BDC6E3] focus:outline-none focus:ring-2 focus:ring-[#545E79] text-xs bg-[#F7FAFE] text-[#2C3345] font-mono"
              />
              <p className="text-[10px] text-[#64708F] mt-1">设置后，可在平板或新电脑上输入该密钥无缝登录同一账号。</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#545E79] hover:bg-[#3D465C] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              {submitting ? '正在创建...' : '生成 4 位房间码并进入'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinOrClaim} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#2C3345] mb-1.5">
                4 位房间码
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="0000"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#BDC6E3] focus:outline-none focus:ring-2 focus:ring-[#545E79] text-center font-mono text-xl tracking-widest bg-[#F7FAFE] text-[#2C3345] font-bold"
              />
            </div>

            {/* 跨端身份选择 */}
            <div>
              <label className="block text-xs font-medium text-[#2C3345] mb-1.5">
                选择你的登录身份 (支持换端认领)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('guest')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all text-center ${
                    selectedRole === 'guest'
                      ? 'border-[#545E79] bg-[#EEF3FD] text-[#2C3345] font-bold shadow-xs'
                      : 'border-[#BDC6E3]/70 text-[#64708F] hover:bg-[#EEF3FD]/40'
                  }`}
                >
                  角色 B (队员)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('host')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all text-center ${
                    selectedRole === 'host'
                      ? 'border-[#545E79] bg-[#EEF3FD] text-[#2C3345] font-bold shadow-xs'
                      : 'border-[#BDC6E3]/70 text-[#64708F] hover:bg-[#EEF3FD]/40'
                  }`}
                >
                  角色 A (房主多端)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2C3345] mb-1.5">
                你的昵称
              </label>
              <input
                type="text"
                placeholder="例如：Player 2"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={16}
                className="w-full px-3.5 py-2 rounded-xl border border-[#BDC6E3] focus:outline-none focus:ring-2 focus:ring-[#545E79] text-xs bg-[#F7FAFE] text-[#2C3345]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2C3345] mb-1.5 flex items-center justify-between">
                <span>身份密钥 PIN</span>
                <span className="text-[10px] text-[#64708F] font-mono">未改动请留 0000</span>
              </label>
              <input
                type="text"
                placeholder="4 位数字 PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#BDC6E3] focus:outline-none focus:ring-2 focus:ring-[#545E79] text-xs bg-[#F7FAFE] text-[#2C3345] font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || inputCode.length !== 4}
              className="w-full py-3 rounded-xl bg-[#545E79] hover:bg-[#3D465C] disabled:bg-[#CAD4EE] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              {submitting ? '正在验证绑定...' : '确认并登入房间'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* 底部三大功能模块标准规范命名 */}
      <div className="mt-8 grid grid-cols-3 gap-2 text-center">
        <div className="p-3 rounded-xl bg-white border border-[#BDC6E3] shadow-xs">
          <HelpCircle className="w-4 h-4 mx-auto text-[#545E79] mb-1" />
          <p className="text-xs font-bold text-[#2C3345]">GuessWhat</p>
          <p className="text-[10px] text-[#64708F] mt-0.5">20问对决</p>
        </div>
        <div className="p-3 rounded-xl bg-white border border-[#BDC6E3] shadow-xs">
          <Palette className="w-4 h-4 mx-auto text-[#64708F] mb-1" />
          <p className="text-xs font-bold text-[#2C3345]">你画我猜</p>
          <p className="text-[10px] text-[#64708F] mt-0.5">平板触控画板</p>
        </div>
        <div className="p-3 rounded-xl bg-white border border-[#BDC6E3] shadow-xs">
          <Activity className="w-4 h-4 mx-auto text-[#545E79] mb-1" />
          <p className="text-xs font-bold text-[#2C3345]">动态空间</p>
          <p className="text-[10px] text-[#64708F] mt-0.5">实时流式留言</p>
        </div>
      </div>
    </div>
  );
}
