# 6. Linux (gratis)

Cada versión publicada en GitHub incluye dos formatos para Linux. No tienes que hacer nada más que publicar la versión (guía 01, paso 5).

| Archivo | Para quién | Cómo se instala |
| --- | --- | --- |
| `Atril.PDF-…-linux-x86_64.AppImage` | Cualquier distribución | Se descarga, se le da permiso de ejecución y se abre. No instala nada en el sistema. |
| `Atril.PDF-…-linux-amd64.deb` | Ubuntu, Debian, Linux Mint, Pop!_OS… | Doble clic, o `sudo apt install ./Atril*.deb`. Aparece en el menú de aplicaciones y en «Abrir con» de los PDF. |

También hay versiones `arm64` (para ordenadores ARM y algunas placas).

## Instrucciones para compartir

**AppImage:**
1. Descarga el archivo `.AppImage`.
2. Clic derecho → **Propiedades → Permisos** → marca **Permitir ejecutar el archivo como un programa**.
3. Doble clic para abrir.

*(En la terminal: `chmod +x Atril*.AppImage && ./Atril*.AppImage`)*

**Ubuntu / Debian (.deb):**

```bash
sudo apt install ./Atril*amd64.deb
```

Para desinstalar: `sudo apt remove atril-pdf`.

## ¿Y Flathub? (la «tienda» más usada en Linux)

No lo recomiendo por ahora, por dos motivos:

1. **Exige compilar todo desde el código fuente** dentro de sus servidores, sin internet, y no admite los instaladores ya fabricados. Para una app como esta (React Native + Electron) eso supone un trabajo de empaquetado grande y delicado.
2. **Su norma sobre inteligencia artificial** (vigente desde septiembre de 2026): hay que declarar qué partes se han hecho con IA, el paquete de Flathub no puede estar hecho con IA, y los revisores pueden rechazar la app según cuánto se haya usado. Atril PDF se ha programado con ayuda de un asistente de IA, así que habría que declararlo y el paquete tendría que escribirlo una persona.

Con el AppImage y el `.deb` cualquier usuario de Linux puede usar la app sin problemas. Si más adelante quieres intentarlo en Flathub, lo correcto es declararlo con transparencia y que el paquete lo prepare una persona (por ejemplo, alguien de la comunidad que se ofrezca).
