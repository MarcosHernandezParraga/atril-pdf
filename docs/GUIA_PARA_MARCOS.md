# Guía para Marcos: cómo usar y publicar Atril PDF

Esta guía está escrita para alguien que no sabe programar. Cada paso dice exactamente qué pulsar y qué deberías ver.

> 📁 **Las guías completas de publicación, una por cada tienda, están en [`docs/publicar/`](publicar/README.md).** Esta página es el resumen.

**Idea general:** el código de la app se guarda en **GitHub** (una web gratuita para guardar proyectos). Cuando el código está allí, GitHub **fabrica solo** los instaladores de Windows, Mac, Linux y Android cada vez que se lo pidas. Después, cada tienda (Microsoft Store, Google Play, App Store…) recibe esos instaladores. Por eso el **paso 1 es imprescindible**: sin él no se puede publicar en ningún sitio.

| Dónde | ¿Gratis? | Qué hace falta de ti |
| --- | --- | --- |
| Descarga directa desde GitHub (Windows, Mac, Linux, Android) | ✅ Gratis | Solo el paso 1 |
| Microsoft Store (Windows) | ✅ Gratis para particulares | Cuenta de desarrollador de Microsoft con tu DNI |
| Linux (AppImage y .deb) | ✅ Gratis | Solo el paso 1 (Flathub: ver `docs/publicar/06-linux.md`) |
| Android fuera de Google Play (Obtainium) | ✅ Gratis | Solo el paso 1 (F-Droid/IzzyOnDroid: ver `docs/publicar/07-…`) |
| **Google Play** (Android) | 💶 25 USD, **una sola vez** | Cuenta de Google Play + 12 personas que la prueben 14 días |
| **App Store** (iPhone y iPad) y Mac App Store | 💶 **99 USD al año** | Cuenta de Apple Developer |
| iPhone/iPad **sin pagar** | ✅ Gratis (alternativa) | Versión web que se instala desde Safari (ver apartado 8) — **ya preparada** |

---

## 1. Crear el repositorio en GitHub (imprescindible, 5 minutos)

Ya tienes cuenta de GitHub (`MarcosHernandezParraga`).

1. Entra en **https://github.com/new** (si te lo pide, inicia sesión).
2. En **Repository name** escribe exactamente: `atril-pdf`
3. En **Description**: `Lector de partituras PDF libre y gratuito para músicos`
4. Marca **Public**.
5. **No** marques nada más (ni README, ni .gitignore, ni license).
6. Pulsa el botón verde **Create repository**.
7. Verás una página con el título «Quick setup». **Ya está. Avísame** y yo subo el código.

**Tu correo:** los cambios del proyecto llevan tu nombre y tu correo de Gmail, que en un proyecto público se ve. Si prefieres ocultarlo, entra en **https://github.com/settings/emails**, marca **Keep my email addresses private**, copia la dirección que aparece (termina en `@users.noreply.github.com`) y pásamela.

Cuando haya subido el código, en tu repositorio verás la pestaña **Actions**: un círculo amarillo significa «trabajando» y un ✓ verde, «todo correcto».

---

## 2. Probarla ya en tu móvil o tableta Android

1. Descarga el archivo **AtrilPDF-…-android.apk** que te he enviado, directamente en el móvil (o pásalo por cable).
2. Ábrelo desde **Archivos** o **Descargas**.
3. Si Android avisa de que no permite instalar apps de esta fuente: pulsa **Ajustes**, activa **Permitir de esta fuente** y vuelve atrás.
4. Pulsa **Instalar**. Si sale un aviso de Google Play Protect: **Más detalles → Instalar de todas formas** (sale porque la app no viene de Google Play).
5. Abre **Atril PDF**.

Es una versión de prueba: cuando publiquemos la definitiva habrá que desinstalar esta antes, así que no metas aún partituras importantes.

---

## 3. Probarla ya en tu ordenador Windows

1. Descarga el archivo **Atril PDF-…-win-x64.zip** que te he enviado.
2. Haz clic derecho sobre él → **Extraer todo…** → **Extraer**.
3. Abre la carpeta que se crea y haz doble clic en **Atril PDF.exe**.
4. Windows mostrará «Windows protegió su PC» (sale con cualquier programa nuevo sin certificado de pago): pulsa **Más información → Ejecutar de todas formas**.

Esta versión no se instala (funciona desde esa carpeta). El **instalador normal** (con acceso directo en el escritorio y «Abrir con → Atril PDF» para los PDF) lo fabricará GitHub en cuanto exista el repositorio.

---

## 4. Sacar una versión para todo el mundo (cuando lo decidas)

Esto lo haces tú desde la web de GitHub (o me lo pides y lo hago yo):

