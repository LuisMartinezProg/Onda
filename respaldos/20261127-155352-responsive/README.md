# Onda (versión de escritorio)

Reproductor de música local. Internet se necesita para preparar el proyecto la primera vez y para descargas, letras, traducción y portadas. La música que ya tienes en tu equipo suena sin conexión.

## Preparar y probar

1. Instala Node.js LTS (nodejs.org).
2. En esta carpeta abre una terminal:
   - `npm install` (una sola vez)
   - `npm start` prueba la app
   - `npm run dist` crea el instalador en `dist` (`Onda-Instalador.exe`)
   - o ejecuta `actualizar-onda.bat`, que compila y abre la app
3. En la app: "Añadir carpeta". Onda vigila esas carpetas y agrega o quita canciones sola.
4. Cerrar la ventana la manda a la bandeja y la música sigue sonando. Salir: clic derecho en el icono de la bandeja.

## Instalar encima de la anterior

Es la misma app: no hay que desinstalar. Antes de ejecutar `Onda-Instalador.exe`, sal de Onda desde la bandeja (clic derecho, Salir). Tu biblioteca, favoritas y ajustes no se borran.

## Estructura

- `arranque.js` (punto de entrada), `updater.js` (actualizaciones), `main.js` y `preload.js` (proceso principal de Electron y puente seguro hacia la interfaz).
- `index.html`: solo el esqueleto. Incluye el bloque `#splash` (pantalla de arranque dorada).
- `css/`, en este orden (el orden importa): base, layout, library, controls, nowplaying, customize, karaoke-lyrics, lyrics, profiles, karaoke, karaoke-nuevo, descargas-nuevo, sonido-nuevo, downloads, videos, diseno, ajustes-fase9, splash.
- `js/`, en este orden (el orden importa): core, audio, modos, player, visualizer, lists, view-list, view-groups, view-karaoke, view-sound, view-settings, render, handlers-v, handlers-nav, handlers-np, edit, banner, backgrounds, presets, lyrics, karaoke-core, ibar, profiles, boot, native, preview, view-downloads, view-videos, delete, diseno, icons, canciones, limpieza, onda-fase9, splash.

Si agregas un archivo nuevo en `css/` o `js/`, el instalador ya lo incluye (`css/*`, `js/*` en `package.json`); solo falta enlazarlo en `index.html`.