@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 veya üzeri LTS gerekli: https://nodejs.org/en/download
  echo Kurulumdan sonra bu dosyayı tekrar çalıştırın.
  pause
  exit /b 1
)
node launch.mjs %*
pause
