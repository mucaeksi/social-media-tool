@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 veya üzeri gerekli: https://nodejs.org/en/download
  echo Node.js LTS kurulumundan sonra bu dosyayı tekrar çalıştırın.
  pause
  exit /b 1
)
call npm ci --omit=dev --no-audit --no-fund
if errorlevel 1 (
  echo Kurulum tamamlanamadı. İnternet bağlantısını kontrol edin.
  pause
  exit /b 1
)
node start.mjs
pause
