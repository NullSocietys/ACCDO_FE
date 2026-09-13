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

/** POST /api/inscripciones — crea además responsable y participantes en el backend.
 *  El backend obtiene agrupación y responsable del JWT para clientes.
 *  nombreGrupo/responsable se conservan opcionales solo para altas administrativas
 *  antiguas; el flujo público ya no los envía.
 *  participantes opcional: el cliente puede saltar la nómina y la organización la completa. */
export interface InscripcionRequest {
  usuarioId?: string;
  eventoId: string;
  categoriaId: string;
  nombreGrupo?: string;
  observaciones?: string;
  responsable?: ResponsableRequest;
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
