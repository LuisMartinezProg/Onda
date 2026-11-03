@echo off
title Actualizar Onda
cd /d "%~dp0"
chcp 65001 >nul

echo ============================================
echo   ACTUALIZAR ONDA (compilar + abrir)
echo ============================================
echo.

REM 1. Cerrar Onda y Electron
echo [1/4] Cerrando Onda...
taskkill /f /im Onda.exe /t >nul 2>&1
taskkill /f /im electron.exe /t >nul 2>&1
timeout /t 2 /nobreak >nul
echo   OK.
echo.

REM 2. Limpiar caché de Electron (para que no se quede la versión vieja)
echo [2/4] Limpiando caché de Electron...
if exist "%APPDATA%\onda\Cache" rmdir /s /q "%APPDATA%\onda\Cache" 2>nul
if exist "%APPDATA%\onda\Code Cache" rmdir /s /q "%APPDATA%\onda\Code Cache" 2>nul
if exist "%APPDATA%\onda\GPUCache" rmdir /s /q "%APPDATA%\onda\GPUCache" 2>nul
if exist "%APPDATA%\onda\Partitions" rmdir /s /q "%APPDATA%\onda\Partitions" 2>nul
echo   OK.
echo.

REM 3. Compilar el nuevo instalador
echo [3/4] Compilando nueva versión (puede tardar 3-7 min)...
echo.
call npm run dist
if errorlevel 1 (
  echo.
  echo ERROR en la compilación. Revisa los mensajes de arriba.
  pause
  exit /b 1
)
echo.

REM 4. Abrir la versión actualizada
echo [4/4] Abriendo Onda actualizada...
if exist "%~dp0dist\win-unpacked\Onda.exe" (
  start "" "%~dp0dist\win-unpacked\Onda.exe"
) else (
  echo No se encontró Onda.exe. Abre la carpeta dist manualmente.
  start "" "%~dp0dist"
)

echo.
echo ============================================
echo   LISTO. Onda está abierta con los cambios.
echo ============================================
echo.
pause