# 7. Android sin Google Play (gratis)

Antes de pagar Google Play (guía 08), la app ya se puede instalar gratis en cualquier Android de dos formas.

---

## Opción A. Descarga directa del APK

La explicada en la guía 02: se descarga `AtrilPDF-…-android.apk` de la página de versiones y se instala. Sencillo, pero **no se actualiza sola**: hay que descargar cada versión nueva.

## Opción B. Obtainium: actualizaciones automáticas desde GitHub (recomendada)

**Obtainium** es una app libre que instala apps directamente desde su página de GitHub y avisa cuando hay versión nueva. No hace falta que tú hagas nada: funciona con lo que ya publicas.

Instrucciones para compartir:

1. Instala **Obtainium** desde su página oficial: https://obtainium.imranr.dev (botón de descarga) o desde F-Droid.
2. Ábrela y pulsa **Añadir app** (Add App).
3. En **URL de la fuente** pega:
   `https://github.com/MarcosHernandezParraga/atril-pdf`
4. Pulsa **Añadir** y después **Instalar**.
5. A partir de ahí, cuando publiques una versión nueva, Obtainium avisará y se actualiza con un toque.

## ¿Y F-Droid o IzzyOnDroid? (tiendas de apps libres)

Situación a 1 de noviembre de 2026:

- **IzzyOnDroid** no admite apps desarrolladas con herramientas de inteligencia artificial y pide transparencia sobre el proceso de desarrollo.
- **F-Droid** está debatiendo normas nuevas sobre el mismo tema. Además, compila cada app en sus propios servidores, lo que con React Native requiere bastante trabajo de adaptación.

Antes de enviar la app a cualquiera de las dos, lee sus normas actuales y respóndelas con total transparencia. Mientras tanto, la opción B (Obtainium) da lo mismo a los usuarios: app libre, sin Google y con actualizaciones.

> Los textos e imágenes para tiendas Android ya están preparados en la carpeta `fastlane/metadata/android/` (español e inglés), por si se usan en el futuro.
