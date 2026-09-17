/**
 * ═══════════════════════════════════════════════════════════════════
 *  CONTENIDO DE LA LANDING — Asociación Cultural Chicote de Oro
 * ═══════════════════════════════════════════════════════════════════
 *
 *  ✏️  TODO el texto de la página pública vive AQUÍ. No hay llamadas al
 *      backend ni a la base de datos: la landing es 100% estática
 *      (cero consumo de Neon / Postgres).
 *
 *  CÓMO EDITAR:
 *   · Cambia el texto entre comillas 'así' y guarda el archivo.
 *   · Los campos "descripcion" / "texto" aceptan <strong>negrita</strong>.
 *   · Para cambiar la edición (2027 en adelante): busca los campos
 *     `anio` y los textos que mencionan el año.
 *   · No borres comas, llaves { } ni corchetes [ ] — respeta la estructura.
 */

export const CONTENIDO_LANDING = {
  // ─────────────────────────────────────────────────────────
  //  PORTADA (hero)
  // ─────────────────────────────────────────────────────────
  hero: {
    // Franja superior del hero
    etiqueta: 'Esperando próximo evento',
    marcaLinea1: 'Asociación Cultural',
    marcaLinea2: 'Chicote de Oro',
    eslogan: 'Elegancia en movimiento',
    descripcion:
      'Vive la pasión por la danza en un escenario de lujo: concursos, categorías y resultados que celebran el talento con elegancia dorada.',
    // Etiqueta del costado derecho del hero
    avisoInscripciones: 'Atento a las próximas inscripciones',
    botonPrincipal: 'Inscribirme ahora',
    botonSecundario: 'Ver el concurso',
  },

  // ─────────────────────────────────────────────────────────
  //  SECCIÓN "EL CONCURSO"
  // ─────────────────────────────────────────────────────────
  concurso: {
    antetitulo: 'El concurso',
    tituloLinea1: 'Próximo evento',
    tituloLinea2: 'Caporales',
    nota: 'Esperando el próximo evento: nuevas fechas de semifinales y Gran Final en el Coliseo de Imperial — Cañete. Organiza la Asociación Cultural Chicote de Oro.',
    tarjeta: {
      etiqueta: 'esperando próximo evento',
      tituloLinea1: 'Próximo evento',
      tituloLinea2: 'Por confirmar',
      descripcion:
        'Estamos preparando el próximo evento en el Coliseo de Imperial — Cañete. Una jornada completa dedicada a la elegancia de los caporales.',
    },
  },

  // Los 4 datos clave debajo de la foto principal
  datosClave: [
    { titulo: 'Organiza', valor: 'Asociación Cultural Chicote de Oro' },
    { titulo: 'Fechas', valor: 'Esperando próximo evento' },
    { titulo: 'Sorteo oficial', valor: 'Por confirmar — Facebook' },
    { titulo: 'Inscripciones por abrir', valor: 'Yape · WhatsApp · 926 266 295', destacada: true },
  ],

  // ─────────────────────────────────────────────────────────
  //  PROCESO DE INSCRIPCIÓN (3 pasos)
  // ─────────────────────────────────────────────────────────
  proceso: {
    antetitulo: 'Inscripciones',
    tituloLinea1: 'Proceso de',
    tituloResaltado: 'inscripción',
    nota: 'Tres pasos simples desde tu celular. Cada paso toma menos de 2 minutos.',
    pasos: [
      {
        numero: '01',
        kicker: 'Paso uno',
        titulo: 'Completa el formulario',
        descripcion: 'Registra tu cuenta, tu <strong>grupo</strong> y la nómina de participantes',
        tiempo: '~3 min',
      },
      {
        numero: '02',
        kicker: 'Paso 2',
        titulo: 'Realiza tu Yape',
        descripcion:
          'Al <strong>926 266 295</strong> indicando el nombre de tu institución e ingresa el número de operación',
        tiempo: '~1 min',
      },
      {
        numero: '03',
        kicker: 'Paso final',
        titulo: 'Espera la confirmación',
        descripcion:
          'Con tu <strong>código de inscripción</strong> consulta cuándo la organización confirma tu cupo',
        tiempo: 'En revisión',
        enVivo: true,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  //  INVERSIÓN · TARIFAS · PREMIOS
  // ─────────────────────────────────────────────────────────
  inversion: {
    antetitulo: 'Inversión y tarifas',
    anio: '2026', // ← cámbialo a 2027 la próxima temporada
    tituloLinea1: 'Todo lo que define tu',
    tituloLinea2: 'participación',
    tarifasTitulo: 'Tarifas por modalidad',
    tarifasSub: 'Precio por inscripción · Pago único',
    pagoYapeTitulo: 'Pago único por Yape',
    pagoYapeNumero: '926 266 295',
    pagoYapeDetalle: '· a nombre de la organización',
    botonInscribirse: 'Inscribirme ahora',
    botonBases: 'Ver bases',

    // Tarifas por modalidad (foto = imagen de fondo de la tarjeta)
    tarifas: [
      {
        numero: '01',
        categoria: 'Unipersonal',
        nombre: 'Macho Caporal',
        detalle: 'Individual · 2–3 min en escena',
        precio: '70',
        foto: 'fotos/unipersonal/unipersonal-M.webp',
      },
      {
        numero: '02',
        categoria: 'Unipersonal',
        nombre: 'Caporalita de Oro',
        detalle: 'Individual · 2–3 min en escena',
        precio: '70',
        foto: 'fotos/unipersonal/unipersonal-V1.webp',
      },
      {
        numero: '03',
        categoria: 'Pareja',
        nombre: 'Libre',
        detalle: '2 bailarines · 3 min + 45 s entrada',
        precio: '80',
        foto: 'fotos/parejas/pareja1.webp',
      },
      {
        numero: '04',
        categoria: 'Dúos',
        nombre: 'Machos y Caporalitas',
        detalle: '2 bailarines · 3 min + 45 s entrada',
        precio: '80',
        foto: 'fotos/parejas/pareja3.webp',
      },
      {
        numero: '05',
        categoria: 'Tropas',
        nombre: 'Machos y Caporalitas',
        detalle: 'Grupo · 5 min + 45 s entrada',
        precio: '100',
        foto: 'fotos/ballets/ballet2.webp',
      },
      {
        numero: '06',
        categoria: 'Ballet libre · Elenco',
        nombre: 'Ballet — 5 min en escena',
        detalle: '5 min + 45 s entrada · Trofeo + diploma',
        precio: '170',
        foto: 'fotos/ballets/ballet4.webp',
        destacada: true,
        cinta: 'La gran apuesta',
        premioMayor: 'S/ 2,500',
      },
    ],
  },

  premios: {
    titulo: 'Premiación en la gran final',
    subtitulo: 'Medallas, trofeos y diplomas',
    premioMayor: {
      etiqueta: 'Premio mayor · Ballet',
      monto: '2,500',
      subtitulo: 'Trofeo de oro + diploma para la gran ganadora',
    },
    categorias: [
      {
        numero: '01',
        nombre: 'Macho Caporal de Oro',
        detalle: 'Unipersonal · Individual',
        puestos: [
          { puesto: '1.º puesto', premio: 'S/ 500' },
          { puesto: '2.º puesto', premio: 'S/ 250' },
          { puesto: '3.º puesto', premio: 'Medalla' },
        ],
      },
      {
        numero: '02',
        nombre: 'Caporalita de Oro',
        detalle: 'Unipersonal · Individual',
        puestos: [
          { puesto: '1.º puesto', premio: 'S/ 500' },
          { puesto: '2.º puesto', premio: 'S/ 250' },
          { puesto: '3.º puesto', premio: 'Medalla' },
        ],
      },
      {
        numero: '03',
        nombre: 'Pareja (Libre)',
        detalle: 'Pareja · 2 bailarines',
        puestos: [
          { puesto: '1.º puesto', premio: 'S/ 600' },
          { puesto: '2.º puesto', premio: 'S/ 300' },
          { puesto: '3.º puesto', premio: 'Medalla' },
        ],
      },
      {
        numero: '04',
        nombre: 'Dúo',
        detalle: 'Dúos · 2 bailarines',
        puestos: [
          { puesto: '1.º puesto', premio: 'S/ 600' },
          { puesto: '2.º puesto', premio: 'S/ 300' },
          { puesto: '3.º puesto', premio: 'Medalla' },
        ],
      },
      {
        numero: '05',
        nombre: 'Tropas',
        detalle: 'Grupal · Machos y Caporalitas',
        puestos: [
          { puesto: '1.º puesto', premio: 'S/ 800' },
          { puesto: '2.º puesto', premio: 'S/ 400' },
          { puesto: '3.º puesto', premio: 'Trofeo' },
        ],
      },
      {
        numero: '06',
        nombre: 'Ballet (Libre) · Premio mayor',
        detalle: 'Elenco · Gran final',
        destacada: true,
        puestos: [
          { puesto: '1.º puesto', premio: 'S/ 2,500' },
          { puesto: '2.º puesto', premio: 'S/ 1,200' },
          { puesto: '3.º puesto', premio: 'S/ 300' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  //  CRITERIOS · TIEMPOS · ORDEN · DESCALIFICACIÓN
  // ─────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────
  //  BASES — encabezado de la sección de reglas
  // ─────────────────────────────────────────────────────────
  bases: {
    antetitulo: 'Bases del concurso',
    tituloLinea1: 'Criterios, tiempos y',
    tituloResaltado: 'reglas',
    nota: 'Cómo se califica, cuánto dura cada presentación y las faltas que descalifican.',
    botonDescargar: 'Descargar bases',
  },

  criterios: {
    titulo: 'Cómo se califica',
    subtitulo: 'Paleta a mano alzada · 3 a 4 jurados',
    puntajeMaximo: '25',
    puntajeTitulo: '5 criterios × 5 puntos',
    puntajeDetalle: 'Paleta a mano alzada · 3 a 4 jurados',
    barras: [
      'Presentación y vestimenta',
      'Coreografía',
      'Armonía rítmica',
      'Mensaje',
      'Expresión',
    ],
    nota: 'Los 2 mejores puntajes por bloque pasan a la gran final. El desempate del 1.º se baila.',
  },

  tiempos: {
    titulo: 'Tiempos de participación',
    subtitulo: '+ 45 s de entrada',
    items: [
      { etiqueta: 'Unipersonal', valor: '2–3', ancho: 55, nota: 'Entrada estándar' },
      { etiqueta: 'Pareja y Dúos', valor: '3', ancho: 70, chip: '+ 45 s de entrada' },
      { etiqueta: 'Ballet tropa', valor: '5', ancho: 92, chip: '+ 45 s de entrada' },
      { etiqueta: 'Ballet libre', valor: '5', ancho: 100, chip: '+ 45 s de entrada', destacada: true },
    ],
  },

  orden: {
    titulo: 'Orden de presentación',
    subtitulo: 'Semifinal · Por confirmar',
    pasos: [
      'Macho caporal',
      'Caporalita de Oro',
      'Dúo macho caporal',
      'Dúo caporalitas',
      'Tropas macho caporal',
      'Tropas caporalitas',
      'Categoría Pareja libre',
      'Categoría Ballet libre',
    ],
    nota: 'Fecha y horario de la semifinal por confirmar. Las agrupaciones que lleven más de dos ballets deberán sacar su ticket por bloque.',
  },

  descalificacion: {
    titulo: 'Se descalifica por',
    subtitulo: '3 faltas graves',
    reglas: [
      {
        texto: '<strong>Reclamos fuera de la mesa oficial</strong>: eliminación automática sin devolución.',
        grave: true,
      },
      {
        texto: 'Bailar en estado de <strong>ebriedad</strong> o consumir alcohol durante el concurso.',
      },
      {
        texto: 'No estar presente en el escenario al <strong>tercer llamado</strong>.',
      },
    ],
    pieTexto: 'Ver faltas y sanciones completas en las',
    pieEnlace: 'bases oficiales',
  },

  // ─────────────────────────────────────────────────────────
  //  GRAN FINAL (reglas y desempates)
  // ─────────────────────────────────────────────────────────
  granFinal: {
    antetitulo: 'Gran final',
    tituloLinea1: 'Cómo se define la',
    tituloResaltado: 'ganadora',
    nota: 'Reglas de clasificación y desempate para la etapa decisiva del concurso.',
    etiquetaVisual: 'Sistema de desempate',
    reglas: [
      {
        numero: '01',
        titulo: 'Clasificación a la gran final',
        texto: 'Pasan a la gran final <strong>2 instituciones por bloque</strong>, las de mayor puntaje. En caso de empate, pasan las empatadas.',
        variante: 'hero',
        etiqueta: 'Regla principal',
      },
      {
        numero: '02',
        titulo: 'Límite por bloque',
        texto: 'Los bloques tienen <strong>máximo 5 participantes</strong>. Si se supera, pasa el 40% del total.',
        icono: 'grupos',
      },
      {
        numero: '03',
        titulo: 'Orden de presentación',
        texto: 'El orden de la etapa final es <strong>de menor a mayor puntaje</strong>.',
        icono: 'lista',
      },
      {
        numero: '04',
        titulo: 'Empate en 1.er puesto',
        texto: 'Se vuelve a bailar. Si persiste el empate, lo decide el jurado sumando <strong>Mensaje y Expresión</strong>.',
        icono: 'trofeo',
        variante: 'accent',
      },
      {
        numero: '05',
        titulo: 'Empate en 2.º puesto',
        texto: 'No se vuelve a bailar. Lo define el jurado sumando <strong>Mensaje y Expresión</strong>.',
        icono: 'balanza',
        variante: 'accent',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  //  JURADO
  // ─────────────────────────────────────────────────────────
  jurado: {
    antetitulo: 'Del jurado',
    tituloLinea1: 'Calificación y',
    tituloResaltado: 'reclamos',
    veredicto: {
      etiqueta: 'Veredicto final',
      titulo: 'El fallo del jurado es inapelable',
      nota: 'Las decisiones del jurado son definitivas y no admiten apelación ni revisión.',
    },
    pasos: [
      { texto: 'Jurado de <strong>especialistas del folklore y la danza</strong>: máximo 4, mínimo 3.' },
      { texto: 'Calificación con <strong>paleta a mano alzada</strong>.' },
      { texto: 'Reclamos solo del <strong>delegado</strong>, grabados de inicio a fin.' },
      { texto: '<strong>Autonomía, idoneidad e imparcialidad</strong> garantizadas.' },
    ],
  },

  // ─────────────────────────────────────────────────────────
  //  CTA FINAL ("¿Listo para brillar?")
  // ─────────────────────────────────────────────────────────
  participa: {
    antetitulo: 'Participa',
    tituloLinea1: '¿Listo para',
    tituloResaltado: 'brillar',
    texto:
      'Esperando el próximo evento: inscríbete por Yape al <strong>926 266 295</strong> o consúltanos por WhatsApp y te avisamos en cuanto se confirmen las fechas.',
    botonWhatsApp: 'Consultar por WhatsApp',
    botonTarifas: 'Ver tarifas',
    nota: 'Cupos por modalidad · Fechas por confirmar',
  },

  // ─────────────────────────────────────────────────────────
  //  CONTACTO (única fuente para landing + header público)
  // ─────────────────────────────────────────────────────────
  contacto: {
    nombreAsociacion: 'Asociación Cultural Chicote de Oro',
    coordinadoraGeneral: 'Martha Bravo',
    telefono: '+51 926 266 295',
    telefonoLink: 'tel:+51926266295',
    whatsappUrl: 'https://wa.me/51926266295',
    facebookUrl: 'https://www.facebook.com/profile.php?id=61551954963131',
    correo: 'mbravomend@gmail.com',
    ubicacion: 'Imperial, Cañete',
    yape: '926 266 295',
  },

  // PDF de bases (enlace usado por los botones "Descargar bases" / "Ver bases")
  basesPdfUrl: '/bases/BASES%20CHICOTE%20DE%20ORO%202026.pdf',

  // ─────────────────────────────────────────────────────────
  //  PIE DE PÁGINA
  // ─────────────────────────────────────────────────────────
  footer: {
    descripcion:
      'Asociación Cultural dedicada a promover y celebrar la danza de caporales con excelencia y pasión.',
    copyright: '© 2026 Asociación Cultural Chicote de Oro. Todos los derechos reservados.',
    insignia: 'VII Edición · 2026',
  },
};
