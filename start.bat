@echo off
cd /d "%~dp0"
echo DATABASE_URL="file:./dev.db"> .env
echo [1/3] DBセットアップ中...
call npx prisma migrate dev --name init
echo [2/3] Prismaクライアント生成中...
call npx prisma generate
echo [3/3] サーバー起動中...
call npm run dev
pause
