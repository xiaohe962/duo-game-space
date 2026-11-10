@echo off
setlocal
set "PATH=C:\Program Files\Git\cmd;%PATH%"
cd /d "%~dp0"

echo ========================================================
echo   [DUOSPACE] Syncing local changes to GitHub & Netlify
echo ========================================================

echo [1/3] Staging modified files...
git add .
git status -s

set "MSG=%~1"
if "%MSG%"=="" set "MSG=chore: update content and auto-sync"

echo [2/3] Committing changes: "%MSG%"
git commit -m "%MSG%"

echo [3/3] Pushing to GitHub main branch...
git push origin main
if %ERRORLEVEL% equ 0 (
    echo ========================================================
    echo  [OK] Online code synced! Netlify is auto-deploying.
    echo  Site URL: https://nimble-horse-be2b07.netlify.app
    echo ========================================================
) else (
    echo [ERROR] Git push failed. Please check network or permissions.
)
endlocal
