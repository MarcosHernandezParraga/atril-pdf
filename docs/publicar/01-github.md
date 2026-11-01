# 1. GitHub: el punto de partida (gratis)

GitHub es una web gratuita donde se guarda el proyecto. Cuando el código está allí, **GitHub fabrica solo** los instaladores de Windows, Mac, Linux y Android, y publica la versión web. Sin este paso no se puede publicar en ningún sitio.

---

## Paso 1. Crear el repositorio (5 minutos)

1. Entra en **https://github.com/new** e inicia sesión como `MarcosHernandezParraga`.
2. **Repository name:** escribe exactamente `atril-pdf`
3. **Description:** `Tu atril digital: lector de partituras PDF libre y gratuito`
4. Marca **Public**.
5. **No** marques nada más (ni README, ni .gitignore, ni license): ya están hechos.
6. Pulsa el botón verde **Create repository**.
7. Verás una página titulada «Quick setup». **Avísame** y subo el código.

## Paso 2. Decidir qué correo se ve

Cada cambio del proyecto lleva tu nombre y un correo, y en un proyecto público se ven. Tienes dos opciones:

- **Usar tu Gmail** (`marcos.hernandezparraga@gmail.com`): no tienes que hacer nada.
- **Ocultarlo:** entra en **https://github.com/settings/emails**, marca **Keep my email addresses private** y pásame la dirección que aparece (termina en `@users.noreply.github.com`).

## Paso 3. Activar la versión web (GitHub Pages)

Cuando el código esté subido:

1. En tu repositorio, pulsa **Settings** (arriba a la derecha, con un engranaje).
2. En la columna izquierda, pulsa **Pages**.
3. En **Build and deployment → Source**, elige **GitHub Actions**.
4. Ya está. La web se publicará en `https://marcoshernandezparraga.github.io/atril-pdf/` cada vez que saques una versión (paso 5), o cuando quieras desde **Actions → Web (GitHub Pages) → Run workflow**.

## Paso 4. Activar los avisos de seguridad privados

1. **Settings → Security** (en la columna izquierda, «Code security» o «Advanced Security»).
2. Activa **Private vulnerability reporting** (Enable).

Así, si alguien encuentra un fallo de seguridad, te lo comunica en privado.

## Paso 5. Sacar una versión (cada vez que quieras publicar)

1. En tu repositorio, columna derecha → **Releases** → **Draft a new release** (o «Create a new release»).
2. Pulsa **Choose a tag**, escribe `v0.3.0` (el número de la versión) y pulsa **Create new tag**.
3. **Release title:** `Atril PDF 0.3.0`
4. En la descripción puedes pegar las novedades (las tienes en `CHANGELOG.md`).
5. Pulsa **Publish release**.
6. Espera unos **30–40 minutos**. En la pestaña **Actions** verás círculos amarillos (trabajando) que pasarán a ✓ verde (terminado). Al final, en la página de la versión aparecerán:
   - **Windows:** `Atril.PDF-0.3.0-win-x64.exe` (instalador) y `.appx` (para la Microsoft Store)
   - **Mac:** `Atril.PDF-0.3.0-mac-universal.dmg`
   - **Linux:** `….AppImage` y `….deb`
   *(GitHub cambia los espacios de los nombres por puntos: «Atril PDF» aparece como «Atril.PDF».)*
   - **Android:** `AtrilPDF-v0.3.0-android.apk` (para instalar directamente) y `….aab` (para Google Play)
   - **`SHA256SUMS.txt`**: las «huellas» para comprobar que nadie ha modificado los archivos.
   - Y la versión web se actualiza sola.

> Si algún círculo sale en **rojo ✗**, no pasa nada grave: avísame y lo miro.

## Paso 6. Guardar «secretos» (claves) cuando haga falta

Algunas guías te pedirán guardar una clave como **secreto**. Siempre es igual:

1. En tu repositorio: **Settings → Secrets and variables → Actions**.
2. Pestaña **Secrets** → botón verde **New repository secret**.
3. **Name:** el nombre exacto que diga la guía. **Secret:** el valor. Pulsa **Add secret**.

Los secretos no los puede ver nadie (tampoco yo), ni siquiera tú después de guardarlos: solo los usa GitHub al fabricar la app.

Para valores que no son secretos (por ejemplo, los datos de la Microsoft Store) se usa la pestaña **Variables** → **New repository variable**.

---

### Comprobación final

- [ ] Repositorio `atril-pdf` creado y público.
- [ ] Pages en «GitHub Actions».
- [ ] Avisos de seguridad privados activados.
- [ ] Primera versión publicada y con todos los archivos.
