@echo off
chcp 65001 > nul
title 링의 왕
cd /d "%~dp0"
echo.
echo  ===  링의 왕  ===
echo.
where node > nul 2> nul
if errorlevel 1 (
  echo  Node.js가 없어요. https://nodejs.org 에서 설치한 뒤 다시 실행해 주세요.
  pause
  exit /b 1
)
if not exist node_modules (
  echo  처음 실행이라 준비 중이에요... 잠깐만요.
  call npm.cmd install --no-fund --no-audit
)
echo  게임 서버를 켜는 중... 브라우저가 자동으로 열려요.
echo  끄려면 이 창을 닫으세요.
echo.
start "" cmd /c "timeout /t 3 > nul & start http://localhost:5173"
call npm.cmd run dev
pause
