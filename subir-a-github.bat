@echo off
REM Si se abre con doble clic, se relanza en una ventana que NO se cierra sola,
REM asi siempre puedes leer los mensajes aunque algo falle.
if not defined ONDA_VENTANA (
  set "ONDA_VENTANA=1"
  cmd /k call "%~f0"
  exit /b
)
title Subir Onda a GitHub
cd /d "%~dp0"
chcp 65001 >nul

set "REPO=https://github.com/LuisMartinezProg/Onda.git"

echo ============================================
echo   SUBIR ONDA A GITHUB
echo   Sube tus cambios y GitHub compila el instalador
echo ============================================
echo.

REM --- Esta carpeta debe ser la de Onda ---
if not exist "main.js" (
  echo ABORTADO: no veo main.js aqui.
  echo Pon este archivo dentro de la carpeta onda-app, junto a main.js.
  pause
  exit /b 1
)

REM --- Acomodar los archivos descargados en su lugar ---
if exist "gitignore.txt" (
  if not exist ".gitignore" ren "gitignore.txt" ".gitignore"
)
if exist "onda-windows.yml" (
  if not exist ".github\workflows" mkdir ".github\workflows"
  move /y "onda-windows.yml" ".github\workflows\onda-windows.yml" >nul
)

REM --- Sin estos dos archivos NO se sube nada, para no subir carpetas gigantes ---
if not exist ".gitignore" (
  echo ABORTADO: falta gitignore.txt. Descargalo y ponlo junto a este archivo.
  pause
  exit /b 1
)
if not exist ".github\workflows\onda-windows.yml" (
  echo ABORTADO: falta onda-windows.yml. Descargalo y ponlo junto a este archivo.
  pause
  exit /b 1
)
echo   OK - Archivos de configuracion en su lugar.
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo ABORTADO: no encuentro Git. Instalalo desde https://git-scm.com y vuelve a intentar.
  pause
  exit /b 1
)

if not exist ".git" (
  echo Preparando el repositorio, solo la primera vez...
  git init
  git branch -M main
)

git remote get-url origin >nul 2>nul
if errorlevel 1 git remote add origin %REPO%

git config user.email >nul 2>nul
if errorlevel 1 (
  git config user.name "Luis Martinez"
  git config user.email "LuisMartinezProg@users.noreply.github.com"
)

echo.
echo Agregando archivos...
git add .
git commit -m "Actualizacion %date% %time%"

echo.
echo Trayendo lo que ya haya en GitHub para no pisarlo...
git pull origin main --allow-unrelated-histories --no-edit -X ours >nul 2>&1

echo.
echo Subiendo a GitHub, si se abre una ventana para iniciar sesion, aceptala...
git push -u origin main
if errorlevel 1 (
  echo.
  echo ============================================
  echo   NO SE PUDO SUBIR
  echo   Causas comunes: el repositorio Onda no existe en GitHub, o no iniciaste sesion.
  echo ============================================
  pause
  exit /b 1
)

echo.
echo ============================================
echo   LISTO. Subido a GitHub.
echo   En unos minutos GitHub termina de compilar.
echo ============================================
start "" "https://github.com/LuisMartinezProg/Onda/actions"
echo.
echo Presiona una tecla para cerrar esta ventana.
pause >nul
exit
