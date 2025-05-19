@echo off
echo Starting FocusTrack (Simple Mode)...

:: Set environment variable
set NODE_ENV=development

:: Run Electron directly
electron src/main/main-electron-simple.js