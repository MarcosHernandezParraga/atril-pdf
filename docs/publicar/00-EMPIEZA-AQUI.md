# Empieza aquí: publicar Atril PDF desde cero, todo en orden

Esta es la guía **completa y ordenada** para publicar Atril PDF en todos los sitios, partiendo de **cero** (no hay nada subido todavía). Está pensada para alguien que no sabe nada de programación: cada paso dice **qué pulsar** y **qué deberías ver**.

La primera versión pública será la **1.0.0**, la **versión base**: lleva todo lo que tiene la app hoy (21 idiomas, zoom, panel de páginas, pentagrama, carpetas-concierto…).

---

## El mapa: qué vas a hacer y en qué orden

| Etapa | Qué consigues | ¿Cuesta dinero? | Tiempo |
| --- | --- | --- | --- |
| **1. GitHub** | El proyecto guardado en internet. Es la base de todo lo demás. | Gratis | 30 min |
| **2. Tu clave de Android** | Tu «firma» para que nadie pueda hacerse pasar por ti | Gratis | 20 min |
| **3. Publicar la versión 1.0.0** | Instaladores de **Windows, Mac, Linux y Android** y la **web para iPhone/iPad** | Gratis | 5 min + 40 min de espera |
| **4. Repartir los enlaces** | Que tus alumnos y compañeros la descarguen | Gratis | 5 min |
| **5. Microsoft Store** | La tienda de Windows (sin avisos de seguridad al instalar) | Gratis | 1 h + 2-6 días de espera |
| **6. Google Play** | La tienda de Android | 25 USD, una sola vez | 3 semanas (por una prueba obligatoria) |
| **7. App Store** | La tienda de iPhone, iPad y Mac | 99 USD al año | 1-2 días |

**Las etapas 1, 2, 3 y 4 son obligatorias y gratuitas.** Con ellas la app ya está disponible para **todo el mundo** en todos los sistemas. Las etapas 5, 6 y 7 son las tiendas oficiales: hazlas cuando quieras y en el orden que quieras.

### Qué haces tú y qué hago yo

- **Tú:** crear las cuentas (llevan tu nombre y tu DNI), crear tu clave de firma, pulsar los botones de «Publicar» y guardar tus contraseñas.
- **Yo:** subir el código, arreglar cualquier fallo, preparar textos, capturas y paquetes, y ayudarte con cualquier pantalla que no entiendas.
- **Nunca** me pases contraseñas, códigos ni tu clave de firma. Se guardan como «secretos» de GitHub, que no puede leer nadie.

### Lo que necesitas tener a mano

- Tu **ordenador con Windows** y un navegador (Chrome, Edge o Firefox).
- Tu **móvil** (para los códigos de seguridad).
- Tu **DNI** (solo para las tiendas).
- Un **pendrive** (para guardar una copia de tu clave de firma).
- Un sitio seguro para **apuntar contraseñas** (una libreta guardada en casa o un gestor de contraseñas).
- Una **tarjeta** de pago, solo si haces Google Play o App Store.

### Palabras que vas a ver (en inglés, porque GitHub está en inglés)

| Palabra | Qué significa |
| --- | --- |
| **Repository** (repositorio) | La «carpeta» del proyecto en GitHub |
| **Settings** | Ajustes (del repositorio) |
| **Actions** | Las «máquinas» de GitHub que fabrican la app solas |
| **Release** (versión) | Una versión publicada con sus archivos para descargar |
| **Tag** (etiqueta) | El número de la versión, por ejemplo `v1.0.0` |
| **Secret** (secreto) | Una contraseña guardada en GitHub que nadie puede leer |
| **Pages** | La parte de GitHub que publica la versión web |

---

# ETAPA 1 — GitHub (obligatoria, gratis)

## Paso 1.1. Entrar en GitHub y proteger tu cuenta

1. Entra en **https://github.com** e inicia sesión como **MarcosHernandezParraga**.
   *Si no tienes cuenta: **Sign up**, usa tu correo, inventa una contraseña y elige el nombre de usuario `MarcosHernandezParraga`.*
