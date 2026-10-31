# Guía para Marcos: qué tienes que hacer tú

Esta guía explica, paso a paso y sin dar nada por sabido, lo que tienes que hacer tú para que Atril PDF funcione en cada sitio. Se irá ampliando en cada fase.

---

## 1. Crear el repositorio en GitHub (lo primero)

El código está terminado para esta fase, pero necesita un sitio donde guardarse para siempre y desde donde GitHub compile la app automáticamente. Ya tienes cuenta de GitHub (`MarcosHernandezParraga`), así que solo hay que crear el repositorio:

1. Entra en https://github.com/new (inicia sesión si te lo pide).
2. En **Repository name** escribe exactamente: `atril-pdf`
3. En **Description** (opcional): `Lector de partituras PDF libre y gratuito para músicos`
4. Marca **Public** (público: así GitHub compila gratis también para Mac).
5. **No** marques «Add a README file», ni «.gitignore», ni «license» (el proyecto ya los trae; el repositorio tiene que estar vacío).
6. Pulsa el botón verde **Create repository**.
7. Verás una página que dice «Quick setup». Ya está: avísame y yo subo el código.

**Sobre tu correo:** los cambios del proyecto llevan tu nombre y tu correo `marcos.hernandezparraga@gmail.com`, y en un repositorio público ese correo es visible. Si prefieres ocultarlo:
1. Entra en https://github.com/settings/emails
2. Marca **Keep my email addresses private**.
3. Copia la dirección que aparece, del tipo `123456+MarcosHernandezParraga@users.noreply.github.com`, y pásamela: la pondré en todos los cambios antes de subirlos.

Cuando el código esté subido, GitHub ejecutará solo las comprobaciones. Lo verás en la pestaña **Actions** del repositorio: un círculo amarillo mientras trabaja y un ✓ verde cuando todo va bien.

---

## 2. Probar la app en tu móvil o tableta Android

Te paso un archivo `AtrilPDF-…-android.apk` (versión de prueba). Para instalarlo:

1. Copia el archivo al móvil (o descárgalo directamente en el móvil).
2. Ábrelo desde **Archivos** / **Descargas**.
3. Android dirá que no permite instalar apps de esta fuente: pulsa **Ajustes**, activa **Permitir de esta fuente** y vuelve atrás.
4. Pulsa **Instalar**. Si aparece un aviso de Google Play Protect, pulsa **Más detalles → Instalar de todas formas** (sale porque la app no viene de Google Play).
5. Abre **Atril PDF**. Verás la biblioteca vacía con el botón marrón **Abrir / Importar**.

Qué probar (y contarme cómo va):
- Importar un PDF con **Abrir / Importar**.
- Abrir un PDF desde otra app (por ejemplo desde **Archivos** o desde un correo): **Abrir con… → Atril PDF**. Debe abrirse directamente en el lector y quedarse en la biblioteca.
- Pasar página tocando el lado derecho/izquierdo, deslizando, y con tu **pedal Bluetooth**. Antes, prueba el pedal en **Ajustes → Pedal / teclado → Probar pedal**: debe aparecer el nombre de la tecla.
- Cambiar de modo con el icono del libro (arriba): **Media página**, **Dos páginas**, **Vertical con anticipación**…
- Pantalla completa (icono de las cuatro esquinas, o doble toque en el centro). Para salir: mantén el dedo en el borde superior.
- Usa la lista de `docs/PRUEBAS_PEDAL.md` para el pedal.

> Esta versión de prueba está firmada con una clave de pruebas. Cuando publiquemos la versión definitiva (firmada con tu propia clave), habrá que **desinstalar** la de prueba antes de instalar la nueva (Android no deja actualizar entre firmas distintas). Tus partituras importadas en la versión de prueba se perderían; por eso, de momento, úsala solo para probar.

---

## 3. Probar en Windows, macOS y Linux

Cuando el repositorio exista, crearé la primera versión (`v0.1.0`). GitHub compilará solo los instaladores (tarda unos 20 minutos) y aparecerán en la página **Releases** del repositorio (columna derecha de la página principal → **Releases**).

**Windows:**
1. En Releases, descarga el archivo que termina en `-win-x64.exe`.
2. Ábrelo. Windows mostrará «Windows protegió su PC» (sale con cualquier programa nuevo sin certificado de pago): pulsa **Más información → Ejecutar de todas formas**.
3. Sigue el instalador (Siguiente → Instalar). Se crea un acceso directo en el escritorio.
4. Prueba también: clic derecho sobre un PDF → **Abrir con → Atril PDF**, y arrastrar PDF desde el Explorador a la ventana.

