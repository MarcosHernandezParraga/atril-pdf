# Progreso del proyecto

*Actualizado: 1 de noviembre de 2026 — versión 1.0.4 preparada (1.0.3 publicada)*

Este archivo permite retomar el trabajo exactamente donde se dejó. Leyenda: ✅ hecho y probado · 🟡 hecho, falta probar en dispositivo real · ⏳ pendiente.

## Versión 1.0.4: nombre del editor con tildes ✅ (preparada; falta publicarla)

- La cuenta de la Microsoft Store se cambió a «Marcos Hernández Párraga» mientras la 1.0.3 quitaba las tildes del paquete, así que volvían a no coincidir. Ahora todo usa el mismo nombre con tildes: app, cuenta y paquetes (`publisher` en `src/config/identity.json`). Comprobado en el `AppxManifest.xml` del paquete fabricado por GitHub.

## Versión 1.0.3: Microsoft Store ✅ (publicada)

- ✅ Nombre del editor sin tildes en los paquetes (`publisher` en `src/config/identity.json`: AppX `PublisherDisplayName`, firma de Windows, autor del programa de escritorio, mantenedor del `.deb`). La Microsoft Store exige que coincida con la cuenta («Marcos Hernandez Parraga»). La app sigue mostrando «Hecho por Marcos Hernández Párraga».
- ✅ La 1.0.2 se publicó desde GitHub sin cambiar el número de versión (archivos con «1.0.1» y Android con `versionCode` 10001). `release.yml` ahora para todo si la etiqueta no es `v` + la versión de `package.json`.
- Aviso `runFullTrust` de la tienda: normal en apps de escritorio; texto para justificarlo en la guía 04.

## Limpieza tras la 1.0.1 ✅

- Quitadas dependencias que no se usaban: `@pdf-lib/fontkit`, `expo-crypto`, `expo-device`, `fflate` como dependencia directa (la sigue usando el generador de PDF), `better-sqlite3`, `@types/better-sqlite3`, `opentype.js` y el script `glyphs` (apuntaba a un archivo que no existía).
- `desktop/app/icon.png` ya no se guarda en el repositorio: lo copia `scripts/desktop.mjs prepare`.
- Lista de licencias completada con lo que se incluye en la app y no era dependencia directa: `sql.js` (web), `electron` (ordenador) y las librerías del generador de PDF (`culori`, `fflate`, `html-entities`, `node-html-better-parser`, `tslib`).

## Versión 1.0.1: bibliotecas grandes, partituras enormes y compartir ✅ (publicada el 1 de noviembre de 2026)

- ✅ **Compartir** (`src/export/`): PDF con o sin anotaciones. Páginas originales copiadas en vectorial con `@cantoo/pdf-lib` (`embedPage` + matriz igual que pdf.js, también con /Rotate, recorte y giro); lápiz, subrayador (multiplicar, 38 %), pentagramas e imágenes en vectorial/imagen; texto dibujado con las fuentes del sistema (lienzo en web y escritorio, Skia en Android/iOS) para cualquier idioma; PDF protegidos con su contraseña; páginas que no se pueden copiar, como imagen del lector. Sin cambios ni anotaciones → el archivo original tal cual.
  - Entrega: hoja de compartir del sistema (`expo-sharing` en Android/iOS, `navigator.share` en el navegador), «Guardar en el dispositivo» (descarga en web, carpeta elegida en Android) y «Guardar como» en el ordenador.
  - Comprobado: web (descarga y hoja de compartir simulada), ordenador (Electron) y PDF resultante idéntico a lo que muestra el lector (también con recorte). 🟡 Falta probarlo en iPad, iPhone y Android reales.

