@echo off
title Limpiar archivos del paso 3
cd /d "%~dp0"
if exist js\views.js del /q js\views.js
if exist native.js del /q native.js
echo Borrados los archivos viejos (js\views.js y native.js de la raiz).
echo Listo. Ya puedes borrar este archivo.
pause
