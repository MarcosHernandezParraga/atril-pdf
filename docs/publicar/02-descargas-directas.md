# 2. Descarga directa: Windows, Mac, Linux y Android (gratis)

Cuando publicas una versión (guía 01, paso 5), los instaladores aparecen en la página **Releases** de tu repositorio:

**https://github.com/MarcosHernandezParraga/atril-pdf/releases/latest**

Ese enlace es el que puedes pasar a alumnos, compañeros, bandas y conservatorios. Siempre lleva a la última versión.

Abajo tienes cómo se instala en cada sistema, para que puedas explicárselo a cualquiera (o copiarlo en un mensaje).

---

## Windows

1. Descarga **`Atril.PDF-…-win-x64.exe`** (o `…-win-arm64.exe` si el ordenador es ARM, como algunos Surface).
2. Haz doble clic en el archivo descargado.
3. Windows puede mostrar **«Windows protegió su PC»**: pulsa **Más información → Ejecutar de todas formas**.
   *Sale con cualquier programa nuevo que no tenga un certificado de pago; no significa que tenga virus.*
4. Sigue el instalador (**Siguiente → Instalar → Finalizar**). Se crea un acceso directo en el escritorio.
5. Para abrir un PDF con Atril PDF: clic derecho en el PDF → **Abrir con → Atril PDF**.

## Mac

1. Descarga **`Atril.PDF-…-mac-universal.dmg`** (funciona en Mac con Intel y con Apple Silicon).
2. Ábrelo y **arrastra Atril PDF a la carpeta Aplicaciones**.
3. La primera vez, macOS dirá que no puede comprobar el desarrollador. Haz esto **una sola vez**:
   - Intenta abrirla (se cerrará con el aviso).
   - Ve a **Ajustes del Sistema → Privacidad y seguridad**, baja hasta el final y pulsa **Abrir igualmente**.
   - Confirma con tu contraseña.
   *Este aviso desaparece si algún día firmas la app con la cuenta de Apple (guía 09).*

## Linux

- **AppImage** (cualquier distribución): descarga `….AppImage`, clic derecho → **Propiedades → Permisos → Permitir ejecutar como programa**, y doble clic.
- **Ubuntu, Debian, Linux Mint** (`.deb`): descarga el `.deb` y haz doble clic (se abre el instalador de programas), o en la terminal:

```bash
sudo apt install ./Atril*.deb
```

Más detalles en la guía 06.

## Android (tableta o móvil)

1. Desde el móvil o la tableta, descarga **`AtrilPDF-…-android.apk`**.
2. Ábrelo desde **Archivos** o **Descargas**.
3. Si Android dice que no permite instalar apps de esta fuente: pulsa **Ajustes**, activa **Permitir de esta fuente** y vuelve atrás.
4. Pulsa **Instalar**. Si aparece **Google Play Protect**: **Más detalles → Instalar de todas formas**.
5. Para recibir las actualizaciones automáticamente sin Google Play, mira la guía 07 (Obtainium).

> **Importante:** el APK de prueba que te envié antes no está firmado con tu clave definitiva. Cuando publiques la primera versión oficial, **desinstala el de prueba** antes de instalar el nuevo (si no, Android no deja actualizar).

---

## Comprobar que un archivo no ha sido modificado (opcional)

Cada versión incluye **`SHA256SUMS.txt`** con la «huella» de cada archivo.

- **Windows** (PowerShell): `Get-FileHash ".\Atril.PDF-0.2.0-win-x64.exe"`
- **Mac / Linux** (Terminal): `shasum -a 256 nombre-del-archivo`

El número que sale debe ser **idéntico** al de `SHA256SUMS.txt`. Si no lo es, no lo instales.

---

## Texto listo para compartir

> 🎼 **Atril PDF — tu atril digital, gratis y sin anuncios.**
> Descárgalo para Windows, Mac, Linux o Android aquí: https://github.com/MarcosHernandezParraga/atril-pdf/releases/latest
> En iPhone o iPad: abre https://marcoshernandezparraga.github.io/atril-pdf/ en Safari y pulsa Compartir → «Añadir a pantalla de inicio».
> Hecho por un músico para todos los músicos.
