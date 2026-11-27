@echo off
setlocal enabledelayedexpansion
title Compilar instalador de Onda (protegido)
cd /d "%~dp0"
chcp 65001 >nul

REM ==========================================
REM GUARDIA DE SEGURIDAD
REM ==========================================
set "ERROR_LEVEL=0"
set "LOG_FILE=%~dp0compilacion.log"

echo ============================================ > "%LOG_FILE%"
echo Compilacion iniciada: %date% %time% >> "%LOG_FILE%"
echo ============================================ >> "%LOG_FILE%"

echo ============================================
echo   Compilar instalador de Onda (PROTEGIDO)
echo ============================================
echo.

REM --- Verificar archivos esenciales ---
echo [GUARDIA] Verificando archivos esenciales...
set "MISSING=0"
if not exist index.html ( echo ERROR: Falta index.html & set MISSING=1 )
if not exist package.json ( echo ERROR: Falta package.json & set MISSING=1 )
if not exist main.js ( echo ERROR: Falta main.js & set MISSING=1 )
if not exist preload.js ( echo ERROR: Falta preload.js & set MISSING=1 )
if not exist js\boot.js ( echo ERROR: Falta js\boot.js & set MISSING=1 )

if "!MISSING!"=="1" (
  echo.
  echo ============================================
  echo   ABORTADO: Faltan archivos esenciales
  echo   La app NO se puede compilar asi.
  echo ============================================
  echo ERROR: Faltan archivos esenciales >> "%LOG_FILE%"
  pause
  exit /b 1
)
echo   OK - Todos los archivos esenciales presentes.
echo.

REM --- Validar sintaxis de main.js ---
echo [GUARDIA] Verificando sintaxis de main.js...
node --check main.js >nul 2>&1
if errorlevel 1 (
  echo.
  echo ============================================
  echo   ABORTADO: main.js tiene errores de sintaxis
  echo   Abre el archivo y revisa el error.
  echo ============================================
  echo ERROR: main.js con errores de sintaxis >> "%LOG_FILE%"
  node --check main.js
  pause
  exit /b 1
)
echo   OK - main.js es sintacticamente valido.
echo.

REM --- Validar sintaxis de preload.js ---
node --check preload.js >nul 2>&1
if errorlevel 1 (
  echo.
  echo ============================================
  echo   ABORTADO: preload.js tiene errores de sintaxis
  echo ============================================
  echo ERROR: preload.js con errores de sintaxis >> "%LOG_FILE%"
  pause
  exit /b 1
)
echo   OK - preload.js es sintacticamente valido.
echo.

REM --- Verificar package.json valido ---
echo [GUARDIA] Verificando package.json...
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))" >nul 2>&1
if errorlevel 1 (
  echo.
  echo ============================================
  echo   ABORTADO: package.json esta corrupto
  echo ============================================
  echo ERROR: package.json corrupto >> "%LOG_FILE%"
  pause
  exit /b 1
)
echo   OK - package.json valido.
echo.

REM --- Instalar dependencias si faltan ---
if not exist node_modules (
  echo [0/6] Instalando dependencias (primera vez)...
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install fallo
    echo ERROR: npm install fallo >> "%LOG_FILE%"
    pause
    exit /b 1
  )
  echo.
)

REM --- Leer version ---
for /f "tokens=2 delims=:," %%A in ('findstr /C:"\"version\"" package.json') do (
  set "VERSION=%%A"
  goto :version_found
)
:version_found
set "VERSION=%VERSION: =%"
set "VERSION=%VERSION:"=%"
echo Version detectada: %VERSION%
echo.

REM ==========================================
REM COMPILACION
REM ==========================================
echo [1/6] Cerrando Onda si esta abierta...
taskkill /f /im Onda.exe /t >nul 2>&1
taskkill /f /im electron.exe /t >nul 2>&1
timeout /t 2 /nobreak >nul
echo.

echo [2/6] Borrando dist anterior...
if exist dist rmdir /s /q dist
echo.

echo [3/6] Verificando recursos (vendor)...
if not exist vendor\yt-dlp.exe (
  echo AVISO: Falta vendor\yt-dlp.exe - las descargas no funcionaran
)
if not exist vendor\ffmpeg.exe (
  echo AVISO: Falta vendor\ffmpeg.exe
)
echo.

echo [4/6] Compilando instalador (puede tardar 3-7 min)...
echo.
call npm run dist
if errorlevel 1 (
  echo.
  echo ============================================
  echo   ERROR EN LA COMPILACION
  echo   Revisa los mensajes de arriba
  echo ============================================
  echo ERROR: Compilacion fallo >> "%LOG_FILE%"
  pause
  exit /b 1
)
echo Compilacion terminada: %date% %time% >> "%LOG_FILE%"
echo.

echo [5/6] Verificando resultado...
set "SETUP="
for %%F in ("dist\Onda Setup*.exe") do (
  echo    Encontrado: %%F
  set "SETUP=%%~fF"
)
if not defined SETUP (
  for %%F in (dist\Onda*.exe) do (
    echo    Encontrado: %%F
    set "SETUP=%%~fF"
  )
)
if not defined SETUP (
  echo ERROR: No se genero ningun instalador en dist\
  echo ERROR: No se genero instalador >> "%LOG_FILE%"
  pause
  exit /b 1
)
echo.

echo [6/6] Copiando instalador al Escritorio...
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $carpeta = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Onda-Instalador'; New-Item -ItemType Directory -Force -Path $carpeta | Out-Null; Copy-Item -LiteralPath '%SETUP%' -Destination (Join-Path $carpeta 'Onda-Setup.exe') -Force; Write-Host ('   Copiado a: ' + $carpeta + '\Onda-Setup.exe'); Start-Process $carpeta"
if errorlevel 1 (
  echo AVISO: No pude copiar al Escritorio. El instalador esta en la carpeta dist.
  echo AVISO: Fallo la copia al Escritorio >> "%LOG_FILE%"
  start "" "%~dp0dist"
)

echo.
echo ============================================
echo   LISTO.
echo   Instalador: Onda Setup %VERSION%.exe
echo   Copia para compartir: Escritorio\Onda-Instalador\Onda-Setup.exe
echo ============================================
echo Compilacion exitosa: %date% %time% >> "%LOG_FILE%"
echo.
pause
endlocal