- ✅ Web: archivos en trozos de 1 MB en IndexedDB (`src/storage/chunkedFiles.ts`). Chrome no admite valores de más de unos 128 MB y Safari en iOS ha tenido fallos al leer Blobs guardados tras reiniciar (WebKit 235687), así que no se usan Blobs. Lo guardado por la 1.0.0 (un solo Uint8Array) se sigue leyendo (comprobado con la 1.0.0 real).
- ✅ Web y escritorio: pdf.js lee por rangos (`PDFDataRangeTransport`) los archivos de más de 4 MB; en escritorio, canal `fs:readRange` (máx. 16 MB por petición). Tamaños de página guardados al importar: abrir no recorre todas las páginas.
- ✅ Un solo worker de pdf.js para todos los documentos; `PageRenderer` mantiene abiertos como mucho 4 documentos (2 para miniaturas) y cierra los demás. Lista con `windowSize` 5.
- ✅ Guardado: `AppState` → guardar al pasar a segundo plano; sql.js guarda al instante si la página está oculta; al cerrar la pestaña o la ventana, el documento editado se conserva en localStorage y se guarda al arrancar (`src/reader/unsavedChanges.ts`).
- ✅ Android: importación desde proveedores `content://` copiada por trozos de 4 MB.

### Pruebas realizadas (1 de noviembre de 2026)

| Prueba | Web (Chromium) | Ordenador (Electron, Linux) |
| --- | --- | --- |
| Importar 151 partituras de golpe | 3,3 s | 2,1 s |
| Importar escaneadas de 128 MB + 384 MB | 8–13 s | 1,4–3 s |
| Abrir la app con 153 partituras | 0,6 s | 1,1 s |
| Escaneada de 384 MB: abrir e ir a la página 300 | 0,5 s (reabrir 1,8 s) | 1,2 s |
| Partitura de director de 300 páginas | 0,9 s | 0,9 s |
| Anotación guardada al cerrar justo después | ✅ | ✅ |
| Memoria con 151 / 302 / 453 partituras | 43 MB (JS) | 346 / 303 / 373 MB (antes 663 / 824 / 925) |
| Biblioteca de la 1.0.0 tras actualizar | ✅ | — |

- 🟡 Pendiente de probar en aparatos reales: iPad (Safari) y Android con una partitura grande y una biblioteca grande. En el servidor no hay emulador de Android ni Safari.

## Versión 1.0.0: la versión base para publicar ✅

- ✅ Número de versión 1.0.0 (Android `versionCode` 10000). Las 0.x fueron de prueba y no se publicaron.
- ✅ Guía única y ordenada para publicar desde cero: `docs/publicar/00-EMPIEZA-AQUI.md`.
- ✅ Textos de «Novedades» de las tiendas para la primera versión (`fastlane/metadata/android/*/changelogs/10000.txt` y guía 12).
- ✅ Repositorio público `MarcosHernandezParraga/atril-pdf` con todo el historial; revisión automática (CI) en verde.
- ✅ **Versión v1.0.0 publicada** (1 de noviembre de 2026): 12 archivos (Windows x64/arm64 y .appx, Mac universal, Linux AppImage/.deb x64/arm64, Android APK/AAB firmados con la clave de Marcos, `SHA256SUMS.txt`). Web publicada en https://marcoshernandezparraga.github.io/atril-pdf/ y comprobada en navegador de ordenador e iPad (funciona sin conexión).
- ✅ A partir de la próxima versión: APK solo para procesadores ARM (la mitad de tamaño) y un instalador de Windows por procesador. La web se publica sola al terminar cada versión (desde `main`, porque el entorno `github-pages` solo admite esa rama).
- ⏳ Tiendas: Microsoft Store, Google Play y App Store (guía 00, etapas 5 a 7).

## Cuarta tanda (versión 0.3.0): idiomas ✅

