# Registro de cambios / Changelog

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
