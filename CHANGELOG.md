# Registro de cambios / Changelog

## [1.0.3] — 2026-11-01

### Corregido
- **Microsoft Store:** el nombre del editor en los paquetes de Windows va sin tildes («Marcos Hernandez Parraga»), igual que en la cuenta de la tienda; si no coincide, la tienda rechaza el paquete. Dentro de la app se sigue leyendo «Hecho por Marcos Hernández Párraga».
- La 1.0.2 se publicó con el número de versión sin cambiar (archivos de Windows, Mac y Linux con «1.0.1»). Ahora, si la etiqueta de una versión no coincide con su número, GitHub no fabrica nada y lo avisa.

## [1.0.1] — 2026-11-01

Versión pensada para bibliotecas grandes (cientos de partituras guardadas y partituras de director de cientos de páginas) y para compartir partituras.

### Añadido
- **Compartir** una partitura como PDF, **con tus anotaciones** o **sin ellas** (el original): desde la partitura (arriba; en el móvil, en «⋯») o desde el menú «…» de la biblioteca.
  - iPhone, iPad y Android: ventana de compartir del sistema (correo, WhatsApp, AirDrop, Drive, «Guardar en Archivos»…). En Android, también «Guardar en el dispositivo» en la carpeta que elijas.
  - Navegador: «Enviar…» (donde el navegador lo permite) o «Guardar en el dispositivo».
  - Ordenador: ventana «Guardar como».
  - El PDF sale igual que en la app: páginas en tu orden, márgenes recortados, páginas en blanco o pautadas, imágenes, pentagramas, lápiz, subrayador y texto (en cualquier idioma). Las páginas originales se copian con su calidad completa; si no hay cambios, se comparte el archivo original tal cual.

### Corregido
- **Versión web:** las partituras muy grandes (más de unos 128 MB, por ejemplo escaneadas de cientos de páginas) se quedaban en «Importando…» en Chrome, Edge y Android. Ahora se guardan en trozos de 1 MB, que todos los navegadores aceptan (también Safari en iPhone y iPad).
- **Bibliotecas grandes:** al crear las miniaturas, la app dejaba abiertas todas las partituras y la memoria crecía con cada una (en Android podía agotar los archivos abiertos). Ahora solo hay unas pocas abiertas a la vez: con 453 partituras, el programa de ordenador usa la misma memoria que con 150.
- **Guardado de cambios:** al pasar la app a segundo plano (cambiar de app, bloquear la tableta) los cambios se guardan al instante. Si se cierra la pestaña o la ventana justo después de escribir, el cambio se conserva y se guarda al volver a abrirla.
- **Versión web:** si el navegador no puede guardar algo (por ejemplo, por falta de espacio), ahora se avisa en vez de quedarse esperando, y nunca queda una partitura a medio guardar.
- **Android:** las partituras grandes abiertas desde otras apps (Drive, correo…) se copian por partes, sin cargarlas enteras en memoria.

### Cambiado
- **Web y ordenador:** las partituras grandes se leen por partes, solo las páginas que se ven. Una partitura escaneada de 300 páginas y 384 MB se abre en unos 2 segundos y salta a la última página en medio segundo.
- **Web y ordenador:** un único motor de PDF para todas las partituras: importar 151 partituras de golpe pasa de unos 20 segundos a 2 o 3.
- La lista de partituras solo prepara las tarjetas cercanas a la pantalla.
- **Versión web:** pide al navegador «almacenamiento persistente» para que no borre las partituras aunque el aparato se quede sin espacio (Safari lo concede a la app abierta desde la pantalla de inicio).
- APK de Android la mitad de ligero (procesadores ARM: móviles, tabletas y Chromebooks).
- Windows: un instalador por tipo de procesador.
- La web se publica sola al terminar de fabricarse cada versión.

## [1.0.0] — 2026-11-01 — Primera versión pública

Primera versión publicada para todo el mundo: la **versión base**. Reúne todo lo de las versiones de prueba 0.1.0, 0.2.0 y 0.3.0 (detalladas abajo), que no se llegaron a publicar.

- Lector de partituras PDF con paso de página tocando, deslizando, con teclado o con pedal Bluetooth; media página «estilo atril», vista continua y dos páginas.
- Carpetas-concierto con «Iniciar concierto», arrastrar obras y reordenarlas.
- Lápiz, subrayador, borrador, texto, pentagrama e imágenes sobre la página.
- Zoom con dos dedos o Ctrl + rueda; panel de páginas.
- 21 idiomas con el del dispositivo por defecto.
- Windows, Mac, Linux, Android y versión web instalable en iPhone y iPad. Sin anuncios, sin cuentas, sin conexión y sin recoger datos.

## [0.3.0] — 2026-11-01