- ✅ **21 idiomas** (`src/i18n/locales/`): es, en, pt (Brasil), pt-PT, fr, de, it, ca, gl, eu, nl, pl, ro, el, ru, uk, ar, zh-Hans, zh-Hant, ja, ko. Lista única en `src/i18n/languages.ts`.
- ✅ Idioma del dispositivo por defecto (`pickLanguage`: chino simplificado/tradicional según región o escritura, portugués de Brasil/Portugal, valenciano → catalán, idiomas no disponibles → inglés). **Ajustes → Idioma** con cada idioma escrito en su lengua; se guarda y se puede volver a «Como el sistema».
- ✅ Plurales correctos con `intl-pluralrules` (ISC) por si el dispositivo no trae las reglas; test que exige exactamente las formas de cada idioma (CLDR) y los mismos huecos `{{…}}` que el español.
- ✅ Árabe: biblioteca, carpetas, ajustes, «Acerca de» y diálogos de derecha a izquierda (`useDirection.ts`, márgenes de inicio/fin); el lector y la partitura siempre de izquierda a derecha. En Android/iOS el sistema no invierte la app entera (`supportsRTL: false`).
- ✅ Android 13+ e iOS: idiomas declarados para el ajuste «Idioma de la app» del sistema.
- ✅ Probado en navegador con 22 idiomas de dispositivo, cambio desde Ajustes y persistencia; capturas en árabe, japonés, alemán, griego y euskera (pantalla de móvil).
- 🟡 Las traducciones se han hecho con cuidado, pero conviene que una persona nativa (por ejemplo, un músico) revise cada idioma; corregir es tan fácil como editar el archivo del idioma.

## Tercera tanda (versión 0.2.0) ✅

- ✅ **Paso de página** «pasar hoja» rápido y casi imperceptible desde la esquina inferior derecha (180 ms) y **fundido más rápido**.
- ✅ **Arrastrar partituras** desde el inicio hasta una carpeta (mantener pulsado y arrastrar; barra de carpetas siempre visible mientras se arrastra; vibración en el móvil). Probado en navegador; corregido que el navegador iniciaba su propio «arrastrar imagen» y que, al soltar, se abría la partitura.
- ✅ **Ordenar arrastrando** en la carpeta-concierto (además de las flechas). Pantalla de carpeta rehecha para tabletas (sin animaciones de lista, colores explícitos, botón «Iniciar concierto» legible en modo oscuro).
- ✅ **Etiquetas** al pasar el ratón por los iconos; en tableta, manteniendo el dedo.
- ✅ **Zoom**: dos dedos (y un dedo para mover lo ampliado, con inercia), Ctrl + rueda, pellizco del trackpad (también Safari en Mac), Ctrl + / − / 0. Re-renderizado nítido con límite de memoria (16 Mpx). Pasar de página lo restablece. También en modo continuo. Probado con gestos táctiles simulados de dos dedos.
- ✅ **Panel de páginas** desde la derecha: miniaturas numeradas con caché propia (no desplaza las páginas que se leen), reordenar (mantener pulsado y arrastrar, o flechas), duplicar, eliminar (nunca la última), página en blanco, **añadir otro PDF** (se une) e **imagen como página**. Todo con deshacer; el lector va a la página afectada.
- ✅ **Pentagrama** de 5 líneas sin clave (vectorial, nítido a cualquier zoom) e **imagen sobre la página**: herramienta «Mover», marco con esquinas para cambiar tamaño (el pentagrama libre en ancho y alto; la imagen proporcional), duplicar, borrar, «fondo blanco».
- ✅ **Seguridad** (ver `docs/SEGURIDAD.md`): IPC del escritorio solo atiende al marco principal de `app://atril/`; sin DevTools ni `<webview>` en la versión publicada; navegación, redirecciones y ventanas nuevas bloqueadas; enlaces externos solo a github.com; fusibles de Electron (RunAsNode, NODE_OPTIONS e inspección desactivados; solo carga su asar). Comprobado en el programa empaquetado de Linux y en el ejecutable de Windows. Huellas SHA-256 en cada versión. `npm audit`: avisos solo en herramientas de desarrollo.
- ✅ **Icono propio** en el `.exe` de Windows (con nombre, autor y versión) y en Linux.
- ✅ **Versión web instalable** (PWA) para iPhone/iPad y navegadores, publicada en GitHub Pages con su icono, funciona **sin conexión** (service worker), enlaces profundos (404.html), política de contenido estricta y aviso de instalación en Safari. Prueba automática `e2e/pwa-smoke.mjs` (también en la CI).
- ✅ **Guías de publicación** separadas en `docs/publicar/` (GitHub, descargas, web, Microsoft Store, winget, Linux, Android sin Google Play, Google Play, App Store, Apple sin ánimo de lucro, legal, textos de tienda). Textos promocionales, gráfico y capturas de Google Play en `fastlane/`.
- ✅ Android: número de versión (`versionCode`) calculado de la versión (0.2.0 → 200).
- 🟡 Pendiente de probar en tableta real: arrastres, pellizco y la pantalla de carpeta (este entorno no tiene emulador de Android). Si algo no va bien en la tableta, una foto o captura de pantalla ayuda mucho.

