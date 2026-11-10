@echo off
chcp 65001 >nul
set "PATH=C:\Program Files\Git\cmd;%PATH%"
cd /d "D:\antigravity\202611"

echo ========================================================
echo   [DUOSPACE] 开始重置并极速推送纯净代码至 GitHub...
echo ========================================================

echo [1/4] 清理旧的本地 .git 历史对象缓存...
if exist ".git" rd /s /q ".git"

echo [2/4] 初始化纯净 main 主分支并绑定远程仓库...
git init -b main
git remote add origin https://github.com/xiaohe962/duo-game-space.git

echo [3/4] 暂存纯净源代码文件...
git add .
echo 当前待提交的文件清单：
git status -s

echo [4/4] 提交并强制推送到 GitHub main 分支...
git commit -m "feat: complete DUOSPACE duo interactive platform (Next.js + Tailwind + Supabase)"
git branch -M main
git push -u -f origin main

echo ========================================================
echo   推送完成！
echo ========================================================
