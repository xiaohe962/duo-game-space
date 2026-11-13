'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface CustomColorPickerProps {
  color: string;
  onChange: (hex: string) => void;
  onClose?: () => void;
}

// HSV to RGB conversion
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  s = s / 100;
  v = v / 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  if (c.length !== 6) return { h: 0, s: 100, v: 100 };

  const num = parseInt(c, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) % 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h = Math.round(h * 60);
  }

  return {
    h: (h + 360) % 360,
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

export default function CustomColorPicker({ color, onChange, onClose }: CustomColorPickerProps) {
  const initialHsv = hexToHsv(color);
  const [hue, setHue] = useState<number>(initialHsv.h);
  const [sat, setSat] = useState<number>(initialHsv.s);
  const [val, setVal] = useState<number>(initialHsv.v);

  const satValBoxRef = useRef<HTMLDivElement | null>(null);
  const isDraggingSatVal = useRef<boolean>(false);
  const hueSliderRef = useRef<HTMLDivElement | null>(null);
  const isDraggingHue = useRef<boolean>(false);

  // 同步外部颜色输入
  useEffect(() => {
    const { h, s, v } = hexToHsv(color);
    setHue(h);
    setSat(s);
    setVal(v);
  }, [color]);

  const updateColor = useCallback(
    (h: number, s: number, v: number) => {
      const [r, g, b] = hsvToRgb(h, s, v);
      const hex = rgbToHex(r, g, b);
      onChange(hex);
    },
    [onChange]
  );

  // 饱和度与明度 2D 拖动计算
  const handleSatValPointer = (e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    if (!satValBoxRef.current) return;
    const rect = satValBoxRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const newSat = Math.round(x * 100);
    const newVal = Math.round((1 - y) * 100);

    setSat(newSat);
    setVal(newVal);
    updateColor(hue, newSat, newVal);
  };

  const onSatValDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingSatVal.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    handleSatValPointer(e);
  };

  const onSatValMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSatVal.current) return;
    handleSatValPointer(e);
  };

  const onSatValUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingSatVal.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  // 色相滑动条拖动计算
  const handleHuePointer = (e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newHue = Math.round(x * 360);

    setHue(newHue);
    updateColor(newHue, sat, val);
  };

  const onHueDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingHue.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    handleHuePointer(e);
  };

  const onHueMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingHue.current) return;
    handleHuePointer(e);
  };

  const onHueUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingHue.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const pureHueColor = `hsl(${hue}, 100%, 50%)`;

  return (
    <div
      className="bg-[#2C3345] text-white rounded-2xl p-3.5 shadow-2xl border border-[#BDC6E3]/40 w-[240px] sm:w-[260px] select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 顶部标题与关闭 */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#3D465C]">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
            style={{ backgroundColor: color }}
          />
          <span className="text-[11px] font-mono font-medium text-slate-300 uppercase tracking-wider">
            {color}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#3D465C] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2D 饱和度与明度渐变面板 */}
      <div
        ref={satValBoxRef}
        onPointerDown={onSatValDown}
        onPointerMove={onSatValMove}
        onPointerUp={onSatValUp}
        onPointerCancel={onSatValUp}
        style={{
          backgroundColor: pureHueColor,
          touchAction: 'none',
        }}
        className="relative w-full h-[180px] sm:h-[200px] rounded-xl overflow-hidden cursor-crosshair shadow-inner"
      >
        {/* 水平白到透明渐变 (饱和度 S) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, #ffffff, transparent)',
          }}
        />
        {/* 垂直黑到透明渐变 (明度 V) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, #000000, transparent)',
          }}
        />

        {/* 选色光标圆环 */}
        <div
          className="absolute pointer-events-none w-5 h-5 rounded-full border-2 border-white shadow-[0_0_5px_rgba(0,0,0,0.8)] -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
          style={{
            left: `${sat}%`,
            top: `${100 - val}%`,
          }}
        />
      </div>

      {/* 底部色相彩虹滑动条与数字 */}
      <div className="mt-3.5 flex items-center gap-2">
        <span className="text-xs font-mono font-bold text-slate-400">H</span>

        {/* 彩虹滑动轨道 */}
        <div
          ref={hueSliderRef}
          onPointerDown={onHueDown}
          onPointerMove={onHueMove}
          onPointerUp={onHueUp}
          onPointerCancel={onHueUp}
          style={{
            touchAction: 'none',
            background:
              'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
          }}
          className="relative flex-1 h-3 rounded-full cursor-pointer shadow-inner"
        >
          {/* 滑动滑块 Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_3px_rgba(0,0,0,0.7)] pointer-events-none"
            style={{
              left: `${(hue / 360) * 100}%`,
              backgroundColor: pureHueColor,
            }}
          />
        </div>

        {/* 角度数值显示框 */}
        <div className="w-10 h-6 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center text-[11px] font-mono text-slate-200">
          {Math.round(hue)}
        </div>
      </div>
    </div>
  );
}