2. GitHub obliga a tener la **verificación en dos pasos**. Si te lo pide (o para hacerlo ya):
   1. Arriba a la derecha, pulsa tu **foto** → **Settings**.
   2. En la columna izquierda: **Password and authentication**.
   3. **Enable two-factor authentication** → elige **Authenticator app**.
   4. En el móvil, instala **Microsoft Authenticator** o **Google Authenticator**, pulsa **+** y escanea el código cuadrado de la pantalla.
   5. Escribe en GitHub los 6 números que salen en el móvil.
   6. GitHub te da unos **códigos de recuperación**: pulsa **Download** y guárdalos con tus contraseñas. Sirven si pierdes el móvil.

## Paso 1.2. Crear el repositorio (vacío)

1. Entra en **https://github.com/new**.
2. **Repository name:** escribe exactamente `atril-pdf` (en minúsculas, con guion).
3. **Description:** `Tu atril digital: lector de partituras PDF libre y gratuito`
4. Marca **Public** (público).
5. **No marques nada más**: ni «Add a README», ni «.gitignore», ni «license». Ya están hechos y si los marcas habrá un choque.
6. Pulsa el botón verde **Create repository**.
7. ✅ **Qué deberías ver:** una página que pone **«Quick setup»** con instrucciones que puedes ignorar.

## Paso 1.3. Decidir qué correo se verá

Cada cambio del proyecto lleva tu nombre y un correo, y en un proyecto público **cualquiera puede verlo**. Elige:

- **Opción A, la sencilla:** que se vea tu Gmail. No tienes que hacer nada.
- **Opción B, más privada:** ocultarlo.
  1. Entra en **https://github.com/settings/emails**.
  2. Marca **Keep my email addresses private**.
  3. Debajo aparece una dirección que termina en `@users.noreply.github.com`. Cópiala y pásamela.

Dime **A** o **B** (con la dirección) **antes** de que suba el código.

## Paso 1.4. Subir el código

**Avísame** en cuanto el repositorio esté creado y me dices A o B. Yo subo todo el proyecto con tu nombre. Si hace falta que me des permiso para subirlo, te digo exactamente qué pulsar.

✅ **Qué deberías ver después** (recarga la página del repositorio): una lista de carpetas (`src`, `docs`, `desktop`…) y, debajo, la presentación de **Atril PDF**.

> **Muy importante mientras tanto:** guarda la **copia de seguridad** que te he enviado (`AtrilPDF-1.0.0-codigo-y-copia.zip`) en tu Google Drive o en un pendrive. Si se perdiera todo lo demás, con ese archivo se puede subir el proyecto entero con su historial.

## Paso 1.5. Activar la versión web (GitHub Pages)

1. En tu repositorio, arriba, pulsa **Settings** (la pestaña del engranaje).
2. En la columna izquierda, pulsa **Pages**.
3. En **Build and deployment → Source**, cambia **Deploy from a branch** por **GitHub Actions**.
4. No hay que pulsar nada más: se guarda solo.

## Paso 1.6. Activar los avisos de seguridad privados

1. **Settings** → en la columna izquierda, **Advanced Security** (en algunas cuentas se llama **Code security**).
2. Busca **Private vulnerability reporting** y pulsa **Enable**.

Así, si alguien encuentra un fallo de seguridad, te lo cuenta en privado en vez de publicarlo.

## Paso 1.7. Comprobar que las «máquinas» funcionan

1. Pulsa la pestaña **Actions** del repositorio.
2. Verás una tarea llamada **CI** (es la revisión automática del código).
3. ✅ A los 5-10 minutos debe tener un **✓ verde**. Si tiene una **✗ roja**, avísame.

---

# ETAPA 2 — Tu clave de firma de Android (obligatoria, gratis, una sola vez)

Es tu **firma digital** para Android. Sirve para que el móvil sepa que cada versión nueva viene **de ti** y no de un impostor.

