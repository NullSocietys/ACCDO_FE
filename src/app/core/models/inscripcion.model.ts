/** Módulo Inscripciones — tabla inscripciones. */

/** inscripciones.estado */
export type InscripcionEstado = 'PENDIENTE' | 'CONFIRMADA' | 'RECHAZADA';

export interface Inscripcion {
  id: string;
  codigo: string;
  eventoId: string;
  categoriaId: string;
  usuarioId: string | null;
  responsableId: string;
  nombreGrupo: string;
  cantidadIntegrantes: number;
  total: number;
  estado: InscripcionEstado;
  observaciones: string;
  activo: boolean;
  createdAt: string;
}

/** POST /api/inscripciones — crea además responsable y participantes en el backend.
 *  El backend IGNORA usuarioId para clientes (usa el JWT); solo aplica para ADMIN.
 *  participantes opcional: el cliente puede saltar la nómina y la organización la completa. */
export interface InscripcionRequest {
  usuarioId?: string;
  eventoId: string;
  categoriaId: string;
  nombreGrupo: string;
  observaciones?: string;
  responsable: ResponsableRequest;
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
}

/** @deprecated Alias histórico. */
export type CategoriaNombre = string;

import type { ResponsableRequest } from './responsable.model';
import type { ParticipanteRequest } from './participante.model';
