# 8. Google Play (Android) — 25 USD una sola vez

Todo queda **preparado**: cuando decidas pagar la cuenta, sigue estos pasos en orden. Calcula unas **3 semanas** en total, porque Google obliga a una prueba de 14 días.

---

## Paso 0. Antes de nada: tu clave de firma

Es tu «firma digital» de Android. Sin ella no se puede publicar. Está explicado paso a paso en **docs/GUIA_PARA_MARCOS.md, apartado «Tu clave de firma de Android»**. Cuando la tengas guardada en GitHub como secreto, todas las versiones saldrán firmadas por ti, y el archivo **`.aab`** de cada versión es el que se sube a Google Play.

## Paso 1. Crear la cuenta de desarrollador

1. Entra en **https://play.google.com/console/signup** con tu cuenta de Google.
2. Elige **Personal** (para ti, no para una empresa).
3. Paga **25 USD** (una sola vez, con tarjeta).
4. Verifica tu **identidad** (foto del DNI) y tu **teléfono**.
5. Te preguntará si vas a ser **comerciante (trader)** según la ley europea (Ley de Servicios Digitales). Si la app es gratuita y no ganas dinero con ella, lo normal es responder **No soy comerciante**. (Si fueras comerciante, Google publicaría tu dirección y teléfono.) Más en la guía 11.

## Paso 2. Crear la app

1. **Crear aplicación** →
   - Nombre: `Atril PDF`
   - Idioma predeterminado: **Español (España)**
   - Aplicación o juego: **Aplicación**
   - Gratuita o de pago: **Gratuita** (⚠️ después no se puede cambiar a de pago)
   - Acepta las declaraciones y pulsa **Crear aplicación**.

## Paso 3. Rellenar «Configurar tu aplicación» (lista de tareas del panel)

Respuestas exactas:

| Apartado | Respuesta |
| --- | --- |
| **Política de privacidad** | `https://github.com/MarcosHernandezParraga/atril-pdf/blob/main/docs/PRIVACIDAD.md` |
| **Acceso a la aplicación** | Todas las funciones están disponibles sin restricciones |
| **Anuncios** | No, mi aplicación no contiene anuncios |
| **Clasificación de contenido** | Rellena el cuestionario: categoría **Todas las demás**; responde **No** a todo → saldrá **PEGI 3** |
| **Público objetivo** | **13 años o más** (13-15, 16-17, 18+). *Si marcas edades menores, Google aplica normas extra de apps para familias; la app la pueden usar igualmente estudiantes más jóvenes.* |
| **Aplicación de noticias** | No |
| **Seguridad de los datos** | ¿Recoge o comparte datos? **No**. (Así sale «No se recogen datos» y «No se comparten datos».) |
| **Aplicaciones gubernamentales** | No |
| **Funciones financieras** | Ninguna |
| **Salud** | Ninguna |

## Paso 4. Ficha de Play Store

- **Nombre:** `Atril PDF`
- **Descripción breve** y **descripción completa:** en la guía 12 (ya están también en `fastlane/metadata/android/es-ES/`).
- **Icono (512×512):** `fastlane/metadata/android/es-ES/images/icon.png`
- **Gráfico destacado (1024×500):** `fastlane/metadata/android/es-ES/images/featureGraphic.png`
- **Capturas de teléfono** (mínimo 2) y de **tableta de 7" y 10"**: en `fastlane/metadata/android/es-ES/images/` (carpetas `phoneScreenshots`, `sevenInchScreenshots`, `tenInchScreenshots`).
- **Categoría:** Música y audio. **Etiquetas:** música, partituras.
- **Correo de contacto:** el tuyo. Sitio web: `https://github.com/MarcosHernandezParraga/atril-pdf`
- Añade **inglés** como segundo idioma con los textos de `fastlane/metadata/android/en-US/`.

## Paso 5. La prueba cerrada obligatoria (12 personas, 14 días)

Las cuentas personales nuevas **no pueden publicar directamente**: antes hay que hacer una prueba con **al menos 12 personas** que la tengan instalada **14 días seguidos**.

1. Reúne 12 o más personas con Android (alumnos, compañeros, familia). Necesitas su **correo de Gmail**.
2. En Play Console: **Probar y publicar → Pruebas → Prueba cerrada → Crear canal** (o usar «Alpha»).
3. **Testers → Crear lista de correo**: pega los correos (uno por línea). Guarda.
4. **Crear versión** → sube el archivo **`AtrilPDF-v….aab`** de la última versión de GitHub.
   - La primera vez te preguntará por la **firma de apps de Google Play**: acepta la opción recomendada (Google guarda la firma final; tu clave sirve para subir versiones).
5. Nombre de la versión: el número (por ejemplo `0.2.0`). Notas: las novedades. **Guardar → Revisar → Iniciar lanzamiento**.
6. En la página del canal aparece un **enlace para unirse**. Envíaselo a los 12: tienen que abrirlo con su cuenta de Gmail, pulsar **Convertirse en tester** e **instalar** la app desde Google Play.
7. Espera **14 días** con todos ellos dados de alta (que no la desinstalen).
8. Pasado ese tiempo: **Panel → Solicitar acceso de producción**. Responde a las preguntas sobre la prueba (cuántos testers, qué opinaron, qué cambiaste). Google tarda unos días en contestar.

## Paso 6. Publicar

Con el acceso de producción: **Producción → Crear versión** → sube el `.aab` → **Iniciar lanzamiento**. La revisión suele tardar de unas horas a unos días.

## Actualizaciones

Cada versión nueva de GitHub trae un `.aab` con un número de versión mayor (se calcula solo). En Play Console: **Producción → Crear versión → subir el nuevo `.aab`**.

> **Opcional (automático):** el flujo «Stores» del repositorio puede subirlo solo, con una cuenta de servicio de Google (`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`) y una cuenta de Expo. Si algún día lo quieres, te guío.
