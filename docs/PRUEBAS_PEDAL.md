# Pruebas del pedal y del teclado

Checklist manual para comprobar el pedal Bluetooth (AirTurn, PageFlip, Donner, iRig BlueTurn, Cubilux…) y un teclado físico en cada plataforma. Marca cada casilla al probarla e indica el modelo de pedal usado.

La lógica (mapeo de teclas, anti-rebote y navegación en todos los modos) tiene tests automáticos en `src/core/__tests__/keymap.test.ts` y `navigation.test.ts`, y una prueba en navegador real en `e2e/web-smoke.mjs`.

## Preparación

1. Empareja el pedal con el dispositivo (Ajustes de Bluetooth del sistema). La mayoría de pedales tienen varios modos: elige el de **flechas** o **Re Pág / Av Pág**.
2. Abre **Atril Musical → Ajustes → Pedal / teclado → Probar pedal** y pisa cada pedal. Debe aparecer el nombre de la tecla (por ejemplo `ArrowRight` o `PageDown`).

## Lista de comprobación (repetir en cada plataforma)

Plataformas: ☐ iPad ☐ iPhone ☐ Android tableta ☐ Android móvil ☐ Windows ☐ macOS ☐ Linux

| # | Prueba | Resultado esperado |
|---|--------|--------------------|
| 1 | Sin configurar nada, abrir una partitura y pisar «siguiente» | Pasa una página |
| 2 | Pisar «anterior» | Vuelve una página |
| 3 | Pisar una vez de forma firme (rebote mecánico) | Pasa **solo una** página |
| 4 | Mantener el pedal pisado 2 s | Pasa **solo una** página (se ignora la autorrepetición) |
| 5 | Modo **media página**: pisar «siguiente» dos veces | 1.º: arriba aparece la mitad superior de la siguiente; 2.º: la siguiente completa |
| 6 | Modo **dos páginas** (avance de 1 en 1) | La página derecha pasa a la izquierda |
| 7 | Modo **vertical con anticipación** | Avanza página a página, siempre con el primer sistema de la siguiente abajo |
| 8 | Modo **vertical continuo** | Avanza una pantalla menos el solapamiento; el último sistema leído queda arriba |
| 9 | Abrir y cerrar el menú de modos, luego pisar el pedal | Sigue funcionando (el lector no pierde el foco) |
| 10 | Abrir el diálogo «Ir a la página», escribir un número con el teclado en pantalla y cerrarlo | Mientras se escribe, las teclas van al campo; al cerrar, el pedal vuelve a pasar página |
| 11 | Pantalla completa (modo actuación) y pisar el pedal | Pasa página sin mostrar barras |
| 12 | **Ajustes → Pedal → Aprender** para «Siguiente» y pisar otro pedal/tecla | Queda asignada y funciona en el lector |
| 13 | Cambiar el anti-rebote a 300 ms y pisar dos veces rápido | Solo pasa una página |
| 14 | (Solo Android) Activar «botones de volumen» | Bajar volumen = siguiente, subir = anterior, sin cambiar el volumen |
| 15 | (Escritorio) F11 y Esc | Entran y salen de pantalla completa |
| 16 | (Escritorio) Rueda del ratón | Pasa página en los modos de página |

## Notas por plataforma

- **iOS / iPadOS**: las teclas de volumen no se pueden usar (Apple no ofrece una API pública), por eso esa opción no aparece en iOS. Al conectar un pedal, iOS oculta el teclado en pantalla; para escribir, pulsa el campo de texto y, si no aparece el teclado, usa el botón de teclado de la barra inferior de iPadOS o desconecta el pedal un momento.
- **Android**: si el pedal envía teclas multimedia («pista siguiente»), también funcionan. Probado el código de captura en `MainActivity.dispatchKeyEvent` (inyectado por `modules/atril-native/plugin`).
- **Escritorio**: las teclas multimedia se reciben con la Media Session API del navegador interno; su fiabilidad depende del sistema operativo. Las flechas y Re Pág/Av Pág funcionan siempre.

## Registro de pruebas

| Fecha | Plataforma y dispositivo | Pedal | Resultado | Notas |
|-------|--------------------------|-------|-----------|-------|
| | | | | |
