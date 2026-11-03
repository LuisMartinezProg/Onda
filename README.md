# Onda (versión de escritorio)

Internet se necesita SOLO para preparar el proyecto la primera vez. La app ya instalada funciona 100% sin conexión.

1. Instala Node.js LTS (nodejs.org).
2. En esta carpeta abre una terminal:
   - `npm install`   (descarga Electron y la librería de etiquetas; una sola vez)
   - `npm start`     prueba la app (ya sin internet)
   - `npm run dist`  crea el instalador .exe en `dist` (la primera vez descarga herramientas de empaquetado)
3. En la app: "Añadir carpeta". Onda vigila esas carpetas y agrega o quita canciones sola.
4. Cerrar la ventana la manda a la bandeja y la música sigue sonando. Salir: clic derecho en el icono de la bandeja.

## Estructura del proyecto

- `main.js` / `preload.js`: proceso principal de Electron y puente seguro hacia la interfaz (carpetas, escaneo, etiquetas, letras, traducción, YouTube).
- `index.html`: solo el esqueleto de la pantalla. No lleva estilos ni lógica.
- `css/`: estilos por sección (`base`, `layout`, `library`, `controls`, `nowplaying`, `customize`, `lyrics`, `profiles`, `karaoke-old`, `karaoke`). El orden de carga está en `index.html` y importa.
- `js/`: la lógica, un archivo por sección, cargados en este orden (el orden importa y está en `index.html`):
  `core` (estado y almacenamiento) → `scan` (escaneo en navegador) → `audio` (ecualizador y cadena de audio) → `player` (reproducción, cola, teclas) → `visualizer` → `lists` (filas y agrupación) → `view-list`, `view-groups`, `view-karaoke`, `view-sound`, `view-settings` (una pantalla por archivo) → `render` (dibuja la pantalla activa) → `handlers-v`, `handlers-nav`, `handlers-np` (clics y controles) → `edit` → `banner` → `backgrounds` → `presets` → `lyrics` → `karaoke-core` → `ibar` → `profiles` → `boot` (arranque) → `native` (escaneo real de carpetas y teclas multimedia) → `karaoke` (video, vista previa y controles del karaoke).

Si agregas un archivo nuevo en `css/` o `js/`, el instalador ya lo incluye (`css/*`, `js/*` en `package.json`); solo falta enlazarlo en `index.html`.