> ⚠️ **Lee esto antes de empezar:**
> - Si **pierdes** la clave o su contraseña, **no podrás actualizar** la app de Android nunca más (habría que publicar otra app distinta).
> - **No se la pases a nadie**, tampoco a mí.
> - Se hace **una sola vez** en la vida de la app.

## Paso 2.1. Instalar Java (lo necesita la herramienta que crea la clave)

1. Pulsa el botón **Inicio** de Windows, escribe `PowerShell` y pulsa **Intro**. Se abre una ventana azul o negra donde se escriben órdenes.
2. Copia esta línea, pégala en la ventana (clic derecho pega) y pulsa **Intro**:

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
```

3. Si pregunta si aceptas los términos, escribe `Y` y pulsa **Intro**. Si Windows pregunta «¿Quieres permitir que esta aplicación haga cambios?», pulsa **Sí**.
4. ✅ Al terminar pone **«Instalado correctamente»** (o «Successfully installed»).
5. **Cierra** la ventana de PowerShell.

## Paso 2.2. Inventar la contraseña de la clave

Antes de crear la clave, **inventa una contraseña** y **apúntala** ya en tu sitio seguro:

- Al menos **12 caracteres**, con letras y números. Por ejemplo, dos palabras y un número: `PartituraAzul2026Sol`.
- **Sin espacios** y **sin símbolos** (ni comillas, ni `$`, ni `%`, ni barras), para evitar problemas.

## Paso 2.3. Crear la clave

1. Abre **otra vez** PowerShell (Inicio → `PowerShell` → Intro).
2. Copia y pega esta línea entera y pulsa **Intro**:

```powershell
keytool -genkeypair -v -keystore $HOME\Documents\atril-release.keystore -alias atril -keyalg RSA -keysize 4096 -validity 10000
```

3. Te hará preguntas. **Al escribir la contraseña no se ve nada en pantalla**: es normal, escríbela igualmente y pulsa **Intro**.

| Pregunta | Qué responder |
| --- | --- |
| Introduzca la contraseña del almacén de claves | Tu contraseña del paso 2.2 |
| Volver a escribir la contraseña nueva | La misma otra vez |
| ¿Cuáles son su nombre y su apellido? | `Marcos Hernandez Parraga` (mejor sin tildes; no se ve en ningún sitio) |
| ¿Cuál es el nombre de su unidad de organización? | Pulsa **Intro** sin escribir nada |
| ¿Cuál es el nombre de su organización? | Pulsa **Intro** sin escribir nada |
| ¿Cuál es el nombre de su ciudad o localidad? | Tu ciudad |
| ¿Cuál es el nombre de su estado o provincia? | Tu provincia |
| ¿Cuál es el código de país de dos letras? | `ES` |
| ¿Es correcto CN=…? | Escribe la letra `s` y pulsa **Intro** (si tu Windows está en inglés, escribe `yes`) |

4. ✅ Al final pone algo como **«Generando par de claves RSA de 4.096 bits…»** y **«Almacenando…atril-release.keystore»**.

*Si vuelve a hacerte las preguntas desde el principio, es que no entendió el «sí»: respóndelas otra vez y al final escribe solo `s`.*
*Si dice que `keytool` no se reconoce: reinicia el ordenador y repite este paso.*

## Paso 2.4. Hacer dos copias de seguridad de la clave

El archivo está en **Documentos** y se llama **`atril-release.keystore`**.

1. Cópialo a un **pendrive** que guardes en casa.
2. Cópialo también a tu **Google Drive** (o a otro sitio en internet que solo uses tú).
3. Junto a cada copia, ten apuntada la **contraseña** (en papel o en tu gestor de contraseñas; **no** en un archivo de texto al lado).

## Paso 2.5. Guardar la clave en GitHub como «secretos»

GitHub necesita la clave para firmar la app, pero la guarda cifrada: **nadie puede leerla**, ni siquiera tú después de guardarla.

1. En PowerShell, pega esta línea y pulsa **Intro**. **No verás nada**, pero la clave queda **copiada** como un texto muy largo:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\Documents\atril-release.keystore")) | Set-Clipboard
```

