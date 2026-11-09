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
echo  게임을 만드는 중... (10초쯤 걸려요)
call npm.cmd run build
if errorlevel 1 (
  echo  게임을 만들다가 문제가 생겼어요. 위 메시지를 확인해 주세요.
  pause
  exit /b 1
)
echo.
echo  게임 서버를 켰어요. 브라우저가 자동으로 열려요.
echo  온라인 1:1: 같은 와이파이의 친구는 이 컴퓨터 주소:3000 으로 들어올 수 있어요.
echo  끄려면 이 창을 닫으세요.
echo.
start "" cmd /c "timeout /t 2 > nul & start http://localhost:3000"
node server.mjs
pause