1. En tu repositorio, columna de la derecha → **Releases** → **Draft a new release** (o «Create a new release»).
2. Pulsa **Choose a tag**, escribe `v0.1.0` y pulsa **Create new tag**.
3. En **Release title** escribe `Atril PDF 0.1.0` y pulsa **Publish release**.
4. Espera unos 30 minutos. En esa misma página aparecerán los archivos:
   - Windows: `…-win-x64.exe` (instalador)
   - Mac: `…-mac-universal.dmg`
   - Linux: `….AppImage` y `….deb`
   - Android: `….apk` (para instalar directamente) y `….aab` (para Google Play)

Ese enlace de **Releases** es el que puedes pasar a tus alumnos y compañeros para que se la descarguen gratis.

---

## 5. Microsoft Store (Windows) — gratis

1. Entra en **https://storedeveloper.microsoft.com** y pulsa **Get started / Empezar** como **particular (Individual)**.
2. Inicia sesión con una cuenta de Microsoft (Outlook/Hotmail; si no tienes, se crea allí gratis).
3. Rellena tus datos y verifica tu identidad (te pedirá una foto de tu DNI y un selfi).
4. Cuando te aprueben (suele tardar de 1 a 3 días), en **Partner Center** pulsa **Crear una aplicación nueva** y reserva el nombre **Atril PDF**.
5. Entra en **Identidad del producto** y **cópiame** estos dos datos: `Package/Identity/Name` y `Package/Identity/Publisher`. Con ellos preparo el paquete para la tienda.
6. Te diré qué archivo subir y qué textos pegar (ya los tengo preparados en español e inglés).

---

## 6. Google Play (Android) — 25 USD una sola vez

1. Entra en **https://play.google.com/console/signup** con tu cuenta de Google.
2. Elige **cuenta personal**, paga los 25 USD y verifica tu identidad (DNI) y tu teléfono.
3. **Obligatorio para cuentas nuevas:** antes de publicar, hay que hacer una **prueba cerrada con al menos 12 personas durante 14 días seguidos**. Ve pensando en 12 alumnos, compañeros o amigos con Android que acepten instalarla.
4. Antes de eso hay que crear tu **clave de firma** (es como tu firma digital; con ella Google sabe que las actualizaciones son tuyas). Te guío en el apartado 9.
5. Con la cuenta creada, te iré diciendo paso a paso dónde subir el archivo `.aab`, los textos, el icono y las capturas (ya preparados).

---

## 7. App Store (iPhone, iPad y Mac) — 99 USD al año

