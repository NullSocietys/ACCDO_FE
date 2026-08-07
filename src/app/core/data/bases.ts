import {
  Categoria,
  CriterioCalificacion,
  PremioCategoria,
} from '../models';

/** Categorías oficiales = filas de la tabla `categorias` (Bases 2026). */
export const CATEGORIAS_DB: Categoria[] = [
  {
    id: 'cat-01',
    nombre: 'UNIPERSONAL MACHO CAPORAL',
    precio: 70,
    minIntegrantes: 1,
    maxIntegrantes: 1,
    activo: true,
  },
  {
    id: 'cat-02',
    nombre: 'UNIPERSONAL CAPORALITA DE ORO',
    precio: 70,
    minIntegrantes: 1,
    maxIntegrantes: 1,
    activo: true,
  },
  {
    id: 'cat-03',
    nombre: 'PAREJA (LIBRE)',
    precio: 80,
    minIntegrantes: 2,
    maxIntegrantes: 2,
    activo: true,
  },
  {
    id: 'cat-04',
    nombre: 'DUOS MACHOS Y CAPORALITAS',
    precio: 80,
    minIntegrantes: 2,
    maxIntegrantes: 2,
    activo: true,
  },
  {
    id: 'cat-05',
    nombre: 'TROPAS MACHOS Y CAPORALITAS',
    precio: 100,
    minIntegrantes: 3,
    maxIntegrantes: 40,
    activo: true,
  },
  {
    id: 'cat-06',
    nombre: 'BALLET (LIBRE)',
    precio: 170,
    minIntegrantes: 8,
    maxIntegrantes: 40,
    activo: true,
  },
];

/** Alias de compatibilidad con pantallas de bases / wizard. */
export const MODALIDADES = CATEGORIAS_DB.map((c, i) => ({
  codigo: String(i + 1).padStart(2, '0'),
  modalidad: c.nombre,
  costo: c.precio,
  categoriaId: c.id,
  minIntegrantes: c.minIntegrantes,
  maxIntegrantes: c.maxIntegrantes,
}));

export const CATEGORIAS = CATEGORIAS_DB.map((c) => c.nombre);

export const MONTOS_POR_CATEGORIA: Record<string, number> = Object.fromEntries(
  CATEGORIAS_DB.map((c) => [c.nombre, c.precio]),
);

export const PRECIO_POR_CATEGORIA_ID: Record<string, number> = Object.fromEntries(
  CATEGORIAS_DB.map((c) => [c.id, c.precio]),
);

export const CRITERIOS_CALIFICACION: CriterioCalificacion[] = [
  {
    clave: 'presentacion',
    nombre: 'Presentación y vestimenta',
    puntos: 5,
    descripcion:
      'Entrada, salida, uso correcto de la vestimenta, disciplina y buen uso de elementos y accesorios.',
  },
  {
    clave: 'coreografia',
    nombre: 'Coreografía',
    puntos: 5,
    descripcion:
      'Dominio de escenario, simetría, sincronización, desplazamiento y figuras coreográficas.',
  },
  {
    clave: 'armonia',
    nombre: 'Armonía rítmica',
    puntos: 5,
    descripcion:
      'Movimientos con el ritmo musical, pulso, frase, compás, melodía y coordinación grupal.',
  },
  {
    clave: 'mensaje',
    nombre: 'Mensaje',
    puntos: 5,
    descripcion:
      'Origen, evolución e interpretación de la danza; alegría, fuerza, gallardía y sentimiento.',
  },
  {
    clave: 'expresion',
    nombre: 'Expresión',
    puntos: 5,
    descripcion:
      'Lenguaje corporal, gestual y oral; naturalidad, seguridad y dominio artístico.',
  },
];