## Cambios pedidos por Marcos (segunda tanda) ✅

- ✅ Nombre **Atril PDF** (identificador `com.marcoshernandez.atrilpdf`, repositorio `atril-pdf`), cambiado en `src/config/identity.json`.
- ✅ «Hecho por Marcos Hernández Párraga» bajo el título de la pantalla de inicio (y en «Acerca de»).
- ✅ Diseño tipo Apple/Google manteniendo el tono cálido tipo papel: tarjetas con bordes muy redondeados, sombras suaves, botones píldora, barras translúcidas (cristal).
- ✅ Animaciones 3D: las tarjetas y botones se inclinan hacia el dedo al pulsar, entradas animadas en cascada, y **paso de hoja en 3D** (la página gira sobre su borde izquierdo con sombra). Es el modo por defecto; «Página a página» sin animación sigue disponible.
- ✅ Inicio: arriba **Carpetas · Conciertos** con «Nueva carpeta»; debajo **Todos los documentos** del más reciente al más antiguo (se puede ordenar por nombre o fecha).
- ✅ Carpetas-concierto: obras numeradas 1, 2, 3…, «Ordenar» (subir/bajar), «Añadir obras» (elegir de la biblioteca), «Importar aquí», renombrar, quitar de la carpeta; una obra puede estar en varios conciertos; pulsar una obra la abre sola; **«Iniciar concierto»** las toca seguidas: al pasar la última página se abre la primera de la siguiente obra (y al retroceder, la última de la anterior), sin salir de pantalla completa, con un aviso breve «Siguiente obra».
- ✅ Escribir sobre el PDF (modo **Anotar**): bolígrafo con presión del lápiz, subrayador, borrador, **texto** en cualquier sitio (tamaño, negrita, color), deshacer/rehacer, mostrar/ocultar; botón **«Lápiz y dedo» / «Solo lápiz»** (también en Ajustes, con «Solo dedo» y «Desactivado»). Las anotaciones se guardan como vectores y se ven en todos los modos.
- 🟡 Pendiente de probar en dispositivo real: el lápiz (Apple Pencil, S Pen) y la presión; en el navegador se ha probado con ratón.

## Estado general

- **Fase actual:** 3–5 en curso (fases 0, 1 y 2 terminadas).
- **Pruebas automáticas:** 213 tests unitarios (incluidos 66 de idiomas) (modelo, navegación, zoom, panel de páginas, pentagrama e imágenes, arrastrar, base de datos, seguridad de rutas) en verde; prueba en navegador real (16 recorridos, incluido el cambio de idioma: importar, pasar página con teclas de pedal, anotar, modos, zoom con rueda/teclas/dos dedos, panel de páginas, pentagrama e imagen, conciertos, arrastrar a carpetas y reordenar, ajustes, PDF protegido); prueba de la versión web instalable sin conexión; prueba de escritorio en Electron.
- **Calidad:** `tsc --noEmit` y ESLint sin errores ni avisos.

