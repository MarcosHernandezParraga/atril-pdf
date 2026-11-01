# 9. App Store (iPhone, iPad y Mac) — 99 USD al año

Apple **obliga** a pagar la cuota anual para publicar en el App Store. Mientras no la pagues, la alternativa gratuita para iPhone y iPad es la **versión web** (guía 03). Si un conservatorio o asociación quisiera publicarla sin pagar, mira la guía 10.

**No necesitas un Mac:** la app para Apple se fabrica en la nube con **Expo** (servicio gratuito para esto).

Todo está preparado en el proyecto; estos son los pasos cuando decidas hacerlo.

---

## Paso 1. Cuenta de Apple Developer (99 USD/año)

1. Entra en **https://developer.apple.com/programs/enroll** con tu **Apple ID** (el de tu iPad o iPhone).
   - Más fácil: instala la app **Apple Developer** en el iPad/iPhone → **Cuenta → Inscribirse**. Verifica tu identidad con el DNI desde la propia app.
2. Inscríbete como **Individual (particular)**. En el App Store aparecerá como vendedor «Marcos Hernández Párraga».
3. Paga los 99 USD. La aprobación tarda de horas a 2 días.

## Paso 2. Cuenta de Expo (gratis)

1. Crea una cuenta en **https://expo.dev/signup**.
2. Ve a **https://expo.dev/settings/access-tokens** → **Create token** → nombre `github` → copia el código.
3. En GitHub: **Settings → Secrets and variables → Actions → Secrets → New repository secret** → Name `EXPO_TOKEN`, valor: el código.

## Paso 3. La primera compilación (la hacemos juntos)

La primera vez Expo necesita entrar en tu cuenta de Apple para crear los certificados. Se hace una sola vez, desde tu ordenador Windows y con mi ayuda en directo:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile production
```

Te preguntará tu Apple ID, contraseña y el código de verificación de tu iPhone. Expo guarda los certificados en su servidor; no se guardan en el proyecto.

Después, en GitHub crea la variable **`ENABLE_IOS`** con valor `true` (**Settings → Secrets and variables → Actions → Variables**), y cada versión nueva compilará también la de Apple.

## Paso 4. Crear la app en App Store Connect

1. Entra en **https://appstoreconnect.apple.com** → **Apps** → **+** → **Nueva app**.
   - Plataformas: **iOS**
   - Nombre: `Atril PDF`
   - Idioma principal: **Español (España)**
   - ID del paquete (Bundle ID): **com.marcoshernandez.atrilpdf**
   - SKU: `atrilpdf`
   - Acceso: **Acceso completo**
2. **Información de la app**:
   - Subtítulo: `Tu atril digital`
   - Categoría principal: **Música**; secundaria: **Educación**
   - Clasificación por edades: responde **Ninguna/No** a todo → **4+**
   - **Estado de comerciante (Ley de Servicios Digitales de la UE):** si no ganas dinero con la app, declara **No soy comerciante**. (Si lo fueras, Apple mostraría tu dirección, teléfono y correo en la ficha.) Sin esta declaración la app no se publica en la Unión Europea. Ver guía 11.
3. **Privacidad de la app**:
   - URL de la política de privacidad: `https://github.com/MarcosHernandezParraga/atril-pdf/blob/main/docs/PRIVACIDAD.md`
   - **Prácticas de datos → ¿Recopilas datos? → No.** Aparecerá la etiqueta **«Datos no recopilados»**.
4. **Precio y disponibilidad:** **Gratis**, todos los países.
5. **Versión 1.0** (la ficha):
   - Texto promocional, descripción y palabras clave: en la guía 12.
   - URL de soporte: `https://github.com/MarcosHernandezParraga/atril-pdf/issues`
   - Capturas: **iPhone 6,9"** y **iPad 13"** (te las preparo).
   - Copyright: `2026 Marcos Hernández Párraga`
   - **Información para la revisión:** no hace falta usuario de prueba. Notas:
     > Free, open-source PDF sheet music reader. Works fully offline, no account, no data collection. To test: tap "Abrir / Importar" and choose any PDF from Files.
   - **Cifrado:** ya está declarado en la app que no usa cifrado propio (no tendrás que responder nada).

## Paso 5. Probar en tu iPad con TestFlight

Cuando la compilación termina, aparece en App Store Connect → **TestFlight**. Instala la app **TestFlight** en tu iPad, añádete como probador interno y prueba la app antes de publicarla. Puedes invitar hasta 10 000 personas a probarla.

## Paso 6. Enviar a revisión

En la versión: **Compilación → +** → elige la que probaste → **Añadir para revisión → Enviar**. Apple suele responder en 1–2 días. Si piden algo, cópiame el mensaje.

---

## Mac

La versión de Mac ya se descarga gratis desde GitHub (guía 02). Con la cuenta de Apple puedes además **firmarla y notarizarla** para que no salga el aviso de «desarrollador no identificado». Hace falta crear un certificado «Developer ID Application» y guardarlo como secretos (`MAC_CERTIFICATE_P12_BASE64`, `MAC_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`). Cuando llegue el momento, te guío.

## Que Apple la destaque

Apple tiene un formulario para proponer apps a su equipo editorial (las que salen en «Hoy» del App Store): **https://developer.apple.com/contact/app-store/promote/**. Es gratis. Una app de partituras gratuita, sin anuncios y hecha por un músico es una buena historia: cuéntalo así, con la fecha de alguna novedad o de un concierto.
