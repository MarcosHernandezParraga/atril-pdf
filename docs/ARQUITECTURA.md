# Arquitectura

## Una base de código, cinco plataformas

| Plataforma | Cómo se construye |
| --- | --- |
| Android, iOS/iPadOS | Expo / React Native nativo (development build y builds de producción; iOS con EAS Build) |
| Windows, macOS, Linux | Exportación web de Expo (`react-native-web`) dentro de Electron, servida por el protocolo propio `app://atril/` |

## Carpetas

```
src/app/            Pantallas (Expo Router): biblioteca, lector, ajustes, pedal, acerca de
src/core/           Lógica pura y 100 % testeada: modelo de documento, comandos y deshacer,
                    navegación de todos los modos, mapeo de teclas y anti-rebote,
                    zonas de toque, detección de márgenes y sistemas
src/db/             SQLite + Drizzle (mismo esquema en todas las plataformas)
src/storage/        StorageAdapter: archivos de la biblioteca (móvil, escritorio, navegador)
src/pdf/            PdfEngine: nativo (PDFKit/PdfRenderer) y pdf.js; caché y pre-renderizado
src/library/        Biblioteca: repositorio, importación, miniaturas, pantalla de inicio
src/reader/         Lector: vista de página, modos, continuo, análisis de páginas, modo actuación
src/input/          Teclado / pedal (DOM en escritorio, módulo nativo en móvil)
src/settings/       Ajustes (Zustand + SQLite), pantallas de ajustes y «Acerca de»
src/i18n/           Español e inglés
src/ui/, src/theme/ Componentes comunes, diálogos, colores claro/oscuro
modules/atril-native/  Módulo nativo propio (Kotlin + Swift) y config plugin
desktop/            Electron: proceso principal, preload, protocolo app://, empaquetado
plugins/            Config plugins de Expo del proyecto (firma de Android)
scripts/            Utilidades: copiar pdf.js/CanvasKit, licencias, escritorio, PDF de prueba
e2e/                Pruebas en navegador real y en Electron
```

## Edición no destructiva

Un documento es un **modelo**: lista ordenada de `PageRef` (página de un PDF, en blanco, pautada o imagen) con rotación y recorte, más las anotaciones de cada página en coordenadas de la página (puntos PDF). Los archivos originales nunca se modifican. Cada cambio es un **comando** serializable aplicado por una función pura (`src/core/commands.ts`); el historial guarda los modelos anteriores (que comparten estructura) para deshacer/rehacer. El guardado es automático (`src/reader/useDocument.ts`).

## Base de datos

`drizzle-orm/sqlite-proxy` sobre un `SqlExecutor` común:
- iOS/Android: `expo-sqlite`.
- Escritorio: SQLite integrado en Electron (`node:sqlite`) en el proceso principal, por IPC.
- Navegador (solo desarrollo): sql.js guardado en IndexedDB.
- Tests: `node:sqlite`.

Las migraciones están en `src/db/migrations.ts` (`PRAGMA user_version`).

## Renderizado

- Móvil: el módulo nativo rasteriza la página N al ancho pedido y la guarda como PNG en caché (PdfRenderer solo admite una página abierta a la vez: el acceso está serializado).
- Escritorio: pdf.js con su *worker* local (sin CDN).
- `PageRenderer` mantiene una caché LRU y pre-renderiza las páginas siguiente y anterior.
- Las páginas en blanco y pautadas se dibujan como vectores.

## Pedal y teclado

Todas las plataformas convierten la tecla a un nombre común (`ArrowRight`, `PageDown`, `Space`…). `src/core/keymap.ts` decide la acción y filtra rebotes y autorrepetición; `src/core/navigation.ts` decide qué se ve tras cada paso en cada modo. Android captura las teclas en `MainActivity.dispatchKeyEvent` (inyectado por el config plugin); iOS con una vista invisible que es *first responder* (`pressesBegan` + `UIKeyCommand`).

## Seguridad del escritorio

`contextIsolation`, `sandbox`, sin `nodeIntegration`, CSP estricta en cada respuesta del protocolo `app://`, toda petición de red bloqueada, permisos denegados, rutas de archivos validadas en el proceso principal.
