@echo off
chcp 65001 >nul
title 循途 - 前端 H5
cd /d %~dp0
echo [循途] 正在启动前端 H5 (localhost:8080)...
call npm run dev:h5
pause
