# 5. winget: instalar en Windows con una orden (gratis, opcional)

`winget` es el «gestor de programas» que trae Windows 10 y 11. Si Atril PDF está en su catálogo, cualquiera puede instalarla escribiendo:

```powershell
winget install "Atril PDF"
```

Es útil para profesores de informática o centros que instalan programas en muchos ordenadores a la vez. **No es imprescindible.**

---

## Antes de empezar

- Tiene que haber una versión publicada en GitHub con el instalador `.exe` (guía 01, paso 5).
- **Aviso:** como el instalador aún no tiene certificado de pago, el antivirus de Microsoft que revisa el catálogo podría pedir más comprobaciones. Si la app ya está en la Microsoft Store (guía 04), es más sencillo: winget también instala desde la Store con `winget install "Atril PDF" --source msstore`, sin hacer nada más.

## Pasos (la primera vez)

1. En tu ordenador, botón Inicio → escribe `PowerShell` → Intro.
2. Instala la herramienta que prepara la ficha:

```powershell
winget install Microsoft.WingetCreate
```

3. Cierra y abre otra ventana de PowerShell. Escribe (cambia `0.3.0` por la versión publicada):

```powershell
wingetcreate new "https://github.com/MarcosHernandezParraga/atril-pdf/releases/download/v0.3.0/Atril.PDF-0.3.0-win-x64.exe"
```

   *El nombre exacto del archivo lo ves en la página de la versión: clic derecho sobre el `.exe` → «Copiar dirección del enlace».*

4. Te hará preguntas. Respuestas:
   - **PackageIdentifier:** `MarcosHernandezParraga.AtrilPDF`
   - **Publisher:** `Marcos Hernández Párraga`
   - **PackageName:** `Atril PDF`
   - **License:** `MIT`
   - **ShortDescription:** `Lector de partituras PDF libre y gratuito`
   - Lo demás: pulsa Intro para aceptar lo que proponga.
5. Al final pregunta si quieres enviarlo (**Submit**): responde **Sí**. Te pedirá iniciar sesión en GitHub en el navegador.
6. Se abre una «petición» en el catálogo de Microsoft. Unos robots la revisan (1–3 días). Si piden algo, te llega un correo: reenvíamelo.

## Versiones siguientes

```powershell
wingetcreate update MarcosHernandezParraga.AtrilPDF --version 0.4.0 --urls "https://github.com/.../Atril.PDF-0.4.0-win-x64.exe" --submit
```

(Si lo prefieres, dímelo y lo automatizo para que se haga solo con cada versión.)