**macOS:** descarga el `.dmg`, ábrelo y arrastra Atril PDF a **Aplicaciones**. La primera vez: **Ajustes del Sistema → Privacidad y seguridad → Abrir igualmente**.

**Linux:** descarga el `.AppImage`, dale permiso de ejecución (clic derecho → Propiedades → Permitir ejecutar) y ábrelo; o instala el `.deb` con doble clic.

---

## 4. Crear tu propia clave de firma de Android (gratis, una sola vez)

Es la «firma» que demuestra que las versiones de la app son tuyas. **Guárdala muy bien**: si la pierdes, no podrás publicar actualizaciones con la misma app. Hazlo en tu PC (no la compartas con nadie, tampoco conmigo).

1. Instala Java (si no lo tienes). En PowerShell:

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
```

2. Cierra y abre PowerShell. Crea la clave (te pedirá una contraseña: invéntate una larga y apúntala; y tus datos: nombre, ciudad…):

```powershell
keytool -genkeypair -v -keystore $HOME\Documents\atril-release.keystore -alias atril -keyalg RSA -keysize 4096 -validity 10000
```

3. Haz **dos copias de seguridad** del archivo `Documentos\atril-release.keystore` (por ejemplo en un pendrive y en tu nube personal) junto con la contraseña.
4. Conviértelo a texto para guardarlo en GitHub:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\Documents\atril-release.keystore")) | Set-Clipboard
```

5. En GitHub, en tu repositorio: **Settings → Secrets and variables → Actions → New repository secret**. Crea estos cuatro secretos (botón verde **Add secret** cada vez):
   - `ANDROID_KEYSTORE_BASE64`: pega (Ctrl+V) lo copiado en el paso 4.
   - `ANDROID_KEYSTORE_PASSWORD`: la contraseña del paso 2.
   - `ANDROID_KEY_ALIAS`: `atril`
   - `ANDROID_KEY_PASSWORD`: la misma contraseña del paso 2.

A partir de ahí, los APK que compile GitHub irán firmados con tu clave.

---

## 5. Sacar una versión nueva (cuando haya cambios)

1. En GitHub, entra en tu repositorio → **Releases** → **Draft a new release**.
2. En **Choose a tag** escribe el número nuevo, por ejemplo `v0.2.0`, y pulsa **Create new tag**.
3. En **Release title** escribe `Atril PDF 0.2.0` y pulsa **Publish release**.
4. Ve a la pestaña **Actions**: verás «Release» trabajando. En unos 20–30 minutos aparecerán en la release los instaladores de Windows, macOS, Linux y el APK/AAB de Android.

(El número de versión de la app lo actualizo yo en el código antes de cada versión.)

---

## 6. iPhone y iPad

Para instalar la app en iPhone/iPad hace falta obligatoriamente una **cuenta de desarrollador de Apple (99 USD al año)**; sin ella Apple no permite distribuirla (los centros educativos acreditados y las entidades sin ánimo de lucro pueden pedir la exención de la cuota). No hace falta tener un Mac: se compila en la nube con EAS Build (plan gratuito de Expo: unas 15 compilaciones de iOS al mes).

Cuando tengas la cuenta, te daré los pasos exactos para: crear la cuenta gratuita de Expo, conectar tu cuenta de Apple, compilar con `eas build --platform ios` y probarla con **TestFlight** en tu iPad antes de publicarla.

---

## 7. Tiendas (resumen; los pasos detallados llegarán en la fase de publicación)

| Tienda | Coste | Qué hará falta de ti |
| --- | --- | --- |
| GitHub Releases | Gratis | Nada más (ya preparado) |
| Microsoft Store | Gratis para particulares | Cuenta de Partner Center con verificación de identidad (DNI) |
| winget (Windows) | Gratis | Nada: se envía el manifiesto a GitHub |
| Flathub (Linux) | Gratis | Aceptar la revisión de Flathub en GitHub |
| F-Droid / IzzyOnDroid | Gratis | Nada especial (app libre, sin servicios de Google) |
| Google Play | 25 USD, pago único | Cuenta de desarrollador; prueba cerrada con **12 personas durante 14 días** antes de publicar |
| App Store | 99 USD/año | Cuenta de Apple Developer |

Los costes los he comprobado según la información disponible; los volveré a comprobar en la web oficial antes de que te des de alta en cada tienda.
