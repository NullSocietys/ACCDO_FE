/** Modelos alineados al esquema PostgreSQL (Caporales / Chicote de Oro). */

export type Sexo = 'M' | 'F';

/** eventos.estado */
export type EventoEstado = 'ACTIVO' | 'PROXIMO' | 'FINALIZADO' | 'CANCELADO';

/** inscripciones.estado */
export type InscripcionEstado = 'PENDIENTE' | 'CONFIRMADA' | 'RECHAZADA';

/** pagos.estado */
export type PagoEstado = 'PENDIENTE' | 'VERIFICADO' | 'RECHAZADO';

/** pagos.metodo_pago */
export type PagoMetodo = 'YAPE' | 'PLIN' | 'TRANSFERENCIA' | 'EFECTIVO';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  /** Solo mock; nunca se expone en UI. */
  password: string;
  activo: boolean;
  createdAt: string;
}

export interface Evento {
  id: string;
  nombre: string;
  descripcion: string;
  fecha: string;
  hora: string;
  lugar: string;
  estado: EventoEstado;
  activo: boolean;
  createdAt: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  precio: number;
  minIntegrantes: number;
  maxIntegrantes: number;
  activo: boolean;
}

export interface Responsable {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  correo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  activo: boolean;
  createdAt: string;
}

export interface Inscripcion {
  id: string;
  codigo: string;
  eventoId: string;
  categoriaId: string;
  usuarioId: string | null;
  institucion: string;
  responsableId: string;
  academia: string;
  nombreGrupo: string;
  cantidadIntegrantes: number;
  total: number;
  estado: InscripcionEstado;
  observaciones: string;
  activo: boolean;
  createdAt: string;
}

export interface Participante {
  id: string;
  inscripcionId: string;
  nombres: string;
  apellidos: string;
  dni: string;
  edad: number;
  sexo: Sexo;
  activo: boolean;
  createdAt: string;
}

export interface Pago {
  id: string;
  inscripcionId: string;
  monto: number;
  metodoPago: PagoMetodo;
  numeroOperacion: string;
  comprobante: string;
  estado: PagoEstado;
  fechaPago: string;
  observaciones: string;
  activo: boolean;
  createdAt: string;
}

export interface Resultado {
  id: string;
  inscripcionId: string;
  puesto: number;
  puntaje: number;
  observaciones: string;
  activo: boolean;
  createdAt: string;
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

/** Premios por modalidad (contenido de bases, no tabla SQL). */
export interface PremioCategoria {
  categoriaId: string;
  categoriaNombre: string;
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

/** Vistas denormalizadas para UI (joins en cliente). */
export interface InscripcionView extends Inscripcion {
  eventoNombre: string;
  categoriaNombre: string;
  categoriaPrecio: number;
  responsableNombre: string;
  responsableDni: string;
  responsableTelefono: string;
  responsableCorreo: string;
}

export interface PagoView extends Pago {
  codigo: string;
  nombreGrupo: string;
  responsableNombre: string;
}

export interface ParticipanteView extends Participante {
  nombreGrupo: string;
  categoriaNombre: string;
  eventoNombre: string;
  responsableNombre: string;
  codigoInscripcion: string;
  estadoInscripcion: InscripcionEstado;
}

export interface ResultadoView extends Resultado {
  nombreGrupo: string;
  categoriaNombre: string;
  eventoId: string;
  eventoNombre: string;
  codigoInscripcion: string;
}

/** @deprecated Usar Categoria.nombre / categoriaId */
export type Modalidad = string;
/** @deprecated Alias histórico */
export type CategoriaNombre = string;
