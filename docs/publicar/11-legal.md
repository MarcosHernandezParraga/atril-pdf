# 11. Cumplir la ley y las normas de las tiendas

*Orientación general a 1 de noviembre de 2026, para una app **gratuita**, **sin anuncios** y **sin recogida de datos**, publicada por un particular en España. No es asesoramiento jurídico: si algún día cobras por la app o la publica una empresa, consulta con un profesional.*

---

## 1. Licencia y autoría ✅ (hecho)

- El código es tuyo y se publica con **licencia MIT** (archivo `LICENSE`): cualquiera puede usarlo, copiarlo y modificarlo, siempre que mantenga el aviso «Copyright (c) 2026 Marcos Hernández Párraga». La licencia también aclara que el programa se ofrece «tal cual», sin garantía.
- Todas las piezas de otros autores tienen licencias compatibles (MIT, BSD, Apache 2.0, ISC, OFL para tipografías). **Ninguna** es GPL, AGPL ni de pago. La lista completa está en `THIRD_PARTY_LICENSES.md` y dentro de la app (**Ajustes → Acerca de**). Se comprueba automáticamente en cada cambio.
- Dentro de la app y en las fichas aparece **«Hecho por Marcos Hernández Párraga»**.

## 2. Protección de datos (RGPD) ✅ (hecho)

- La app **no recoge, no envía y no guarda fuera del aparato** ningún dato personal. Tú, como autor, **no tratas datos de nadie**, así que no tienes que registrar nada ni nombrar responsables.
- Las tiendas exigen igualmente una **política de privacidad** pública: ya está en `docs/PRIVACIDAD.md` (español e inglés). Su dirección es:
  `https://github.com/MarcosHernandezParraga/atril-pdf/blob/main/docs/PRIVACIDAD.md`
- En los formularios de las tiendas responde siempre **«no se recogen datos»** (Google Play: «Seguridad de los datos»; Apple: «Datos no recopilados»).
- Si algún día añades algo que use internet (por ejemplo, estadísticas o informes de errores), **habría que actualizar** la política y los formularios antes de publicarlo.

## 3. Menores ✅

- Clasificación: **PEGI 3 / 4+ / Para todos**. No hay compras, anuncios, chat ni datos, así que la app es apta para estudiantes de cualquier edad.
- En Google Play, para evitar requisitos extra de «apps para familias», se recomienda indicar **público de 13 años o más** (la app la puede usar igualmente alumnado más joven; ver guía 08).

## 4. Ley de Servicios Digitales de la UE (DSA): «comerciante» o no

Google Play y el App Store preguntan si eres **comerciante (trader)**. Si lo eres, publican tu **dirección, teléfono y correo** en la ficha.

- Si publicas la app **gratis, sin anuncios, sin compras y sin relación con tu actividad profesional**, lo normal es declararte **«no comerciante»**.
- Si la app la publica un **conservatorio o asociación** (guía 10), será la organización quien responda según su situación.
- Si algún día cobras por ella o la usas para tu negocio, tendrías que declararte comerciante.

## 5. Derechos de autor de las partituras

- Atril PDF **no incluye ni distribuye partituras**: cada persona abre sus propios archivos.
- Es responsabilidad de cada usuario tener derecho a usar los PDF que importa. Las capturas y vídeos promocionales deben usar **partituras propias o de dominio público** (las de prueba del proyecto son tuyas: «Estudio para piano», «Melodía de prueba»).
- No uses en las fichas logotipos o nombres de marcas ajenas (por ejemplo, de editoriales o fabricantes de pedales) como si fueran colaboradores. Mencionar que funciona con pedales Bluetooth en general es correcto.

## 6. El nombre «Atril PDF»

- Antes de invertir en promoción, conviene comprobar que nadie tiene registrada la marca: búsqueda gratuita en **OEPM** (https://consultas2.oepm.es/LocalizadorWeb) y **EUIPO** (https://euipo.europa.eu/eSearch). «Atril» es una palabra común, lo que suele ser difícil de registrar en exclusiva, pero mejor comprobarlo.
- Registrar la marca es opcional (y de pago); no hace falta para publicar.

## 7. Exportación y cifrado

La app no usa cifrado propio (solo el del sistema). En Apple ya está declarado (`ITSAppUsesNonExemptEncryption = false`), así que no hay trámites de exportación.

## 8. Impuestos

Una app gratuita, sin ingresos, **no genera obligaciones fiscales**. Si algún día recibes dinero (venta, donaciones), consulta cómo declararlo.

## 9. Accesibilidad

La normativa europea de accesibilidad (en vigor desde junio de 2025) obliga a empresas que ofrecen ciertos servicios; no se aplica a una app gratuita de un particular. Aun así, Atril PDF incluye etiquetas para lectores de pantalla en sus botones, textos con buen contraste, modo oscuro y botones grandes, que es lo recomendable.

## 10. Normas de las tiendas sobre inteligencia artificial

- **Google Play, App Store y Microsoft Store** no exigen declarar si el código se ha escrito con ayuda de IA (sus normas sobre IA se refieren a apps que *generan* contenido con IA, que no es el caso).
- **Flathub** exige declararlo e **IzzyOnDroid** lo rechaza (guías 06 y 07). No es legalmente obligatorio, pero son sus normas: si publicas allí, hay que cumplirlas con transparencia.

---

### Lista de comprobación antes de publicar en cualquier tienda

- [ ] Política de privacidad enlazada.
- [ ] Formulario de datos: «no se recogen datos».
- [ ] Clasificación por edades rellenada (PEGI 3 / 4+).
- [ ] Estado de comerciante declarado (DSA).
- [ ] Capturas con partituras propias o de dominio público.
- [ ] Textos revisados (guía 12).