### Añadido
- **21 idiomas**: español, inglés, portugués (Brasil y Portugal), francés, alemán, italiano, catalán, gallego, euskera, neerlandés, polaco, rumano, griego, ruso, ucraniano, árabe, chino simplificado y tradicional, japonés y coreano.
- La app usa automáticamente el idioma del dispositivo (o del navegador). En **Ajustes → Idioma** se puede elegir otro; cada idioma aparece escrito en su propia lengua.
- Plurales correctos en cada idioma (ruso, polaco, ucraniano, rumano y árabe tienen varias formas).
- Árabe: los menús, la biblioteca y los ajustes se muestran de derecha a izquierda; la partitura y el lector siguen de izquierda a derecha, como se lee la música.
- Android 13+ e iOS: los idiomas aparecen en el ajuste del sistema «Idioma de la app».

## [0.2.0] — 2026-11-01

### Añadido
- **Zoom**: con dos dedos en tableta y móvil (y un dedo para mover la página ampliada); en el ordenador con Ctrl + rueda, el pellizco del trackpad o Ctrl + / Ctrl − / Ctrl 0. La página se vuelve a dibujar nítida al ampliar. Botón con el porcentaje para volver al 100 %.
- **Panel de páginas** (se abre desde la derecha): miniaturas numeradas; reordenar (mantener pulsado y arrastrar, o flechas), duplicar, eliminar, añadir página en blanco, **otro PDF** (sus páginas se unen al documento) o **una imagen** como página. Todo con deshacer.
- **Pentagrama** de cinco líneas sin clave y **imágenes** sobre la página: se mueven y se cambian de tamaño por las esquinas; duplicar, borrar y «fondo blanco».
- **Arrastrar partituras** desde la pantalla de inicio hasta una carpeta-concierto, y **reordenar arrastrando** dentro de la carpeta (las flechas se mantienen).
- **Etiquetas** al pasar el ratón por los iconos (en tableta, manteniendo el dedo).
- **Versión web instalable** (iPhone, iPad y cualquier navegador) que funciona sin conexión, con su icono, publicada en GitHub Pages; aviso en Safari para instalarla.
- Guías de publicación paso a paso para cada tienda (`docs/publicar/`), textos promocionales, capturas y aspectos legales. Documento de seguridad (`docs/SEGURIDAD.md`).

### Cambiado
- Paso de página: animación «pasar hoja» rápida y suave desde la esquina inferior derecha; fundido más rápido.
- Pantalla de carpeta-concierto rehecha para tabletas.
- Icono propio de la app en el ejecutable de Windows y en Linux.
- En móviles, la barra superior del lector agrupa «Recortar» y «Visualización» en un menú «⋯».
- La barra del lector no se oculta mientras se pulsa «Deshacer» o está abierto el panel de páginas.

### Seguridad
- Escritorio: la parte principal solo responde a la propia app; sin herramientas de desarrollo ni vistas web en la versión publicada; navegación y redirecciones bloqueadas; enlaces externos solo a GitHub; «fusibles» de Electron que impiden usar el programa para ejecutar otro código.
- Huellas SHA-256 (`SHA256SUMS.txt`) en cada versión publicada.

## [0.1.0] — 2026-10-31

### Añadido
- Nuevo nombre: **Atril PDF**. «Hecho por Marcos Hernández Párraga» en la pantalla de inicio.
- Diseño redondeado tipo Apple/Google con animaciones 3D (tarjetas que se inclinan al pulsar, entradas animadas) y paso de hoja en 3D.
- Carpetas-concierto: obras numeradas y ordenables, añadir obras, importar dentro, «Iniciar concierto» (al terminar una obra se abre la siguiente).
- Inicio: carpetas arriba y todos los documentos debajo, del más reciente al más antiguo.
- Escribir sobre el PDF: bolígrafo con presión, subrayador, borrador y texto; modo «Solo lápiz» para que el dedo no dibuje.
- PDF protegidos con contraseña: se pide la contraseña al importarlos.
- Biblioteca: importar PDF e imágenes, recientes, carpetas anidadas, favoritos, búsqueda, ordenación, papelera, abrir desde otras apps y arrastrar archivos a la ventana (escritorio).
- Lector con 6 modos de vista, media página con corte inteligente entre sistemas, vertical con anticipación, dos páginas, vertical continuo con solapamiento.
- Pedal Bluetooth y teclado: mapeo por defecto, modo aprender, prueba de teclas, anti-rebote, botones de volumen (Android).
- Modo actuación (pantalla completa, pantalla siempre encendida), modo noche y sepia, recorte automático de márgenes, girar páginas, deshacer/rehacer.
- Ajustes, «Acerca de», español e inglés, tema claro/oscuro.
- Escritorio (Windows, macOS, Linux) con Electron, sin acceso a la red.
- Módulo nativo para iOS y Android (renderizado PDF y captura de teclas).