export const PREMIOS: PremioCategoria[] = [
  {
    categoriaId: 'cat-01',
    categoriaNombre: 'UNIPERSONAL MACHO CAPORAL',
    primero: 'S/ 500 + Medalla + Diploma',
    segundo: 'S/ 250 + Medalla + Diploma',
    tercero: 'Medalla + Diploma',
  },
  {
    categoriaId: 'cat-02',
    categoriaNombre: 'UNIPERSONAL CAPORALITA DE ORO',
    primero: 'S/ 500 + Medalla + Diploma',
    segundo: 'S/ 250 + Medalla + Diploma',
    tercero: 'Medalla + Diploma',
  },
  {
    categoriaId: 'cat-03',
    categoriaNombre: 'PAREJA (LIBRE)',
    primero: 'S/ 600 + Medalla + Diploma',
    segundo: 'S/ 300 + Medalla + Diploma',
    tercero: 'Medalla + Diploma',
  },
  {
    categoriaId: 'cat-04',
    categoriaNombre: 'DUOS MACHOS Y CAPORALITAS',
    primero: 'S/ 600 + Medalla + Diploma',
    segundo: 'S/ 300 + Medalla + Diploma',
    tercero: 'Medalla + Diploma',
  },
  {
    categoriaId: 'cat-05',
    categoriaNombre: 'TROPAS MACHOS Y CAPORALITAS',
    primero: 'S/ 800 + Trofeo + Diploma',
    segundo: 'S/ 400 + Trofeo + Diploma',
    tercero: 'Medalla + Diploma',
  },
  {
    categoriaId: 'cat-06',
    categoriaNombre: 'BALLET (LIBRE)',
    primero: 'S/ 2,500 + Trofeo',
    segundo: 'S/ 1,200 + Trofeo',
    tercero: 'S/ 300 + Trofeo',
  },
];

export const ORDEN_SEMIFINAL = [
  'Macho Caporal',
  'Caporalita de Oro',
  'Dúo macho caporal',
  'Dúo caporalitas',
  'Tropas macho caporal',
  'Tropas caporalitas',
  'Pareja libre',
  'Ballet libre',
] as const;

export interface ArticuloBases {
  id: string;
  titulo: string;
  resumen?: string;
  bullets?: string[];
  notas?: string[];
  tabla?: { headers: string[]; rows: string[][] };
}

