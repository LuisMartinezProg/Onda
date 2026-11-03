@echo off
title Probar Onda (Rápido)
cd /d "%~dp0"

echo Cerrando Onda...
taskkill /f /im Onda.exe /t >nul 2>&1
taskkill /f /im electron.exe /t >nul 2>&1
timeout /t 1 /nobreak >nul

echo Abriendo Onda en modo desarrollo...
call npm start