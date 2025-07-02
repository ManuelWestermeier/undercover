@echo off

setlocal enabledelayedexpansion

:a

:: Start all nodes in new windows and store their PIDs
echo Starting nodes...

start "Node 1" cmd /c "set PORT=8080 && node ." 
start "Node 2" cmd /c "set PORT=8081 && node . ws://127.0.0.1:8080"
start "Node 3" cmd /c "set PORT=8082 && node . ws://127.0.0.1:8080"
start "Node 4" cmd /c "set PORT=8083 && node . ws://127.0.0.1:8080 ws://127.0.0.1:8081 ws://127.0.0.1:8082"

:: Wait until user presses any key to exit
echo.
echo Press any key to terminate all nodes...

pause

:: Kill all node.exe processes started by this script
echo Killing all node processes...
taskkill /F /IM node.exe /T

cls

echo Wanna Exit...

pause

goto a