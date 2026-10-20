@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "STUDIO_DATA_DIR=%~dp0"
where node >nul 2>nul
if errorlevel 1 goto node_missing
node launch.mjs %*
set "STUDIO_EXIT_CODE=%errorlevel%"
pause
exit /b %STUDIO_EXIT_CODE%

:node_missing
echo Node.js 24 veya üzeri LTS gerekli: https://nodejs.org/en/download
echo Kurulumdan sonra bu dosyayı tekrar çalıştırın.
pause
exit /b 1
