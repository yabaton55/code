@echo off
cd /d "%~dp0"

:: .envを確実に作成
(echo DATABASE_URL=file:./prisma/dev.db) > .env
set DATABASE_URL=file:./prisma/dev.db

echo [1/3] DBセットアップ中...
call npx prisma db push --accept-data-loss
if errorlevel 1 (
  echo DBセットアップに失敗しました
  pause
  exit /b 1
)

echo [2/3] Prismaクライアント生成中...
call npx prisma generate

echo [3/3] サーバー起動中...
call npm run dev
pause
