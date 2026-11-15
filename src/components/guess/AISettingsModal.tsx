'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Sparkles,
  Check,
  ExternalLink,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  getAIConfig,
  saveAIConfig,
  clearAIConfig,
  AIProvider,
} from '@/lib/ai/guessAI';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export default function AISettingsModal({ isOpen, onClose, onConfigSaved }: Props) {
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getAIConfig();
      if (cfg.provider !== 'none') {
        setProvider(cfg.provider);
        setApiKey(cfg.apiKey || '');
        setBaseUrl(cfg.baseUrl || '');
        setModel(cfg.model || '');
      } else {
        setProvider('openai');
        setApiKey('');
        setBaseUrl('https://api.deepseek.com');
        setModel('deepseek-chat');
      }
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProviderChange = (p: AIProvider) => {
    setProvider(p);
    if (p === 'openai') {
      if (!baseUrl || baseUrl.includes('google')) setBaseUrl('https://api.deepseek.com');
      if (!model || model.includes('gemini')) setModel('deepseek-chat');
    } else if (p === 'gemini') {
      setBaseUrl('');
      setModel('gemini-2.5-flash');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      alert('请输入有效的 API Key');
      return;
    }

    saveAIConfig({
      provider,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim() || undefined,
      model: model.trim() || undefined,
    });

    setSavedSuccess(true);
    onConfigSaved?.();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleClear = () => {
    if (window.confirm('确定要清除本地保存的 API Key 吗？')) {
      clearAIConfig();
      setApiKey('');
      setSavedSuccess(false);
      onConfigSaved?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#BDC6E3] overflow-hidden">
        {/* 标题栏 */}
        <div className="p-4 border-b border-[#BDC6E3]/60 flex items-center justify-between bg-[#F5F8FE]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#545E79] text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#D8E2FD]" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#2C3345]">AI 密钥与大模型设置</h3>
              <p className="text-[11px] text-[#64708F]">配置后即可在游戏中启用全部 AI 智能辅助</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200/60 text-[#64708F] hover:text-[#2C3345] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容表单 */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* 服务商选择 */}
          <div>
            <label className="block text-xs font-semibold text-[#2C3345] mb-1.5">
              大模型服务商
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleProviderChange('openai')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  provider === 'openai'
                    ? 'bg-[#EEF3FD] border-[#545E79] text-[#545E79] font-bold shadow-2xs'
                    : 'border-[#BDC6E3] text-[#64708F] hover:bg-slate-50'
                }`}
              >
                <span>DeepSeek / OpenAI</span>
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange('gemini')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  provider === 'gemini'
                    ? 'bg-[#EEF3FD] border-[#545E79] text-[#545E79] font-bold shadow-2xs'
                    : 'border-[#BDC6E3] text-[#64708F] hover:bg-slate-50'
                }`}
              >
                <span>Google Gemini</span>
              </button>
            </div>
          </div>

          {/* API Key 输入框 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#2C3345] flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-[#545E79]" />
                API Key
              </label>
              {provider === 'openai' ? (
                <a
                  href="https://platform.deepseek.com/api_keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#545E79] hover:underline flex items-center gap-0.5"
                >
                  获取 DeepSeek Key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ) : (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#545E79] hover:underline flex items-center gap-0.5"
                >
                  获取 Gemini Key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
            <input
              type="password"
              placeholder={provider === 'openai' ? 'sk-xxxxxxxxxxxxxxxx' : 'AIzaSyxxxxxxxxxxxx'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#BDC6E3] text-xs focus:outline-none focus:ring-2 focus:ring-[#545E79] bg-[#F7FAFE] font-mono text-[#2C3345]"
              required
            />
          </div>

          {/* 高级选项：Base URL 与 Model */}
          <div className="pt-2 border-t border-[#CAD4EE]/40 space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-[#64708F] mb-1">
                API Base URL (可选)
              </label>
              <input
                type="text"
                placeholder={provider === 'openai' ? 'https://api.deepseek.com' : '默认官方端点'}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#BDC6E3] text-xs focus:outline-none focus:ring-1 focus:ring-[#545E79] bg-[#F7FAFE] font-mono text-[#2C3345]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#64708F] mb-1">
                模型名称 (可选)
              </label>
              <input
                type="text"
                placeholder={provider === 'openai' ? 'deepseek-chat' : 'gemini-2.5-flash'}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#BDC6E3] text-xs focus:outline-none focus:ring-1 focus:ring-[#545E79] bg-[#F7FAFE] font-mono text-[#2C3345]"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#64708F] bg-[#EEF3FD]/60 p-2.5 rounded-xl border border-[#BDC6E3]/40">
            <ShieldCheck className="w-4 h-4 text-[#545E79] shrink-0" />
            <span>密钥仅保存在当前设备浏览器本地，绝不上传任何第三方服务器。</span>
          </div>

          {/* 操作按钮 */}
          <div className="pt-2 flex items-center justify-between gap-2">
            {apiKey ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                清除
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#BDC6E3] text-[#545E79] hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#545E79] hover:bg-[#3D465C] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> 已保存
                  </>
                ) : (
                  '保存设置'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
