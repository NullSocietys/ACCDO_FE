import {
  CriterioCalificacion,
  Modalidad,
} from '../models';

// Interfaces locales para estructura de datos
interface ModalidadTarifa {
  codigo: string;
  modalidad: string;
  costo: number;
}

interface PremioModalidad {
  modalidad: string;
  primero: string;
  segundo: string;
  tercero: string;
}

/** Tarifas oficiales (Artículo 01 / 02). */
export const MODALIDADES: ModalidadTarifa[] = [
  { codigo: '01', modalidad: 'Unipersonal – Macho Caporal', costo: 70 },
  { codigo: '02', modalidad: 'Unipersonal – Caporalita de Oro', costo: 70 },
  { codigo: '03', modalidad: 'Pareja (Libre)', costo: 80 },
  { codigo: '04', modalidad: 'Dúos Machos y Caporalitas', costo: 80 },
  { codigo: '05', modalidad: 'Tropas Machos y Caporalitas', costo: 100 },
  { codigo: '06', modalidad: 'Ballet (Libre)', costo: 170 },
];

export const CATEGORIAS = MODALIDADES.map((m) => m.modalidad);

export const MONTOS_POR_CATEGORIA: Record<Modalidad, number> = Object.fromEntries(
  MODALIDADES.map((m) => [m.modalidad, m.costo]),
) as Record<Modalidad, number>;

// Aliases para compatibilidad con mock-data.ts
export const CATEGORIAS_DB = MODALIDADES.map((m, index) => ({
  id: `cat-${index + 1}`,
  nombre: m.modalidad,
  precio: m.costo,
  minIntegrantes: 1,
  maxIntegrantes: m.modalidad.includes('Ballet') ? 12 : m.modalidad.includes('Tropas') ? 10 : m.modalidad.includes('Dúo') || m.modalidad.includes('Pareja') ? 2 : 1,
  activo: true
}));
export const PRECIO_POR_CATEGORIA_ID = MONTOS_POR_CATEGORIA;

/** Criterios de calificación (Artículo 08). Total máximo: 25 puntos. */
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

export const PREMIOS: PremioModalidad[] = [
  {
    modalidad: 'Unipersonal – Macho Caporal',
    primero: 'S/ 500 + Medalla + Diploma',
    segundo: 'S/ 250 + Medalla + Diploma',
    tercero: 'Medalla + Diploma',
  },
  {
    modalidad: 'Unipersonal – Caporalita de Oro',
    primero: 'S/ 500 + Medalla + Diploma',
    segundo: 'S/ 250 + Medalla + Diploma',
    tercero: 'Medalla + Diploma',
  },
  {
    modalidad: 'Pareja (Libre)',
    primero: 'S/ 600 + Medalla + Diploma',
    segundo: 'S/ 300 + Medalla + Diploma',
    tercero: 'Medalla + Diploma',
  },
  {
    modalidad: 'Dúos Machos y Caporalitas',
    primero: 'S/ 600 + Medalla + Diploma',
    segundo: 'S/ 300 + Medalla + Diploma',
    tercero: 'Medalla + Diploma',
  },
  {
    modalidad: 'Tropas Machos y Caporalitas',
    primero: 'S/ 800 + Trofeo + Diploma',
    segundo: 'S/ 400 + Trofeo + Diploma',
    tercero: 'Medalla + Diploma',
  },
  {
    modalidad: 'Ballet (Libre)',
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
  },
  {
    id: '02',
    titulo: 'Costos de inscripción',
    resumen:
      'El pago se realiza por YAPE al 926 266 295.',
    tabla: {
      headers: ['N°', 'Modalidad', 'Costo'],
      rows: MODALIDADES.map((m) => [m.codigo, m.modalidad, `S/ ${m.costo.toFixed(2)}`]),
    },
  },
  {
    id: '03',
    titulo: 'Número de ballet y parejas por institución',
    bullets: [
      'Las instituciones pueden participar con hasta 3 propuestas por cada modalidad de la misma categoría, por sede o institución. Válido en todas las categorías y modalidades.',
      'No hay máximo de sedes por institución.',
      'Las centrales podrán presentar 2 ballets como máximo.',
      'En Macho Caporal y Caporalita de Oro: máximo 4 participantes por institución.',
    ],
  },
  {
    id: '04',
    titulo: 'Número de participantes categoría Ballet',
    resumen:
      'Categoría Ballet Adultos: mínimo 4 parejas mixtas; máximo 5 o 6 parejas mixtas.',
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
      'Llegar temprano para el inicio del concurso (10:00 am); habrá tolerancia de 5 minutos para el inicio de las distintas modalidades.',
      'Designar un delegado responsable de reuniones, sorteos y reclamos.',
      'Presentarse caracterizados y listos; no se contará con lugar de cambio o backstage.',
      'Traer la propia utilería necesaria para el concurso.',
      'Traer la pista musical en USB. La organización no se hace responsable de cualquier fallo.',
      'La pista debe tener buena calidad de audio y entregarse el día del sorteo.',
      'El Comité Organizador no se responsabiliza si la pista está mal grabada o tiene algún error.',
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
      rows: PREMIOS.map((p) => [p.modalidad, p.primero, p.segundo, p.tercero]),
    },
  },
  {
    id: '14',
    titulo: 'Disposiciones finales',
    resumen:
      'Cualquier artículo no contemplado en las bases estará a cargo del coordinador general y se deberá respetar.',
  },
];
