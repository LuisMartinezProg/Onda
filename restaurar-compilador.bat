@echo off
title Restaurar compilador de Onda
cd /d "%~dp0"
chcp 65001 >nul

echo ============================================
echo   Restaurar compilador de Onda
echo ============================================
echo.

if not exist compilar-instalador.bat.bak (
  echo ERROR: No existe el backup compilar-instalador.bat.bak
  echo No se puede restaurar.
  pause
  exit /b 1
)

echo Se va a restaurar el compilador desde el backup.
echo Tus archivos actuales NO se borraran, solo el .bat sera reemplazado.
echo.
choice /C SN /M "Continuar con la restauracion"
if errorlevel 2 (
  echo Cancelado.
  pause
  exit /b 0
)

REM Hacer backup del actual por si acaso
if exist compilar-instalador.bat (
  copy /Y compilar-instalador.bat compilar-instalador.bat.antes-de-restaurar >nul
  echo   OK - Compilador actual guardado como .antes-de-restaurar
)

REM Restaurar el backup
copy /Y compilar-instalador.bat.bak compilar-instalador.bat >nul
echo   OK - Compilador restaurado.
echo.
echo ============================================
echo   LISTO. El compilador ha sido restaurado.
echo ============================================
echo.
pause