# Progreso del proyecto

*Actualizado: 31 de octubre de 2026*

Este archivo permite retomar el trabajo exactamente donde se dejó. Leyenda: ✅ hecho y probado · 🟡 hecho, falta probar en dispositivo real · ⏳ pendiente.

## Estado general

- **Fase actual:** 3–5 en curso (fases 0, 1 y 2 terminadas).
- **Pruebas automáticas:** 109 tests unitarios, de base de datos y de seguridad de rutas en verde; prueba en navegador real (13 pasos) y prueba de escritorio en Electron en verde.
- **Calidad:** `tsc --noEmit` y ESLint sin errores ni avisos.

## Fase 0 — Entorno ✅

- ✅ Proyecto Expo SDK 58 / React Native 0.88 creado con `create-expo-app`, TypeScript estricto.
- ✅ Git con autoría de Marcos Hernández Párraga, sin firmas ni líneas de coautoría. Archivos del asistente (`CLAUDE.md`, `.claude/`, `AGENTS.md`…) en `.gitignore`.
- ⏳ **Repositorio en GitHub**: lo tiene que crear Marcos (ver `GUIA_PARA_MARCOS.md`, paso 1). Hasta entonces el código solo está en el entorno de desarrollo y en el ZIP de respaldo.

## Fase 1 — Base ✅

- ✅ Identidad de la app en un único sitio: `src/config/identity.json` (nombre, identificador `com.marcoshernandez.atrilpdf`, autor, repositorio). La leen `app.config.ts`, el escritorio y la interfaz.
- ✅ i18n español/inglés con test de claves; tema claro/oscuro/sistema.
- ✅ SQLite + Drizzle con el mismo esquema en todas las plataformas (expo-sqlite, SQLite de Electron, sql.js en navegador, node:sqlite en tests). Migraciones con `PRAGMA user_version`.
- ✅ StorageAdapter (móvil, escritorio, navegador).
- ✅ Electron: protocolo `app://`, CSP estricta, red bloqueada, instancia única, «Abrir con», arrastrar archivos, pantalla completa, pantalla siempre encendida. Probado en Linux con Playwright, tanto en desarrollo como **empaquetado (AppImage de 132 MB)**. Los instaladores de Windows y macOS los genera GitHub Actions (pendiente de la primera ejecución).
- ✅ «Acerca de» con autor, licencia, misión, repositorio y licencias de terceros (`npm run licenses`).
- ✅ LICENSE (MIT), CI de GitHub Actions (tipos, lint, tests, prueba en navegador y en Electron), workflow de publicación por etiquetas.
- ✅ Icono propio (atril con pentagrama) en todos los tamaños, icono adaptativo de Android y splash.

## Fase 2 — Motor PDF y modelo ✅ / 🟡

- ✅ Interfaz `PdfEngine`; motor pdf.js (escritorio/web) con worker local.
- 🟡 Módulo nativo `modules/atril-native`: Android (PdfRenderer, serializado, caché en disco de 300 MB) e iOS (PDFKit). **Android compilado** (APK de prueba de 0.1.0, arm64 y armv7, revisado su manifiesto); falta probarlo en un dispositivo real (este entorno no permite emuladores). **iOS no se ha compilado todavía** (requiere EAS Build o un Mac).
- ✅ Caché LRU en memoria y pre-renderizado de las páginas siguientes y anterior.
- ✅ Modelo no destructivo, comandos (insertar, eliminar, mover, duplicar, girar, recortar, anotaciones) y deshacer/rehacer, con tests.
- ✅ PDF protegidos con contraseña: se pide la contraseña al importarlos (se vuelve a pedir si es incorrecta) y se recuerda en el dispositivo. En Android solo es posible desde Android 15 (limitación de `PdfRenderer`); en versiones anteriores se muestra un mensaje claro.
- ⏳ Caché en disco de páginas en escritorio (ahora solo en memoria).

## Fase 3 — Lector 🟡

