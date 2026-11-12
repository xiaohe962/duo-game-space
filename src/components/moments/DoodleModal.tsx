'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, Trash2, Check, Eraser, Palette } from 'lucide-react';
import CustomColorPicker from '@/components/draw/CustomColorPicker';

interface DoodleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDoodle: (dataUrl: string) => void;
}

// 统一标准 11 种高频预制颜色，第 12 格为自选调色器
const PRESET_COLORS = [
  '#0f172a', // 曜石黑
  '#64748b', // 冷石灰
  '#ffffff', // 纯白
  '#ef4444', // 鲜红
  '#f97316', // 暖橙
  '#eab308', // 明黄
  '#10b981', // 翡翠绿
  '#06b6d4', // 湖水青
  '#2563eb', // 皇家蓝
  '#8b5cf6', // 梦幻紫
  '#ec4899', // 玫瑰粉
];

export default function DoodleModal({ isOpen, onClose, onSaveDoodle }: DoodleModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState<string>('#0f172a');
  const [customColor, setCustomColor] = useState<string>('#8b5cf6');
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);
  const [size, setSize] = useState<number>(6);
  const [isEraser, setIsEraser] = useState<boolean>(false);

  const isDrawing = useRef<boolean>(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);

  // 校准画板分辨率并填充纯白背景
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
      historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(initCanvas, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initCanvas]);

  if (!isOpen) return null;

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (historyRef.current.length > 25) historyRef.current.shift();
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      if (typeof canvas.setPointerCapture === 'function') canvas.setPointerCapture(e.pointerId);
    } catch (_) {}

    const rect = canvas.getBoundingClientRect();
    isDrawing.current = true;
    lastPoint.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPoint.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    const currentPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const currentColor = isEraser ? '#ffffff' : color;
    const currentSize = isEraser ? size * 2.5 : size;

    // 二次贝塞尔曲线平滑滤波
    const midPoint = {
      x: (lastPoint.current.x + currentPoint.x) / 2,
      y: (lastPoint.current.y + currentPoint.y) / 2,
    };

    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, midPoint.x, midPoint.y);
    ctx.stroke();

    lastPoint.current = midPoint;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing.current) {
      // 若单点击落笔未移动，绘制圆点
      if (lastPoint.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const currentColor = isEraser ? '#ffffff' : color;
          const currentSize = isEraser ? size * 2.5 : size;
          ctx.fillStyle = currentColor;
          ctx.beginPath();
          ctx.arc(lastPoint.current.x, lastPoint.current.y, currentSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      isDrawing.current = false;
      lastPoint.current = null;
      saveState();
      try {
        if (typeof canvasRef.current?.releasePointerCapture === 'function') {
          canvasRef.current.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
    }
  };

  // 撤销上一笔（按完整操作回退）
  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length <= 1) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    historyRef.current.pop();
    const prev = historyRef.current[historyRef.current.length - 1];
    if (prev) {
      ctx.putImageData(prev, 0, 0);
    }
  };

  // 清空画板
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    saveState();
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const maxWidth = 540;
      const exportWidth = Math.min(maxWidth, canvas.width);
      const exportHeight = Math.round((canvas.height * exportWidth) / canvas.width);
      const offscreen = document.createElement('canvas');
      offscreen.width = exportWidth;
      offscreen.height = exportHeight;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, exportWidth, exportHeight);
        ctx.drawImage(canvas, 0, 0, exportWidth, exportHeight);
        const dataUrl = offscreen.toDataURL('image/jpeg', 0.68);
        onSaveDoodle(dataUrl);
      } else {
        onSaveDoodle(canvas.toDataURL('image/jpeg', 0.68));
      }
    } catch (_) {
      onSaveDoodle(canvas.toDataURL('image/jpeg', 0.65));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* 顶部标题栏 */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-slate-900 block">即兴手绘涂鸦</span>
              <span className="text-[10px] text-slate-400">支持 11 预设色、自选 HSV 色板与无级粗细</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 画布区域 */}
        <div
          className="p-3 bg-slate-100 flex justify-center"
          style={{ touchAction: 'none', overscrollBehavior: 'none' }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full h-[280px] sm:h-[320px] bg-white rounded-xl shadow-inner border border-slate-200 cursor-crosshair"
            style={{ touchAction: 'none' }}
          />
        </div>

        {/* 工具栏 */}
        <div className="p-3 border-t border-slate-100 space-y-2.5 bg-white relative">
          {/* 第一排：11 色预设 + 第 12 格自选色 + 笔刷粗细无级滑动条 */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* 色盘：11 预设色 + 1 自选色 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setIsEraser(false);
                  }}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-md border transition-transform ${
                    color === c && !isEraser
                      ? 'scale-125 ring-2 ring-slate-900 shadow-sm border-white'
                      : 'border-slate-200 hover:scale-110'
                  }`}
                  title={c}
                />
              ))}

              {/* 第 12 格：自选色 */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCustomPicker(!showCustomPicker)}
                  style={{ backgroundColor: customColor }}
                  title="第12格：自定义HSV色彩"
                  className={`relative w-5 h-5 rounded-md border transition-transform flex items-center justify-center ${
                    color === customColor && !isEraser
                      ? 'scale-125 ring-2 ring-blue-500 shadow-sm border-white'
                      : 'border-slate-200 hover:scale-110'
                  }`}
                >
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gradient-to-tr from-pink-500 via-amber-400 to-cyan-400 border border-white shadow-xs" />
                </button>

                {showCustomPicker && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs animate-fade-in">
                    <div
                      className="fixed inset-0"
                      onClick={() => setShowCustomPicker(false)}
                    />
                    <div className="relative z-10 shadow-2xl max-w-[95vw] max-h-[90vh]">
                      <CustomColorPicker
                        color={customColor}
                        onChange={(newHex) => {
                          setCustomColor(newHex);
                          setColor(newHex);
                          setIsEraser(false);
                        }}
                        onClose={() => setShowCustomPicker(false)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 撤销与清空：位于笔画粗细左侧 */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleUndo}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs flex items-center gap-1 transition-all active:scale-95"
                title="撤销上一笔"
              >
                <RotateCcw className="w-3 h-3" />
                <span>撤销</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs flex items-center gap-1 transition-all"
                title="清空画板"
              >
                <Trash2 className="w-3 h-3" />
                <span>清空</span>
              </button>
            </div>

            {/* 粗细自由滑动调节与实时预览圆点 */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              {/* 实时预览圆点 */}
              <div
                className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0"
                title={`当前笔刷大小: ${size}px`}
              >
                <div
                  style={{
                    width: Math.min(16, Math.max(2, size)),
                    height: Math.min(16, Math.max(2, size)),
                    backgroundColor: isEraser ? '#94a3b8' : color,
                  }}
                  className="rounded-full shadow-xs transition-all"
                />
              </div>

              {/* 自由无级滑动条 (1~40px) */}
              <div className="flex items-center gap-1">
                <input
                  type="range"
                  min={1}
                  max={40}
                  step={1}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-14 sm:w-20 accent-slate-900 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  title={`调整笔刷粗细: ${size}px`}
                />
                <span className="text-[10px] font-mono font-bold text-slate-700 w-6 text-right">
                  {size}px
                </span>
              </div>

              {/* 橡皮擦 */}
              <button
                type="button"
                onClick={() => setIsEraser(!isEraser)}
                className={`p-1 rounded-md border text-xs transition-all flex items-center gap-1 ${
                  isEraser
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="橡皮擦"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 第二排：确认插入动态 */}
          <div className="flex items-center justify-end pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>确定并插入动态</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
