/** Módulo Reclamos — tabla reclamos ("Reclamar mi grupo"). */

export type ReclamoEstado = 'PENDIENTE' | 'ATENDIDO';

export interface Reclamo {
  id: string;
  eventoId: string;
  nombreGrupo: string;
  encargadoNombres: string;
  encargadoApellidos: string;
  encargadoDni: string;
  telefono: string;
  correo: string;
  mensaje: string;
  estado: ReclamoEstado;
  activo: boolean;
  createdAt: string;
}

/** POST /api/reclamos — público (sin sesión). */
export interface ReclamoRequest {
  eventoId: string;
  nombreGrupo: string;
  encargadoNombres: string;
  encargadoApellidos: string;
  encargadoDni: string;
  telefono?: string;
  correo?: string;
  mensaje?: string;
}
