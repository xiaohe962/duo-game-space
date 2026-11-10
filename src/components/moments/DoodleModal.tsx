'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, Trash2, Check, Eraser, Palette } from 'lucide-react';

interface DoodleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDoodle: (dataUrl: string) => void;
}

const DOODLE_COLORS = [
  '#0f172a', // 深黑
  '#ef4444', // 鲜红
  '#f97316', // 暖橙
  '#eab308', // 金黄
  '#10b981', // 翡翠绿
  '#2563eb', // 皇家蓝
  '#ec4899', // 玫瑰粉
  '#8b5cf6', // 浅紫
  '#ffffff', // 纯白
];

const BRUSH_SIZES = [2, 6, 12];

export default function DoodleModal({ isOpen, onClose, onSaveDoodle }: DoodleModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState('#0f172a');
  const [size, setSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);

  // 校准画板分辨率并填充纯白背景
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

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
    if (historyRef.current.length > 15) historyRef.current.shift();
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

    ctx.beginPath();
    ctx.strokeStyle = isEraser ? '#ffffff' : color;
    ctx.lineWidth = isEraser ? size * 2.5 : size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPoint.current = currentPoint;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing.current) {
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

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length <= 1) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    historyRef.current.pop(); // 弹出当前
    const prev = historyRef.current[historyRef.current.length - 1];
    if (prev) {
      ctx.putImageData(prev, 0, 0);
    }
  };

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
    const dataUrl = canvas.toDataURL('image/png', 0.9);
    onSaveDoodle(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* 顶部标题栏 */}
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-slate-900">即兴涂鸦便签</span>
          </div>
          <button
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
            className="w-full h-[260px] sm:h-[300px] bg-white rounded-xl shadow-inner border border-slate-200 cursor-crosshair"
            style={{ touchAction: 'none' }}
          />
        </div>

        {/* 工具栏 */}
        <div className="p-3 border-t border-slate-100 space-y-2.5 bg-white">
          {/* 颜色与橡皮擦 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {DOODLE_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setIsEraser(false);
                  }}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-md border transition-transform ${
                    color === c && !isEraser
                      ? 'scale-125 ring-2 ring-slate-900 shadow-sm border-white'
                      : 'border-slate-200 hover:scale-110'
                  }`}
                />
              ))}

              <button
                type="button"
                onClick={() => setIsEraser(!isEraser)}
                className={`p-1.5 rounded-lg border text-xs transition-all flex items-center gap-1 ${
                  isEraser
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="橡皮擦"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 粗细选择 */}
            <div className="flex items-center gap-1 shrink-0 bg-slate-50 p-1 rounded-lg border border-slate-200">
              {BRUSH_SIZES.map((sz) => (
                <button
                  type="button"
                  key={sz}
                  onClick={() => setSize(sz)}
                  className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                    size === sz ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>

          {/* 底部撤销、清空与确认按钮 */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleUndo}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>撤销</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>清空</span>
              </button>
            </div>

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
