@echo off
setlocal
title Limpiar proyecto Onda
cd /d "%~dp0"
chcp 65001 >nul

echo ============================================
echo   Limpiar proyecto Onda
echo ============================================
echo.

REM 1. Borrar .bak
echo [1/3] Borrando archivos .bak...
set "BAK_COUNT=0"
for /r %%F in (*.bak) do (
  del /q "%%F" 2>nul
  set /a BAK_COUNT+=1
)
for /r %%F in (*.bak-*) do (
  del /q "%%F" 2>nul
  set /a BAK_COUNT+=1
)
echo   OK: %BAK_COUNT% archivos borrados
echo.

REM 2. Borrar dist
echo [2/3] Borrando carpeta dist (instaladores viejos)...
if exist dist (
  rmdir /s /q dist
  echo   OK: dist borrada
) else (
  echo   dist ya estaba vacia
)
echo.

REM 3. Borrar cache de Electron
echo [3/3] Borrando cache de Electron...
if exist "%APPDATA%\onda\Cache" rmdir /s /q "%APPDATA%\onda\Cache" 2>nul
if exist "%APPDATA%\onda\Code Cache" rmdir /s /q "%APPDATA%\onda\Code Cache" 2>nul
if exist "%APPDATA%\onda\GPUCache" rmdir /s /q "%APPDATA%\onda\GPUCache" 2>nul
if exist "%APPDATA%\onda\DawnGraphiteCache" rmdir /s /q "%APPDATA%\onda\DawnGraphiteCache" 2>nul
if exist "%APPDATA%\onda\DawnWebGPUCache" rmdir /s /q "%APPDATA%\onda\DawnWebGPUCache" 2>nul
echo   OK: cache limpiada
echo.

echo ============================================
echo   LIMPIEZA COMPLETADA
echo ============================================
echo.
pause
endlocal