export const ARTICULOS_BASES: ArticuloBases[] = [
  {
    id: '01',
    titulo: 'Inscripciones',
    bullets: [
      'Las inscripciones se realizan al WhatsApp 926 266 295 (Yape). Último día de inscripción: 12 de agosto, hasta agotar cupo.',
      'Escribir el nombre y categoría de la institución en el voucher.',
      'Enviar fotografía legible del voucher al WhatsApp de la coordinadora general Martha Bravo (926 266 295). Si hay más de un bloque, enviar fotos por separado.',
      'El sorteo se realizará el 14 de agosto en las distintas modalidades a partir de las 21:00 vía Facebook.',
      'Ingresan al sorteo quienes pagaron su inscripción y enviaron la ficha correctamente rellenada.',
      'Se pueden inscribir pasado el sorteo o el mismo día del concurso; en ese caso pasan a ser los primeros de la lista en el primer bloque.',
    ],
    tabla: {
      headers: ['N°', 'Modalidad', 'Costo', 'Integrantes'],
      rows: CATEGORIAS_DB.map((c, i) => [
        String(i + 1).padStart(2, '0'),
        c.nombre,
        `S/ ${c.precio.toFixed(2)}`,
        c.minIntegrantes === c.maxIntegrantes
          ? String(c.minIntegrantes)
          : `${c.minIntegrantes}–${c.maxIntegrantes}`,
      ]),
    },
  },
  {
    id: '02',
    titulo: 'Costos de inscripción',
    resumen:
      'Los costos oficiales por modalidad se detallan en la tabla del Artículo 01. El pago se realiza por Yape al 926 266 295.',
  },
  {
    id: '03',
    titulo: 'Número de ballet y parejas por institución',
    bullets: [
      'Las instituciones pueden participar con hasta 3 propuestas por cada modalidad de la misma categoría, por sede o institución. Válido en todas las categorías y modalidades.',
      'No hay máximo de sedes por institución.',
      'Las centrales podrán presentar 2 ballets como máximo.',
      'Habrá tolerancia de 5 minutos.',
      'En Macho Caporal y Caporalita de Oro: máximo 4 participantes por institución.',
    ],
  },
  {
    id: '04',
    titulo: 'Número de participantes categoría Ballet',
    resumen:
      'Categoría Ballet: mínimo 8 integrantes y máximo 40 según tabla oficial de categorías.',
  },
  {
    id: '05',
    titulo: 'Estado de salud',
    resumen:
      'Los participantes deben estar en buen estado de salud. Quienes tengan tratamiento médico no deben participar; en caso contrario, será responsabilidad del delegado o coordinador de la institución.',
  },
  {
    id: '06',
    titulo: 'Responsabilidad de los participantes',
    bullets: [
      'Llegar temprano para el inicio del concurso (10:00 a. m.).',
      'Designar un delegado responsable de reuniones, sorteos y reclamos.',
      'Presentarse caracterizados y listos; no habrá camerino ni backstage.',
      'Traer la propia utilería necesaria.',
      'Traer la pista musical en USB. La organización no se hace responsable de fallos.',
      'La pista debe tener buena calidad de audio y entregarse el día del sorteo.',
      'El Comité Organizador no se responsabiliza si la pista está mal grabada o tiene errores.',
    ],
  },
  {
    id: '07',
    titulo: 'Tiempo de participación',
    bullets: [
      'Unipersonal: mínimo 2 minutos, máximo 3 minutos.',
      'Pareja y Dúos: 3 minutos, con tolerancia de 45 segundos.',
      'Ballet tropa: 5 minutos, con tolerancia de 45 segundos.',
      'Ballet libre: 5 minutos, con tolerancia de 45 segundos.',
    ],
  },
  {
    id: '08',
    titulo: 'Orden de presentación en la semifinal',
    resumen: 'Inicio: 10:00 a. m.',
    bullets: [...ORDEN_SEMIFINAL],
    notas: [
      'Las agrupaciones que lleven más de dos ballets deberán sacar su ticket por bloque.',
    ],
  },
  {
    id: '09',
    titulo: 'La gran final',
    bullets: [
      'Pasan a la gran final 2 instituciones por bloque en las distintas modalidades, según los mayores puntajes (incluye empates que clasifican).',
      'Los bloques tendrán máximo 5 participantes. Si se supera ese tope, pasa el 40% del total del bloque.',
      'El orden en la etapa final será de menor a mayor puntaje.',
      'Empate en 1.er puesto: se vuelve a bailar. Si se repite, el jurado decide sumando Mensaje y Expresión.',
      'Empate en 2.º puesto: no se baila; lo define el jurado sumando Mensaje y Expresión.',
    ],
  },
  {
    id: '10',
    titulo: 'Criterios de calificación',
    resumen:
      'La calificación se expresa en números enteros de 0 a 25 puntos (5 criterios × 5 puntos).',
    bullets: CRITERIOS_CALIFICACION.map(
      (c) => `${c.nombre.toUpperCase()} (${c.puntos} pts): ${c.descripcion}`,
    ),
  },
  {
    id: '11',
    titulo: 'Motivos de descalificación',
    bullets: [
      'No estar presente en el escenario al tercer llamado.',
      'Encender artefactos pirotécnicos (bombardas).',
      'Cambiar el orden de participación entre instituciones.',
      'Bailar en estado de ebriedad o consumir alcohol durante el concurso (integrantes y barra).',
      'Presentar integrantes que hayan bailado en semifinal por otra institución.',
      'Presentar integrantes de Lima cuando la institución viene de provincia.',
      'Palabras, gestos o actos reñidos contra la moral hacia jurados, organizadores u otras instituciones.',
      'Enviar miembros o padres a reclamar fuera de mesa oficial: eliminación automática sin devolución. El agresor puede ser sancionado hasta por 1 año.',
      'Incumplir normas de respeto y disciplina antes, durante o después del evento.',
      'Los reclamos solo se atienden en la mesa oficial, por el delegado.',
      'Un varón no puede bailar de mujer y viceversa.',
      'Presentar en la final a una pareja o integrante que no clasificó en semifinal (modalidad Parejas).',
    ],
  },
  {
    id: '12',
    titulo: 'Del jurado calificador',
    bullets: [
      'El jurado estará conformado por especialistas del folklore y la danza: máximo 4, mínimo 3.',
      'La Asociación Cultural Chicote de Oro garantiza autonomía, idoneidad e imparcialidad.',
      'La calificación será con paleta a mano alzada.',
      'Todo reclamo debe hacerlo el delegado y quedar grabado de inicio a fin; de lo contrario no se acepta.',
      'El fallo del jurado es inapelable.',
    ],
  },
  {
    id: '13',
    titulo: 'Entrega de premios',
    resumen: 'Los premios se entregan al final del concurso (gran final de cada categoría).',
    bullets: [
      'Mínimo Pareja Adultos: 15 parejas.',
      'Mínimo Dúos: 15 parejas.',
      'Mínimo Tropas: 15 instituciones.',
      'Mínimo Unipersonal: 15 instituciones.',
      'Mínimo Ballet: 18 instituciones (100% premiación).',
    ],
    tabla: {
      headers: ['Modalidad', '1.er puesto', '2.º puesto', '3.er puesto'],
      rows: PREMIOS.map((p) => [p.categoriaNombre, p.primero, p.segundo, p.tercero]),
    },
  },
  {
    id: '14',
    titulo: 'Disposiciones finales',
    resumen:
      'Cualquier artículo no contemplado en las bases estará a cargo del coordinador general y se deberá respetar.',
  },
];
