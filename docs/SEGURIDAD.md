# Seguridad de Atril PDF

*Explicado sin tecnicismos. Última revisión: 1 de noviembre de 2026.*

## Lo más importante en tres frases

1. **Todo ocurre dentro de tu aparato.** Atril PDF no tiene servidores, ni cuentas, ni anuncios, ni estadísticas. Tus partituras nunca salen de tu tableta, móvil u ordenador.
2. **La aplicación no puede conectarse a internet.** En Android ni siquiera tiene el permiso para hacerlo; en el ordenador, la conexión está bloqueada desde dentro.
3. **Solo ve los archivos que tú le das.** No puede rebuscar en tu disco ni en tus fotos: solo abre lo que eliges en el selector de archivos o con «Abrir con…».

---

## Qué protecciones tiene cada versión

### Android (tableta y móvil)

- **Ningún permiso.** La aplicación no pide cámara, micrófono, ubicación, contactos ni acceso a tus archivos.
- **Sin internet.** La versión publicada se construye quitando el permiso de internet: aunque alguien quisiera, la aplicación no podría enviar nada.
- **Archivos.** Solo recibe los PDF e imágenes que tú eliges con el selector de Android. Se guarda una copia dentro del espacio privado de la aplicación, que otras aplicaciones no pueden leer.
- **Copia de seguridad de Android.** Si en tu tableta tienes activada la copia de seguridad de Google, Android puede guardar los datos de la aplicación en tu propia cuenta, cifrados. Eso lo controla Android, no Atril PDF; puedes desactivarlo en *Ajustes → Google → Copia de seguridad*.

### Ordenador (Windows, Mac y Linux)

- **La red está bloqueada** desde dentro de la aplicación: cualquier intento de conectarse a internet se cancela.
- **Política de contenido estricta:** la ventana solo puede cargar las piezas de la propia aplicación. No puede cargar páginas web, ni programas de fuera, ni ventanas nuevas.
- **La ventana está «aislada» (sandbox):** la parte que dibuja las partituras no tiene acceso a tu ordenador. Para leer o guardar sus propios archivos tiene que pedírselo a la parte principal, que comprueba cada petición:
  - solo responde a la propia aplicación (no a otras páginas);
  - solo deja tocar la carpeta privada de la biblioteca (no se puede «escapar» a otras carpetas);
  - solo lee archivos de fuera que tú hayas elegido.
- **Sin herramientas de desarrollo** en la versión publicada, y sin «vistas web» incrustadas.
- **Enlaces:** el único enlace que puede abrir tu navegador es el de la página del proyecto en GitHub (desde «Acerca de»).
- **«Fusibles» de Electron:** el programa instalado lleva desactivadas de fábrica las funciones que permitirían usarlo para ejecutar otro código (modo «Node», variables `NODE_OPTIONS`, depuración por línea de órdenes) y solo carga su propio paquete interno.
- **Permisos del sistema:** solo se permite poner la ventana a pantalla completa y copiar al portapapeles. Cámara, micrófono, ubicación, notificaciones… están denegados siempre.

### Versión web (iPhone, iPad y cualquier navegador)

- Funciona dentro del navegador (Safari, Chrome…), que ya aísla cada página del resto del aparato.
- Una vez abierta, funciona **sin conexión**. Tus partituras se guardan en el almacenamiento privado del navegador para esa página; no se suben a ningún sitio.
- La página solo puede cargar sus propias piezas (política de contenido estricta).
- **Ojo:** si borras los «datos de sitios web» del navegador, se borra también tu biblioteca de esa página. Guarda siempre tus PDF originales en otro sitio (por ejemplo, en la app Archivos o en tu ordenador).

---

## PDF con «trampa»

Un PDF puede llevar dentro código o trucos para atacar al programa que lo abre. Atril PDF se protege así:

