/** Módulo Eventos — tabla eventos. */

/** eventos.estado */
export type EventoEstado = 'ACTIVO' | 'CERRADO' | 'CANCELADO';

export interface Evento {
  id: string;
  nombre: string;
  descripcion: string;
  /** ISO YYYY-MM-DD */
  fecha: string;
  /** HH:mm */
  hora: string;
  lugar: string;
  estado: EventoEstado;
  activo: boolean;
  createdAt: string;
}

/** Payload de creación/actualización (el backend recibe el modelo directo). */
export type EventoPayload = Omit<Evento, 'id' | 'createdAt'>;

/** PATCH /api/eventos/{id}/estado */
export interface EstadoRequest {
  estado: string;
}
