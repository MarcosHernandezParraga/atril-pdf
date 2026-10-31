# Atril PDF

**Lector de partituras PDF libre y gratuito para músicos.** También sirve para leer libros y documentos.
Sin anuncios, sin cuentas, sin suscripciones, sin compras dentro de la app, sin recogida de datos y funciona 100 % sin internet.

Desarrollada por **Marcos Hernández Párraga** · Licencia [MIT](LICENSE)

> *Aplicación libre y gratuita creada para ayudar al estudiantado, al profesorado y a todos los músicos.*

[English version below](#english)

## Funciones

- **Biblioteca**: importar PDF e imágenes, documentos del más reciente al más antiguo, favoritos, búsqueda, papelera recuperable 30 días. Todo PDF abierto desde otra aplicación («Abrir con…») se añade solo a la biblioteca.
- **Carpetas · Conciertos**: cada carpeta es un concierto con sus obras numeradas y ordenables; «Iniciar concierto» las toca todas seguidas (al pasar la última página de una obra se abre la siguiente).
- **Escribir sobre el PDF**: bolígrafo sensible a la presión, subrayador, borrador y texto; modo «Solo lápiz» para que el dedo y la palma no dibujen.
- **Lector** con 6 modos: página a página (sin animación o con deslizar/fundido), **media página** (estilo atril o desplazamiento, con corte inteligente entre sistemas), **dos páginas** (avance de 1 en 1 o de 2 en 2, portada sola), **vertical con anticipación** (se ve el primer sistema de la página siguiente) y **vertical continuo** (avance de una pantalla menos un solapamiento).
- **Pedal Bluetooth y teclado**: funciona sin configurar (flechas, Av Pág/Re Pág, espacio, Intro, pista siguiente/anterior), modo aprender, prueba de teclas en vivo, anti-rebote y botones de volumen en Android.
- **Modo actuación**: pantalla completa total, la pantalla no se apaga, salida con gesto deliberado.
- Modo noche, sepia, recorte automático de márgenes, girar páginas, deshacer/rehacer, recordar la última página y el modo de cada documento.
- Español e inglés, tema claro/oscuro.

Funciones en desarrollo: panel de miniaturas y organización de páginas, formas y sellos musicales, pentagramas, exportación y copias de seguridad. Consulta [docs/PROGRESO.md](docs/PROGRESO.md).

## Plataformas

| Plataforma | Cómo se instala |
| --- | --- |
| Android | APK desde [GitHub Releases](../../releases) (más adelante, Google Play y F-Droid/IzzyOnDroid) |
| Windows | Instalador `.exe` desde GitHub Releases (más adelante, Microsoft Store y winget) |
| macOS | `.dmg` desde GitHub Releases |
| Linux | AppImage o `.deb` desde GitHub Releases (más adelante, Flathub) |
| iPhone / iPad | App Store (requiere cuenta de desarrollador de Apple) |

### macOS: abrir la app sin firmar

Mientras la app no esté firmada con una cuenta de Apple de pago, macOS avisará la primera vez. Para abrirla:
1. Intenta abrir **Atril PDF** (aparecerá un aviso; pulsa **Aceptar**).
2. Abre **Ajustes del Sistema → Privacidad y seguridad**.
3. Baja hasta el mensaje sobre Atril PDF y pulsa **Abrir igualmente**.

## Compilar desde el código

Requisitos: Node.js LTS (22 o superior) y Git. Instrucciones detalladas en [docs/INSTALACION.md](docs/INSTALACION.md).

```bash
npm install
npm test                 # tests
npm run web              # versión web de desarrollo
npm run desktop:start    # versión de escritorio (Electron)
npm run android          # Android (requiere Android Studio / SDK)
npm run desktop:dist     # instaladores de escritorio
```

Tecnología: React Native + Expo (SDK 58), TypeScript, Expo Router, SQLite + Drizzle, pdf.js (escritorio), PDFKit / PdfRenderer (móvil, módulo nativo propio), Electron (escritorio). Arquitectura en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md). Licencias de terceros en [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md). Privacidad: [docs/PRIVACIDAD.md](docs/PRIVACIDAD.md).

---

<a id="english"></a>

# Atril PDF (English)

**Free and open-source PDF sheet music reader for musicians**, also great for books and documents.
No ads, no accounts, no subscriptions, no in-app purchases, no data collection, works 100% offline.

Developed by **Marcos Hernández Párraga** · [MIT License](LICENSE)

## Features

- **Library**: import PDFs and images, recent documents, nested folders, favourites, search, sorting, 30-day trash. Any PDF opened from another app ("Open with…") is added to the library automatically.
- **Reader** with 6 modes: page by page (no animation, or slide/fade), **half-page turns** (music-stand or scroll style, splitting between systems), **two pages** (advance by one or by two, cover alone), **vertical with look-ahead** (the first system of the next page is visible) and **vertical continuous** (advances one screen minus an overlap).
- **Bluetooth pedal and keyboard**: works out of the box, learn mode, live key test, anti-bounce, Android volume buttons.
- **Performance mode**: true full screen, the screen never sleeps, deliberate exit gesture.
- Night and sepia modes, automatic margin crop, page rotation, undo/redo, remembers the last page and mode of each document.
- Spanish and English, light/dark theme.

Work in progress: thumbnail panel and page organisation, annotations, staves, export, set lists and backups. See [docs/PROGRESO.md](docs/PROGRESO.md).

## Building

Requirements: Node.js LTS (22+) and Git. See the commands above and [docs/INSTALACION.md](docs/INSTALACION.md).