- **No ejecuta nunca el código que pueda llevar un PDF** (formularios con JavaScript, XFA, etc.). Solo dibuja las páginas.
- El motor de PDF (pdf.js en ordenador y web, y el de Android/Apple en las tabletas) funciona con las opciones más seguras: sin `eval`, sin XFA, sin fuentes del sistema.
- El PDF original **nunca se modifica**: se guarda una copia y todo lo que haces (anotaciones, cambios de páginas) se guarda aparte.
- Los PDF protegidos con contraseña solo se abren si tú escribes la contraseña.

---

## Bibliotecas de terceros

- Todas son de código abierto con licencias permisivas (MIT, BSD, Apache, ISC u OFL). **Ninguna GPL/AGPL ni de pago.** La lista completa está en *Ajustes → Acerca de → Licencias* y en `THIRD_PARTY_LICENSES.md`.
- Revisión con `npm audit` (1 de noviembre de 2026): los avisos que aparecen son de **herramientas de desarrollo** (el programa que construye la aplicación y el que pasa las pruebas). Esas herramientas no van dentro de la aplicación instalada. **No hay avisos en el código que se ejecuta en tu aparato.**
- Sin Firebase, sin servicios de Google o Apple para estadísticas, sin actualizaciones «por aire» (expo-updates).

---

## Comprobar que una descarga es auténtica

Cada versión publicada en GitHub incluye un archivo **`SHA256SUMS.txt`** con la «huella» de cada archivo. Si quieres comprobar que lo que has descargado es exactamente lo publicado:

- **Windows** (PowerShell): `Get-FileHash .\nombre-del-archivo.exe` y compara el número con el de `SHA256SUMS.txt`.
- **Mac / Linux** (Terminal): `shasum -a 256 nombre-del-archivo` y compara.

Si no coinciden, no lo instales.

### ¿Por qué Windows o Mac avisan al instalar?

Porque la aplicación aún no está **firmada con un certificado** (cuesta dinero cada año). El aviso no significa que tenga virus: significa que Windows/Mac no conocen todavía al autor. Si la descargas de la página oficial de GitHub del proyecto (o de la Microsoft Store, Flathub, F-Droid…), es la auténtica. En `docs/publicar/` se explica cómo firmarla más adelante.

---

## Informar de un problema de seguridad

Si encuentras un fallo de seguridad, por favor **no lo publiques** en un mensaje abierto. Usa en GitHub la opción privada: pestaña **Security → Report a vulnerability** del repositorio. Se responderá lo antes posible.

---

## Para quien revise el código (resumen técnico)

| Zona | Medida |
| --- | --- |
| Electron | `contextIsolation`, `sandbox`, `nodeIntegration: false`, `webSecurity`, `webviewTag: false`, `devTools` solo en desarrollo |
| Electron | Protocolo propio `app://atril` con CSP (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`…) y `X-Content-Type-Options: nosniff` |
| Electron | `webRequest` cancela `http(s)://` y `ws(s)://`; `setPermissionRequestHandler` y `setPermissionCheckHandler` con lista blanca mínima |
| Electron | IPC: cada canal comprueba que el emisor es el marco principal de `app://atril/`; rutas confinadas a la biblioteca (`safePath.ts`); archivos externos solo si los eligió el usuario |
| Electron | Navegación, redirecciones, ventanas nuevas y `<webview>` bloqueados; `openExternal` solo `https://github.com` |
| Electron | Fusibles: `RunAsNode`, `NODE_OPTIONS`, `--inspect` desactivados; `OnlyLoadAppFromAsar`; cifrado de cookies; sin privilegios extra para `file://` |
| Android | Sin permisos; `INTERNET` y `ACCESS_NETWORK_STATE` eliminados en la versión publicada (`ATRIL_OFFLINE_BUILD=1`) |
| pdf.js | `isEvalSupported: false`, `enableXfa: false`, `useSystemFonts: false`; sin scripting |
| Publicación | `SHA256SUMS.txt` en cada versión; flujos de GitHub con permisos mínimos; claves solo como secretos |
