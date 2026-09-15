/** Módulo Inscripciones — tabla inscripciones. */

/** inscripciones.estado */
export type InscripcionEstado = 'PENDIENTE' | 'CONFIRMADA' | 'RECHAZADA';

export interface Inscripcion {
  id: string;
  codigo: string;
  eventoId: string;
  categoriaId: string;
  /** Puede faltar solo en datos mock/históricos previos a la migración. */
  agrupacionId?: string | null;
  usuarioId: string | null;
  responsableId: string;
  /** Proyección histórica; en nuevas altas la deriva el backend de agrupacionId. */
  nombreGrupo: string;
  cantidadIntegrantes: number;
  total: number;
  estado: InscripcionEstado;
  observaciones: string;
  activo: boolean;
  createdAt: string;
}

/** POST /api/inscripciones — crea la nómina de participantes en el backend.
 *  La agrupación y el responsable SIEMPRE salen de la cuenta (JWT para clientes,
 *  usuarioId elegido por el admin). No se envían nombreGrupo ni responsable. */
export interface InscripcionRequest {
  usuarioId?: string;
  eventoId: string;
  categoriaId: string;
  /** Informativo: el backend valida la cantidad real contra la modalidad. */
  cantidadParticipantes?: number;
  observaciones?: string;
  /** Obligatorio: la inscripción se crea con su nómina completa. */
  participantes?: ParticipanteRequest[];
}

/** Vista denormalizada para UI (joins en cliente). */
export interface InscripcionView extends Inscripcion {
  eventoNombre: string;
  categoriaNombre: string;
  categoriaPrecio: number;
  responsableNombre: string;
  responsableDni: string;
  responsableTelefono: string;
  responsableCorreo: string;
  responsableDepartamento?: string;
  responsableProvincia?: string;
  responsableDistrito?: string;
}

/** @deprecated Alias histórico. */
export type CategoriaNombre = string;

import type { ParticipanteRequest } from './participante.model';