## Fase 0 — Entorno ✅

- ✅ Proyecto Expo SDK 58 / React Native 0.88 creado con `create-expo-app`, TypeScript estricto.
- ✅ Git con autoría de Marcos Hernández Párraga, sin firmas ni líneas de coautoría. Archivos de configuración local de herramientas de desarrollo excluidos en `.gitignore`.
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
- ✅ Animación «pasar hoja» rápida y suave.
- ✅ Zoom con pellizco / Ctrl+rueda / trackpad / teclado y re-renderizado nítido.
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
- ✅ **Arrastrar documentos encima de una carpeta** (resaltado, vibración). ⏳ Selección múltiple.
- ✅ Repertorios: resueltos con las carpetas-concierto (ver arriba).
- ⏳ «Compartir» desde otras apps en Android (`ACTION_SEND`).

## Fase 7 — Anotaciones 🟡

- ✅ Bolígrafo, subrayador, borrador de trazo completo, texto, deshacer/rehacer, modos de entrada lápiz/dedo, mostrar/ocultar.
- ⏳ Borrador parcial, formas, sellos musicales, lazo de selección, capas.

## Fase 6 — Organización de páginas ✅

- ✅ Panel de miniaturas numeradas, reordenar, duplicar, eliminar, página en blanco, insertar otro PDF e imágenes como página, deshacer.
- ⏳ Selección múltiple de páginas, girar desde el panel, extraer páginas a un documento nuevo.

## Fase 8 — Pentagramas e imágenes ✅

- ✅ Pentagrama de 5 líneas sin clave e imágenes sobre la página, mover y redimensionar.
- ⏳ Pentagramas con clave, varias líneas y sistema de piano (el modelo ya lo admite).

## Fases 9 a 11 ⏳ / 🟡

- ✅ Exportación a PDF con o sin anotaciones (Compartir). ⏳ Imágenes, imprimir, combinar y **copias de seguridad** (`.atril`).
- 🟡 Publicación: todo preparado (`docs/publicar/`); falta que Marcos cree el repositorio y las cuentas.

## Problemas conocidos

- En iOS, el modo noche/sepia usa una capa de mezcla (React Native en iOS no admite el filtro `invert`); pendiente de comprobar en un iPad.
- En el entorno de desarrollo en la nube, Maven Central limita las descargas: para compilar Android allí se usa el espejo de Google (solo afecta a ese entorno).
- El APK de prueba de esta tanda ya se compila **sin permiso de Internet** (`ATRIL_OFFLINE_BUILD=1`), igual que las versiones que publicará GitHub. Está firmado con una clave de prueba: antes de instalar la primera versión oficial firmada con la clave de Marcos hay que desinstalarlo.
- Flathub, F-Droid e IzzyOnDroid tienen requisitos propios sobre el proceso de desarrollo; no se enviará la app allí sin leerlos y cumplirlos con transparencia (ver `docs/publicar/06-linux.md` y `07-android-fuera-de-google-play.md`).
- La prueba automática «pasar página sin indicador de carga» no distingue si la página venía pre-renderizada con PDF sencillos (pdf.js es muy rápido); el pre-renderizado se corrigió por análisis del código y queda pendiente medirlo con partituras escaneadas pesadas.

## Siguiente paso

1. Marcos crea el repositorio en GitHub (`docs/publicar/01-github.md`) → subir el código, comprobar la CI y activar GitHub Pages.
2. Marcos prueba en su tableta Android el APK 0.2.0 (arrastrar a carpetas, ordenar, zoom con dos dedos, panel de páginas, pentagrama) y en Windows el ZIP 0.2.0. Si algo falla, foto o captura.
3. Publicar la versión `v0.2.0` (guía 01, paso 5) y la web.
4. Siguiente desarrollo: copias de seguridad `.atril` y exportación a PDF con anotaciones.