2. **Sin copiar nada más entretanto**, ve a tu repositorio en GitHub → **Settings** → en la columna izquierda **Secrets and variables** → **Actions**.
3. Pulsa el botón verde **New repository secret**.
4. **Name:** `ANDROID_KEYSTORE_BASE64` → **Secret:** pega con **Ctrl + V** (se pega un texto larguísimo; es correcto) → **Add secret**.
5. Repite **New repository secret** tres veces más:

| Name (exactamente así) | Secret |
| --- | --- |
| `ANDROID_KEYSTORE_PASSWORD` | Tu contraseña |
| `ANDROID_KEY_ALIAS` | `atril` |
| `ANDROID_KEY_PASSWORD` | Tu contraseña (la misma) |

6. ✅ **Qué deberías ver:** en la lista **Repository secrets** aparecen los **4 nombres**. Si te equivocas en uno, pulsa el lápiz a su lado y vuelve a escribirlo.

---

# ETAPA 3 — Publicar la versión base 1.0.0 (gratis)

Al publicar una versión, GitHub **fabrica solo** todos los instaladores y la web.

## Paso 3.1. Crear la versión

1. Ve a la página principal de tu repositorio.
2. En la columna de la derecha, busca **Releases** y pulsa **Create a new release**.
3. Pulsa **Choose a tag**, escribe exactamente `v1.0.0` (con la **v** minúscula delante) y pulsa **+ Create new tag: v1.0.0 on publish**.
4. **Release title:** `Atril PDF 1.0.0`
5. En el cuadro grande de descripción, pega esto:

```text
Primera versión de Atril PDF, tu atril digital. Hecho por un músico para todos los músicos.

Descarga:
- Windows: el archivo que termina en win-x64.exe
- Mac: el archivo .dmg
- Linux: el .AppImage o el .deb
- Android: el archivo .apk
- iPhone y iPad: abre https://marcoshernandezparraga.github.io/atril-pdf/ en Safari y pulsa Compartir → «Añadir a pantalla de inicio».

Gratis, sin anuncios, sin cuentas y sin conexión.
```

6. Deja marcado **Set as the latest release**.
7. Pulsa el botón verde **Publish release**.

## Paso 3.2. Esperar a que se fabrique todo (unos 40 minutos)

1. Pulsa la pestaña **Actions**.
2. Verás la tarea **Release** (los instaladores) trabajando, con un **círculo amarillo**. Tarda unos 30-40 minutos.
3. Cuando termine con un **✓ verde**, empieza sola otra tarea, **Web (GitHub Pages)**, que publica la versión web en unos 5 minutos.
4. Si alguna tiene una **✗ roja**: no pasa nada grave, **avísame** y lo arreglo.

## Paso 3.3. Comprobar el resultado

Vuelve a **Releases** → **Atril PDF 1.0.0**. Abajo, en **Assets**, deben aparecer estos archivos:

| Sistema | Archivo |
| --- | --- |
| Windows | `Atril.PDF-1.0.0-win-x64.exe` (instalador), versión `arm64` y `.appx` (para la Microsoft Store) |
| Mac | `Atril.PDF-1.0.0-mac-universal.dmg` |
| Linux | `….AppImage` y `….deb` |
| Android | `AtrilPDF-v1.0.0-android.apk` (instalar directamente) y `AtrilPDF-v1.0.0-android.aab` (para Google Play) |
| Todos | `SHA256SUMS.txt` (las «huellas» para comprobar que nadie ha cambiado los archivos) |

*(GitHub cambia los espacios por puntos: «Atril PDF» aparece como «Atril.PDF».)*

Y abre **https://marcoshernandezparraga.github.io/atril-pdf/**: debe aparecer la app en el navegador.

## Paso 3.4. Quitar las versiones de prueba de tus aparatos

Las versiones de prueba que te envié **no llevan tu firma definitiva**:

- **Android:** desinstala la de prueba (mantén pulsado el icono → **Desinstalar**) y luego instala el `.apk` nuevo. Si no la desinstalas, Android no deja instalar la nueva.
- **Windows:** borra la carpeta de la versión de prueba (la del `.zip`) e instala el `.exe` nuevo.

