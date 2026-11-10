@echo off
chcp 65001 >nul
title 双人专属小游戏合集与互动空间 - 开发服务器
cd /d "D:\antigravity\202611"
echo ========================================================
echo   正在启动双人互动空间开发服务器 (Next.js 15)...
echo   访问地址: http://localhost:3000
echo ========================================================
echo.
npm run dev
pause
