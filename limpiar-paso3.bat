@echo off
title Limpiar archivo del paso 2
cd /d "%~dp0"
if exist js\app.js (
  del /q js\app.js
  echo Borrado js\app.js (ahora esta repartido en varios archivos).
) else (
  echo js\app.js ya no existe. Nada que borrar.
)
echo Listo. Ya puedes borrar este archivo.
pause
