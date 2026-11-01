# 4. Microsoft Store (Windows) — gratis para particulares

Desde 2025 la cuenta de desarrollador de Microsoft es **gratuita para particulares** (solo hay que verificar la identidad). Publicar en la Microsoft Store tiene una gran ventaja: **desaparece el aviso «Windows protegió su PC»**, porque Microsoft firma la app.

Tiempo total: 1 hora de trabajo + 1 a 3 días de espera para la verificación + 1 a 3 días de revisión.

---

## Paso 1. Crear la cuenta de desarrollador

1. Entra en **https://storedeveloper.microsoft.com** y pulsa **Get started / Empezar**.
2. Elige **Individual (particular)**.
3. Inicia sesión con una cuenta de Microsoft (Outlook/Hotmail). Si no tienes, se crea allí gratis.
4. Rellena tus datos. **Nombre para mostrar del publicador (Publisher display name):** `Marcos Hernández Párraga`.
5. Verifica tu identidad: te pedirá una **foto del DNI** y un **selfi** con el móvil.
6. Espera el correo de aprobación (1–3 días).

## Paso 2. Reservar el nombre

1. Entra en **https://partner.microsoft.com/dashboard** → **Apps y juegos** → **+ Nueva aplicación** (o «New product → MSIX or PWA app»).
2. Escribe **Atril PDF** y pulsa **Reservar nombre del producto**.
   *Si estuviera cogido, prueba «Atril PDF — partituras».*

## Paso 3. Copiar los datos de identidad a GitHub

1. Dentro de la app, en la columna izquierda: **Administración del producto → Identidad del producto (Product identity)**.
2. Verás estos dos datos. Cópialos **exactamente**:
   - **Package/Identity/Name** (algo como `12345MarcosHernandez.AtrilPDF`)
   - **Package/Identity/Publisher** (algo como `CN=ABCD1234-…`)
3. En GitHub, en tu repositorio: **Settings → Secrets and variables → Actions → pestaña Variables → New repository variable**:
   - Name `MS_STORE_IDENTITY_NAME` → el primer dato.
   - Name `MS_STORE_PUBLISHER` → el segundo dato.
   *(Son «variables», no «secretos»: no son contraseñas.)*
4. Saca una versión nueva (guía 01, paso 5). Entre los archivos aparecerá **`Atril.PDF-…-win-x64.appx`**: ese es el paquete para la tienda.

## Paso 4. Rellenar la ficha (lo que verá la gente)

En Partner Center, pulsa **Iniciar envío (Start submission)** y rellena cada apartado:

**Precios y disponibilidad**
- Mercados: **todos**.
- Precio: **Gratis**.
- Visibilidad: **Pública**.

**Propiedades**
- Categoría: **Música** (subcategoría si la pide: *Productividad* o *Educación* también valen).
- Política de privacidad: `https://github.com/MarcosHernandezParraga/atril-pdf/blob/main/docs/PRIVACIDAD.md`
- Sitio web: `https://github.com/MarcosHernandezParraga/atril-pdf`
- Contacto de soporte: tu correo o `https://github.com/MarcosHernandezParraga/atril-pdf/issues`
- Requisitos del sistema: marca **Teclado** y **Ratón** como «compatibles», y **Táctil** como compatible.
- «¿Accede, recopila o transmite información personal?»: **No**.

**Clasificación por edades**
- Rellena el cuestionario (IARC). Responde **No** a todo (no hay violencia, chat, compras, ubicación, ni intercambio de datos). Saldrá **PEGI 3 / Para todos**.

**Paquetes**
- Arrastra el archivo **`.appx`** (los de x64 y arm64 si están los dos).

**Descripciones de Store** (español y añade inglés)
- Copia los textos de la guía 12.
- Capturas: al menos 1 (recomendado 4) de 1366×768 o más. Te las preparo yo.
- Logotipo de la tienda: se usa el icono del paquete; si pide uno aparte (300×300), está en `assets/web/icon-512.png`.

**Notas para la certificación** (cuadro de texto para los revisores):

> Free, open-source (MIT) PDF sheet music reader. Works fully offline: no network access, no accounts, no data collection. To test: click "Abrir / Importar" and choose any PDF.

## Paso 5. Enviar

Pulsa **Enviar a la Store (Submit to the Store)**. La revisión tarda de 1 a 3 días. Recibirás un correo cuando esté publicada, con el enlace de la tienda.

## Actualizaciones

Cada versión nueva: abre la app en Partner Center → **Actualizar** → sube el nuevo `.appx` → **Enviar**. El número de versión aumenta solo.

---

### Si algo sale mal

- **«El nombre de la identidad no coincide»**: revisa que las dos variables del paso 3 estén copiadas sin espacios.
- **Rechazo por «funcionalidad»**: suele pedirse explicar cómo probar la app; usa la nota del paso 4.
- Cualquier otro mensaje: cópiamelo tal cual.
