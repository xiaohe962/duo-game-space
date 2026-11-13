import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/context/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        palette: {
          50: '#F5F8FE',
          100: '#D8E2FD', // 调色盘顶部淡冰蓝紫
          200: '#CAD4EE',
          300: '#BDC6E3', // 调色盘右下丁香暮蓝
          400: '#9BA8C8',
          500: '#7B8AA9',
          600: '#64708F',
          700: '#545E79', // 调色盘左下沉稳烟青
          800: '#3D465C',
          900: '#2C3345', // 顶栏与深色容器
          950: '#1D2230',
        },
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0b1d3a',
        },
        slate: {
          850: '#151e2e',
          950: '#080d1a',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
