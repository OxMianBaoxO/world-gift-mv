@echo off
rem Double-click: start the local preview server, then open the MV in the default browser.
cd /d "%~dp0"
set "NODE=node"
where node >nul 2>nul || set "NODE=C:\Program Files\nodejs\node.exe"
start "WorldGift-MV-server" /min "%NODE%" tools\serve.mjs 8797
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8797/"
