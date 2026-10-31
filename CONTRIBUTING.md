# Cómo contribuir / Contributing

¡Gracias por tu interés en Atril PDF! / Thanks for your interest in Atril PDF!

## Principios

- La app es **gratuita, sin anuncios, sin cuentas y sin recogida de datos**. No se aceptan cambios que añadan telemetría, publicidad, servicios en la nube o dependencias con licencias de pago, GPL o AGPL.
- **Nada estorba al tocar**: cada función a uno o dos toques como máximo.
- Pocas funciones, muy bien hechas.

## Antes de enviar cambios

```bash
npm ci
npm run check      # tipos + lint + tests
```

- TypeScript estricto, sin errores de ESLint.
- La lógica pura va en `src/core/` y debe tener tests.
- Cada archivo de código empieza con la cabecera de copyright y licencia MIT.
- Textos visibles siempre en `src/i18n/locales/es.json` **y** `en.json` (hay un test que comprueba que tienen las mismas claves).
- Si añades una dependencia, ejecuta `npm run licenses` para actualizar `THIRD_PARTY_LICENSES.md`.

## Informar de un problema

Abre una *issue* en GitHub indicando el dispositivo, el sistema operativo, la versión de la app y los pasos para reproducirlo. Si el problema es con un pedal, indica la marca y el modelo y lo que muestra **Ajustes → Pedal / teclado → Probar pedal**.
