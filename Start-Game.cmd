@echo off
cd /d "%~dp0"
echo Rat King - http://localhost:5173/
echo Keep this window open while playing.
call npm run dev
pause
