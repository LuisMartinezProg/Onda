@echo off
title Actualizar Onda
cd /d "%~dp0"
chcp 65001 >nul

echo ============================================
echo   ACTUALIZAR ONDA (compilar + abrir)
echo ============================================
echo.

echo [1/5] Cerrando Onda...
taskkill /f /im Onda.exe /t >nul 2>&1
taskkill /f /im electron.exe /t >nul 2>&1
timeout /t 3 /nobreak >nul
echo   OK.
echo.

echo [2/5] Borrando compilacion anterior (dist)...
if exist dist rmdir /s /q dist
echo   OK.
echo.

echo [3/5] Limpiando cache de Electron...
if exist "%APPDATA%\onda\Cache" rmdir /s /q "%APPDATA%\onda\Cache" 2>nul
if exist "%APPDATA%\onda\Code Cache" rmdir /s /q "%APPDATA%\onda\Code Cache" 2>nul
if exist "%APPDATA%\onda\GPUCache" rmdir /s /q "%APPDATA%\onda\GPUCache" 2>nul
if exist "%APPDATA%\Onda\Cache" rmdir /s /q "%APPDATA%\Onda\Cache" 2>nul
if exist "%APPDATA%\Onda\Code Cache" rmdir /s /q "%APPDATA%\Onda\Code Cache" 2>nul
if exist "%APPDATA%\Onda\GPUCache" rmdir /s /q "%APPDATA%\Onda\GPUCache" 2>nul
echo   OK.
echo.

echo [4/5] Compilando Onda (puede tardar 3-7 min)...
echo.
call npm run dist
if errorlevel 1 (
  echo.
  echo ERROR EN LA COMPILACION.
  pause
  exit /b 1
)
echo.

echo [5/5] Abriendo Onda actualizada...
if exist "%~dp0dist\win-unpacked\Onda.exe" (
  start "" "%~dp0dist\win-unpacked\Onda.exe"
) else (
  echo ERROR: No se encontro Onda.exe en dist
  start "" "%~dp0dist"
)

echo.
echo ============================================
echo   LISTO. Onda esta abierta con los cambios.
echo ============================================
echo.
pause