---

# ETAPA 4 — Repartir la app (gratis)

Con la etapa 3 terminada, **la app ya está publicada para todo el mundo**. Estos son tus dos enlaces:

- **Descargas (Windows, Mac, Linux y Android):** https://github.com/MarcosHernandezParraga/atril-pdf/releases/latest
- **Web (iPhone, iPad y cualquier navegador):** https://marcoshernandezparraga.github.io/atril-pdf/

### Mensaje listo para enviar por WhatsApp o correo

> 🎼 **Atril PDF — tu atril digital, gratis y sin anuncios.**
> Para Windows, Mac, Linux o Android, descárgalo aquí: https://github.com/MarcosHernandezParraga/atril-pdf/releases/latest
> En iPhone o iPad: abre https://marcoshernandezparraga.github.io/atril-pdf/ en Safari y pulsa Compartir → «Añadir a pantalla de inicio».
> Hecho por un músico para todos los músicos.

### Cómo se instala en cada sitio (para explicárselo a quien pregunte)

- **Windows:** doble clic en el `.exe`. Si sale **«Windows protegió su PC»**: **Más información → Ejecutar de todas formas** (sale con cualquier programa nuevo sin certificado de pago; desaparece con la Microsoft Store, etapa 5).
- **Mac:** abrir el `.dmg` y arrastrar Atril PDF a **Aplicaciones**. La primera vez: intentar abrirla, luego **Ajustes del Sistema → Privacidad y seguridad → Abrir igualmente**.
- **Linux:** el `.AppImage` (clic derecho → Propiedades → Permisos → «Permitir ejecutar») o el `.deb` (doble clic) en Ubuntu, Debian o Linux Mint. **No tienes que hacer nada más para Linux.**
- **Android:** descargar el `.apk` desde el móvil, abrirlo y permitir **«instalar de esta fuente»**. Si sale **Play Protect**: **Más detalles → Instalar de todas formas**. Para que se actualice sola sin Google Play: la app gratuita **Obtainium**, con la dirección `https://github.com/MarcosHernandezParraga/atril-pdf` (guía 07).
- **iPhone / iPad:** en **Safari**, abrir la web → botón **Compartir** (cuadrado con flecha) → **Añadir a pantalla de inicio**. Funciona sin internet después de abrirla una vez.

Explicación completa con más detalle: guías **02** (descargas), **03** (web), **06** (Linux) y **07** (Android sin Google Play).

> **Aviso para el futuro (Android):** Google está empezando a exigir que quien publica apps de Android **fuera** de Google Play también verifique su identidad. A 1 de noviembre de 2026 solo se aplica en Brasil, Indonesia, Singapur y Tailandia; Google ha anunciado que llegará al resto del mundo más adelante. Cuando llegue a España, habrá que registrar la app en la consola de desarrolladores de Android (si para entonces tienes Google Play, desde tu misma cuenta).

---

# ETAPA 5 — Microsoft Store (gratis para particulares)

**Ventaja:** desaparece el aviso «Windows protegió su PC», la app se actualiza sola y aparece en la tienda de Windows. Además, quien la tenga en la tienda también podrá instalarla con `winget` sin que tengas que hacer nada más.

## Paso 5.1. Crear la cuenta (1-3 días de espera)

1. Entra en **https://storedeveloper.microsoft.com** → **Get started**.
2. Elige **Individual** (particular).
3. Inicia sesión con una cuenta de Microsoft (Outlook o Hotmail; si no tienes, se crea allí gratis).
4. **Publisher display name:** `Marcos Hernández Párraga`.
5. Verifica tu identidad con **foto del DNI** y un **selfi** con el móvil.
6. Espera el correo de aprobación.

## Paso 5.2. Reservar el nombre y copiar la «identidad»

1. Entra en **https://partner.microsoft.com/dashboard** → **Apps y juegos** → **+ Nueva aplicación** (tipo **MSIX o PWA**).
2. Escribe `Atril PDF` → **Reservar nombre del producto**.
3. En la columna izquierda: **Administración del producto → Identidad del producto**. Verás dos datos:
   - **Package/Identity/Name** (algo como `12345MarcosHernandez.AtrilPDF`)
   - **Package/Identity/Publisher** (algo como `CN=ABCD1234-…`)
