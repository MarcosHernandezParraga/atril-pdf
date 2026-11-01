# 10. Publicar en Apple sin pagar, y ¿se puede «vender a Apple»?

## A. La exención de la cuota de Apple (fee waiver)

Apple **perdona la cuota de 99 USD al año** solo a **organizaciones**, nunca a particulares. Según su página de ayuda (consultada el 1 de noviembre de 2026):

- Tiene que ser una **entidad jurídica**: **asociación o fundación sin ánimo de lucro**, **centro educativo acreditado** (por ejemplo, un conservatorio oficial) o **administración pública**.
- **No** puede ser un particular, un autónomo ni una empresa de una sola persona.
- Su condición tiene que estar **reconocida por la autoridad** (registro de asociaciones/fundaciones, o la Consejería/Ministerio de Educación en el caso de un centro).
- Las apps tienen que ser **gratuitas** (sin compras ni suscripciones). ✅ Atril PDF lo es.
- La organización necesita un **número D-U-N-S** (gratuito; se pide desde la propia web de Apple).
- **País:** Apple no publica ahora una lista. Una lista antigua (2020) no incluía España; hay que comprobarlo al hacer la solicitud o preguntando al soporte de Apple. **Hasta que la organización no lo pregunte, no se puede asegurar.**

Fuente: https://developer.apple.com/help/account/membership/fee-waivers/

### Cómo funcionaría

1. Una organización (conservatorio, escuela de música, banda, asociación…) acepta publicar Atril PDF **en su cuenta**.
2. La organización se inscribe en el Apple Developer Program **como organización** y, durante la inscripción, **solicita la exención**.
3. Si Apple la aprueba, la organización te añade a ti en **App Store Connect → Usuarios y acceso** con el rol **Administrador** (o «Gestor de apps»). Así puedes gestionar la app tú.
4. En el App Store aparecerá como vendedor **el nombre de la organización**. En la descripción y dentro de la app seguirá diciendo **«Hecho por Marcos Hernández Párraga»**, y el código seguirá siendo tuyo (licencia MIT).
5. Los pasos técnicos son los de la guía 09, desde el paso 2.

### Carta modelo para proponérselo a un centro o asociación

> Asunto: Propuesta — publicar gratis en el App Store una app de partituras para músicos
>
> Estimado/a [nombre del director/a o presidente/a]:
>
> Soy Marcos Hernández Párraga, músico. He creado **Atril PDF**, un atril digital para leer partituras en tableta, móvil y ordenador: pasar página con pedal Bluetooth, carpetas por concierto, anotaciones con lápiz y funciones pensadas para el atril. Es **gratuita, sin anuncios, sin cuentas y sin recogida de datos**, y su código es abierto (licencia MIT).
>
> Ya está disponible para Android, Windows, Mac, Linux y como web para iPad. Para publicarla en el **App Store de Apple** sin coste, Apple ofrece una **exención de la cuota anual** a centros educativos acreditados y entidades sin ánimo de lucro que publiquen apps gratuitas.
>
> Les propongo que [nombre del centro/asociación] la publique en su cuenta de Apple. Para ustedes supondría:
> - **Coste: ninguno.** La exención cubre la cuota y la app es gratuita.
> - **Trabajo:** inscribirse una vez en el Apple Developer Program como organización (necesita el número D-U-N-S, gratuito) y solicitar la exención. Yo me encargo de todo lo técnico, las actualizaciones y la atención a usuarios.
> - **Imagen:** el centro aparecería como editor de una herramienta gratuita para el alumnado y los músicos.
> - **Sin riesgos de datos:** la app no recoge ningún dato personal.
>
> Si les interesa, les envío una guía con los pasos y estoy a su disposición para una reunión.
>
> Un saludo,
> Marcos Hernández Párraga
> [teléfono] · [correo]
> https://github.com/MarcosHernandezParraga/atril-pdf

---

## B. ¿Se puede «vender» la app a Apple u «ofrecérsela»?

En pocas palabras: **Apple no compra apps a particulares** ni tiene un programa para que se las ofrezcan. Lo que sí existe:

1. **Publicarla en el App Store** (guía 09): es la forma de que llegue a todos los usuarios de iPhone y iPad.
2. **Proponerla al equipo editorial** del App Store para que la destaquen (gratis): https://developer.apple.com/contact/app-store/promote/
3. **Premios Apple Design Awards**: Apple elige a los finalistas entre apps publicadas; no hay inscripción directa.
4. **Ganar dinero**, si algún día lo quisieras: hacerla de pago o con compras dentro de la app. Pero eso **contradice** lo que es ahora (gratuita y sin compras) y, además, impediría la exención del apartado A. Una alternativa compatible es aceptar **donaciones voluntarias** fuera de la app (por ejemplo, con «GitHub Sponsors»), consultando antes las normas de cada tienda y la parte fiscal.

Mi recomendación: mantenerla **gratuita y abierta**, publicarla en la web (guía 03) ya, y buscar un conservatorio o asociación para el App Store (apartado A) o pagar la cuota cuando tenga suficientes usuarios.