Apple **obliga** a pagar la cuota para publicar en el App Store. Solo la perdona a **organizaciones** (centros educativos acreditados, entidades sin ánimo de lucro, administraciones públicas) que publiquen apps gratuitas, y solo en algunos países (hay que comprobarlo en https://developer.apple.com/support/fee-waiver). A particulares no. Si un conservatorio o una asociación quisiera publicarla a su nombre, podría pedir la exención; la app seguiría diciendo «Hecho por Marcos Hernández Párraga».

Si decides pagarla:
1. Entra en **https://developer.apple.com/programs/enroll** con tu Apple ID (el de tu iPhone/iPad).
2. Inscríbete como **particular (Individual)**, verifica tu identidad y paga 99 USD.
3. Crea una cuenta gratuita en **https://expo.dev** (es el servicio que compila la app para Apple en la nube; **no necesitas un Mac**).
4. Avísame: la compilo, la subo a **TestFlight** (la app de Apple para probar) y la instalas en tu iPad antes de publicarla.

**Mac sin pagar:** la versión de Mac sí se puede descargar gratis desde GitHub (apartado 4). La primera vez que se abre, macOS avisa; se abre en **Ajustes del Sistema → Privacidad y seguridad → Abrir igualmente**.

---

## 8. iPhone/iPad sin pagar: la versión web (ya preparada)

**Atril PDF ya funciona como web instalable.** Cuando el código esté en GitHub y actives *Pages* (guía `docs/publicar/01-github.md`, paso 3), estará en:

**https://marcoshernandezparraga.github.io/atril-pdf/**

En el iPad o iPhone: ábrela en **Safari → Compartir → Añadir a pantalla de inicio**. Aparece el icono de Atril PDF, se abre a pantalla completa y **funciona sin internet**. La propia app lo explica la primera vez que se abre en Safari.

- ✅ Pedal Bluetooth, Apple Pencil, zoom con dos dedos, carpetas-concierto, panel de páginas, pentagrama e imágenes.
- ⚠️ No aparece en «Abrir con» de otras apps (los PDF se importan desde la app) y las partituras se guardan dentro de Safari.

Todos los detalles: `docs/publicar/03-web-iphone-ipad.md`.

---

## 9. Tu clave de firma de Android (gratis, una sola vez, antes de publicar)

Es tu «firma» digital: **guárdala muy bien**, porque si la pierdes no podrás actualizar la app. Hazlo en tu PC; no se la pases a nadie (tampoco a mí).

1. Botón Inicio → escribe `PowerShell` → pulsa Intro. Se abre una ventana azul o negra.
2. Copia y pega esto y pulsa Intro (instala Java, que hace falta para crear la clave):

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
```

3. Cierra esa ventana y abre otra igual. Copia y pega esto y pulsa Intro. Te pedirá **inventar una contraseña** (apúntala) y tu nombre y ciudad:

```powershell
keytool -genkeypair -v -keystore $HOME\Documents\atril-release.keystore -alias atril -keyalg RSA -keysize 4096 -validity 10000
```

4. Haz **dos copias** del archivo `Documentos\atril-release.keystore` (por ejemplo en un pendrive y en tu Google Drive) junto con la contraseña.
5. Copia la clave como texto (pega esto y pulsa Intro; no verás nada, pero queda copiada):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\Documents\atril-release.keystore")) | Set-Clipboard
```

6. En GitHub, en tu repositorio: **Settings → Secrets and variables → Actions → New repository secret**. Crea estos cuatro (botón verde **Add secret** cada vez):
   - Nombre `ANDROID_KEYSTORE_BASE64` → en el valor, pega (Ctrl+V).
   - Nombre `ANDROID_KEYSTORE_PASSWORD` → tu contraseña.
   - Nombre `ANDROID_KEY_ALIAS` → `atril`
   - Nombre `ANDROID_KEY_PASSWORD` → tu contraseña.

Desde ese momento, todas las versiones de Android saldrán firmadas por ti.

---

## 10. Cómo usar la app (resumen)

- **Abrir / Importar**: añade PDF o fotos de partituras. Un PDF abierto desde otra app con «Abrir con… Atril PDF» también se guarda solo.
- **Carpetas · Conciertos**: pulsa **Nueva carpeta** (por ejemplo «Concierto de Navidad»).
  - Para meter obras: **mantén pulsada una partitura** de la pantalla de inicio y **arrástrala** hasta la carpeta (o a la barra de carpetas que aparece arriba). También con **Añadir obras** dentro de la carpeta.
  - **Ordenar**: arrastra cada obra arriba o abajo con el dedo, o usa las flechas.
  - **Iniciar concierto** toca todas las obras seguidas: al pasar la última página de una obra se abre la primera de la siguiente.
- **Todos los documentos**: debajo, del más reciente al más antiguo.
- **Pasar página**: tocando el lado derecho o izquierdo, deslizando, con el teclado o con el **pedal Bluetooth**. Pruébalo en **Ajustes → Pedal / teclado → Probar pedal**.
- **Ampliar (zoom)**: separa **dos dedos** sobre la partitura; con un dedo mueves la página ampliada. En el ordenador: **Ctrl + rueda del ratón**, el gesto de pellizco del trackpad, o **Ctrl +** / **Ctrl −** / **Ctrl 0**. Al pasar de página vuelve al tamaño normal; el botón con el porcentaje también lo restablece.
- **Páginas** (icono de cuadrícula arriba): se abre un panel a la derecha con todas las páginas numeradas. Puedes **ordenarlas** (mantén pulsada y arrastra, o flechas), **duplicar**, **eliminar**, añadir **página en blanco**, **otro PDF** (sus páginas se unen al documento) o **una imagen** como página. Todo se puede **deshacer**.
- **Escribir sobre el PDF**: pulsa el **lápiz** (Anotar). Bolígrafo, subrayador, borrador y **texto**. El botón **«Lápiz y dedo» / «Solo lápiz»** sirve para que el dedo no dibuje cuando escribes con lápiz.
  - **Pentagrama**: añade un pentagrama de cinco líneas sin clave. Con **Mover** lo arrastras y con las **esquinas** lo haces más ancho, estrecho, alto o bajo. Opción «Fondo blanco» para tapar lo que haya debajo.
  - **Imagen**: pega una imagen encima de la página; muévela y cambia su tamaño por las esquinas.
- **Etiquetas**: en el ordenador, al pasar el ratón por un icono aparece su nombre; en la tableta, mantén el dedo sobre el icono.
- **Idioma**: la app aparece sola en el idioma del móvil, la tableta o el ordenador (21 idiomas). Para cambiarlo: **Ajustes → Idioma** (cada idioma aparece escrito en su lengua). «Como el sistema» vuelve al idioma del aparato.
- **Pantalla completa**: doble toque en el centro. Para salir, mantén el dedo en el borde superior (o Esc en el ordenador).