- ✅ Modos: página a página (sin animación / deslizar / fundido), media página (estilo atril y desplazamiento) con **corte inteligente entre sistemas**, dos páginas (avance 1 en 1 o 2 en 2, portada sola, automático en horizontal), vertical con anticipación (detección del primer sistema), vertical continuo (pantalla menos solapamiento).
- ✅ Zonas de toque configurables e invertibles, deslizar (desactivable), doble toque central = pantalla completa, rueda del ratón.
- ✅ Modo actuación: pantalla completa total, pantalla siempre encendida, salida con pulsación larga en el borde superior o Esc/F11, pista la primera vez, número de página opcional.
- ✅ Modo noche y sepia; recorte automático de márgenes (no destructivo, con deshacer); girar página; ir a página; volver a donde estaba.
- ✅ Recuerda por documento la última página y el modo.
- ⏳ Animación «pasar hoja» (de momento se usa deslizar).
- ⏳ Zoom con pellizco / doble toque / Ctrl+rueda y re-renderizado nítido.
- ⏳ Ajuste manual del recorte y de la línea de corte/franja arrastrando.
- ⏳ Barra deslizante de páginas, marcadores con nombre, índice del PDF, buscar y copiar texto, brillo.

## Fase 4 — Pedal y teclado 🟡

- ✅ Mapeo por defecto, modo aprender, prueba de teclas en vivo, anti-rebote configurable, teclas de volumen (solo Android), foco robusto. Tests automáticos y prueba en navegador real.
- 🟡 Captura nativa en Android (`dispatchKeyEvent` vía config plugin) e iOS (`pressesBegan` + `UIKeyCommand`): escrita, falta probar con pedal real.
- ✅ Checklist manual en `docs/PRUEBAS_PEDAL.md`.

## Fase 5 — Biblioteca 🟡

- ✅ Inicio con «Abrir / Importar», recientes, todos los documentos (cuadrícula/lista), carpetas anidadas con color, migas de pan, búsqueda, ordenación, favoritos, papelera (30 días) con deshacer, menú contextual (pulsación larga / clic derecho): abrir, renombrar, favorito, mover a…, duplicar, restaurar original, eliminar.
- ✅ Escritorio: arrastrar archivos desde el explorador para importarlos; «Abrir con» probado.
- 🟡 Android «Abrir con» (`ACTION_VIEW`) e iOS (`CFBundleDocumentTypes`) configurados; falta probar en dispositivo.
- ⏳ **Arrastrar documentos encima de una carpeta** (selección múltiple, resaltado, vibración).
- ⏳ Repertorios (listas de concierto) y salto automático a la siguiente obra.
- ⏳ «Compartir» desde otras apps en Android (`ACTION_SEND`).

## Fases 6 a 11 ⏳

Panel de miniaturas y organización de páginas, anotaciones, pentagramas e imágenes, exportación (PDF con/sin anotaciones, imágenes, imprimir, combinar, copia de seguridad), publicación en tiendas y fase 2 opcional.

## Problemas conocidos

- En iOS, el modo noche/sepia usa una capa de mezcla (React Native en iOS no admite el filtro `invert`); pendiente de comprobar en un iPad.
- En el entorno de desarrollo en la nube, Maven Central limita las descargas: para compilar Android allí se usa el espejo de Google (solo afecta a ese entorno).
- El APK de prueba incluye el permiso de Internet (lo añade React Native) aunque no lo usa; las versiones publicadas por GitHub Actions se compilan sin él (`ATRIL_OFFLINE_BUILD=1`).
- La prueba automática «pasar página sin indicador de carga» no distingue si la página venía pre-renderizada con PDF sencillos (pdf.js es muy rápido); el pre-renderizado se corrigió por análisis del código y queda pendiente medirlo con partituras escaneadas pesadas.

## Siguiente paso

1. Marcos crea el repositorio en GitHub → subir el código y comprobar que la CI pasa.
2. Marcos prueba el APK en su Android y el instalador de Windows (lo genera GitHub Actions al crear la etiqueta `v0.1.0`).
3. Continuar con: arrastrar a carpetas y repertorios (fase 5), zoom (fase 3) y panel de miniaturas (fase 6).