4. En GitHub: **Settings → Secrets and variables → Actions** → pestaña **Variables** (¡no Secrets!) → **New repository variable**:
   - Name `MS_STORE_IDENTITY_NAME` → el primer dato, copiado exacto.
   - Name `MS_STORE_PUBLISHER` → el segundo dato, copiado exacto.

## Paso 5.3. Volver a fabricar el paquete de la tienda con tu identidad

1. En GitHub, pestaña **Actions** → en la izquierda **Release** → pulsa la tarea **v1.0.0**.
2. Arriba a la derecha: **Re-run all jobs** → confirma.
3. Espera el **✓ verde** (unos 40 minutos). El archivo **`.appx`** de la versión 1.0.0 se sustituye por uno con tu identidad.
   *Si después la tienda dice que la identidad no coincide, avísame y preparo una versión 1.0.1.*

## Paso 5.4. Rellenar la ficha y enviar

En Partner Center pulsa **Iniciar envío** y rellena cada apartado. Las respuestas exactas están en la **guía 04**; lo principal:

- **Precio:** Gratis. **Mercados:** todos. **Visibilidad:** pública.
- **Categoría:** Música.
- **Política de privacidad:** `https://github.com/MarcosHernandezParraga/atril-pdf/blob/main/docs/PRIVACIDAD.md`
- **¿Recoge datos personales?:** No.
- **Clasificación por edades:** responde **No** a todo → sale **PEGI 3**.
- **Paquetes:** descarga el `.appx` de la versión 1.0.0 en GitHub y arrástralo aquí.
- **Textos:** cópialos de la **guía 12**. Capturas: te las preparo.

Pulsa **Enviar a la Store**. La revisión tarda de 1 a 3 días y te llega un correo con el enlace de la tienda.

---

# ETAPA 6 — Google Play (25 USD una sola vez)

Calcula **unas 3 semanas**, porque Google obliga a una prueba de 14 días con 12 personas. **Consejo:** empieza a buscar a esas 12 personas ya.

1. **Cuenta:** https://play.google.com/console/signup → **Personal** → paga **25 USD** → verifica tu DNI y tu teléfono. Cuando pregunte si eres **comerciante (trader)**: si no ganas dinero con la app, responde **No**.
2. **Crear aplicación:** nombre `Atril PDF`, idioma **Español (España)**, **Aplicación**, **Gratuita** (⚠️ luego no se puede cambiar).
3. **Configurar tu aplicación:** responde a la lista de tareas con la tabla de la **guía 08**. Lo principal: sin anuncios, **no recoge datos**, para mayores de 13 años, clasificación PEGI 3.
4. **Ficha de Play Store:** textos de la **guía 12**; icono, gráfico y capturas ya están en `fastlane/metadata/android/`.
5. **Prueba cerrada:** reúne **12 personas con Android** y su correo de Gmail → **Probar y publicar → Prueba cerrada → Crear canal** → añade sus correos → **Crear versión** → sube el archivo **`AtrilPDF-v1.0.0-android.aab`** de GitHub → acepta la **firma de apps de Google Play** (opción recomendada) → **Iniciar lanzamiento**.
6. Envía a los 12 el **enlace para unirse**: cada uno lo abre, pulsa **Convertirse en tester** e instala la app. Tienen que tenerla instalada **14 días seguidos**.
7. Pasados los 14 días: **Panel → Solicitar acceso de producción**, respondes unas preguntas sobre la prueba y Google contesta en unos días.
8. Con el acceso: **Producción → Crear versión** → sube el mismo `.aab` → **Iniciar lanzamiento**.

Todos los detalles, en la **guía 08**.

---

# ETAPA 7 — App Store de Apple (99 USD al año)

**No necesitas un Mac**: la versión de Apple se fabrica en internet con un servicio gratuito llamado **Expo**. Mientras no la hagas, iPhone y iPad ya tienen la **versión web** (etapa 4).

