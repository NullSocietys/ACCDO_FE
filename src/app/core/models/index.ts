export type EventoEstado = 'activo' | 'proximo' | 'finalizado' | 'cancelado';
export type InscripcionEstado = 'pendiente' | 'confirmada' | 'rechazada' | 'borrador';
export type PagoEstado = 'pendiente' | 'verificado' | 'rechazado';
export type PagoMetodo = 'yape' | 'plin' | 'transferencia' | 'efectivo';
export type Sexo = 'M' | 'F';

/** Modalidades oficiales de competencia (Artículo 01 / 02). */
export type Modalidad =
  | 'Unipersonal – Macho Caporal'
  | 'Unipersonal – Caporalita de Oro'
  | 'Pareja (Libre)'
  | 'Dúos Machos y Caporalitas'
  | 'Tropas Machos y Caporalitas'
  | 'Ballet (Libre)';

/** @deprecated Prefer Modalidad; se mantiene como alias de compatibilidad. */
export type Categoria = Modalidad;

export interface ModalidadTarifa {
  codigo: string;
  modalidad: Modalidad;
  costo: number;
}

export interface PremioModalidad {
  modalidad: Modalidad;
  primero: string;
  segundo: string;
  tercero: string;
}

export interface CriterioCalificacion {
  clave: 'presentacion' | 'coreografia' | 'armonia' | 'mensaje' | 'expresion';
  nombre: string;
  puntos: number;
  descripcion: string;
}

export interface Evento {
  id: string;
  nombre: string;
  descripcion: string;
  fecha: string;
  hora: string;
  lugar: string;
  estado: EventoEstado;
}

export interface Participante {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  edad: number;
  sexo: Sexo;
  grupo: string;
  categoria: Modalidad;
  inscripcionId: string;
}

export interface Inscripcion {
  id: string;
  codigo: string;
  grupo: string;
  academia: string;
  categoria: Modalidad;
  responsable: string;
  cantidadIntegrantes: number;
  estado: InscripcionEstado;
  monto: number;
  fecha: string;
  hora: string;
  eventoId: string;
  eventoNombre: string;
  dniResponsable?: string;
  telefono?: string;
  correo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
}

export interface Pago {
  id: string;
  codigo: string;
  grupo: string;
  responsable: string;
  monto: number;
  metodo: PagoMetodo;
  estado: PagoEstado;
  fecha: string;
  numeroOperacion?: string;
  comprobanteUrl?: string;
  inscripcionId: string;
}

export interface Resultado {
  id: string;
  eventoId: string;
  grupo: string;
  categoria: Modalidad;
  /** Enteros 0–5 por criterio; total máximo 25. */
  presentacion: number;
  coreografia: number;
  armonia: number;
  mensaje: number;
  expresion: number;
  puntaje: number;
  puesto: number;
  observaciones: string;
}

export interface Configuracion {
  nombreAsociacion: string;
  telefono: string;
  correo: string;
  direccion: string;
  cuentaBancaria: string;
  numeroYape: string;
  numeroPlin: string;
  coordinadoraGeneral: string;
  logoUrl: string;
  mensajeConfirmacion: string;
  fechaLimiteInscripcion: string;
  fechaSorteo: string;
  horaSorteo: string;
  horaInicioConcurso: string;
}

export interface StatCard {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
  tone: 'gold' | 'dark' | 'success' | 'warning' | 'info';
}

export interface ChartBar {
  label: string;
  value: number;
}