1. **Cuenta de Apple Developer:** en el iPhone o iPad instala la app **Apple Developer** → **Cuenta → Inscribirse** → como **Individual** → verifica tu DNI → paga **99 USD**.
2. **Cuenta de Expo (gratis):** https://expo.dev/signup → **Settings → Access tokens → Create token** (nombre `github`) → guárdalo en GitHub como secreto **`EXPO_TOKEN`**.
3. **La primera compilación la hacemos juntos**, en directo, desde tu ordenador (hay que entrar en tu cuenta de Apple una vez).
4. Después: crear la app en **App Store Connect**, rellenar la ficha (textos en la guía 12) y enviarla a revisión (1-2 días).

Todos los detalles, en la **guía 09**. Si un conservatorio o asociación quisiera publicarla en su cuenta sin pagar la cuota, mira la **guía 10**.

---

# Lo que no hace falta hacer ahora

- **winget** (instalar en Windows escribiendo una orden): si haces la Microsoft Store, ya funciona solo con `winget install "Atril PDF" --source msstore`. La guía 05 explica cómo añadirla también desde GitHub, si algún día quieres.
- **Flathub** (Linux), **F-Droid** e **IzzyOnDroid** (Android): son tiendas de software libre con normas propias sobre cómo se fabrica y se desarrolla cada app. Antes de enviar nada, lee el apartado final del [índice](README.md). Mientras tanto, AppImage, `.deb` y Obtainium dan lo mismo a los usuarios.
- **Certificados de pago** para Windows o Mac: no hacen falta. La Microsoft Store y el App Store ya firman la app.

---

# Cada vez que quieras sacar una versión nueva

1. Me pides los cambios. Yo los hago, los pruebo y subo el número de versión (por ejemplo, a `1.1.0`).
2. Tú creas la versión en GitHub como en la **etapa 3**, con la etiqueta nueva (`v1.1.0`).
3. Las descargas, la web y Obtainium se actualizan solos. En las tiendas, subes el archivo nuevo (`.appx`, `.aab`) en «Actualizar» o «Crear versión».

---

# Cosas que nunca debes hacer

- ❌ Pasar a nadie tus contraseñas, tus códigos de verificación o el archivo `atril-release.keystore`.
- ❌ Borrar tu clave de firma o perder su contraseña.
- ❌ Guardar contraseñas o claves **dentro** del proyecto: solo como **secretos** de GitHub.
- ❌ Marcar la app como **de pago** en Google Play (después no se puede volver a gratis).
- ❌ Instalar Atril PDF desde enlaces que no sean los tuyos: solo tu GitHub y las tiendas oficiales.

---

# Lista final de comprobación

**Obligatorio (gratis):**

- [ ] Cuenta de GitHub con verificación en dos pasos y códigos de recuperación guardados.
- [ ] Repositorio `atril-pdf` creado, público y con el código subido.
- [ ] Decidido el correo que se ve (A o B).
- [ ] Pages en **GitHub Actions**.
- [ ] Avisos de seguridad privados activados.
- [ ] Clave de firma creada, con **dos copias** y la contraseña apuntada.
- [ ] Los **4 secretos** de Android guardados en GitHub.
- [ ] Versión **v1.0.0** publicada, con todos los archivos y la web funcionando.
- [ ] Versiones de prueba desinstaladas de tus aparatos.
- [ ] Enlaces enviados a tus alumnos y compañeros.

**Tiendas (cuando quieras):**

- [ ] Microsoft Store (gratis).
- [ ] Google Play (25 USD + 12 personas × 14 días).
- [ ] App Store (99 USD al año, o a través de un centro: guía 10).

---

# Si algo sale mal

- Una **✗ roja** en Actions → avísame.
- Una pantalla que no entiendes → hazle una **captura** (Windows: tecla **Windows + Mayús + S**) y envíamela. **Tapa** antes cualquier contraseña o código.
- Un correo de una tienda pidiendo cambios → reenvíamelo o cópiamelo tal cual.
