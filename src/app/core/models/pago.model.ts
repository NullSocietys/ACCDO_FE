/** Módulo Pagos — tabla pagos. */

/** pagos.estado */
export type PagoEstado = 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO';

/** pagos.metodo_pago */
export type PagoMetodo = 'YAPE' | 'PLIN' | 'TRANSFERENCIA' | 'EFECTIVO';

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

/** POST /api/pagos */
export interface PagoRequest {
  inscripcionId: string;
  monto: number;
  metodoPago: PagoMetodo;
  numeroOperacion: string;
  comprobante?: string;
  observaciones?: string;
}

/** PATCH /api/pagos/{id}/rechazar */
export interface MotivoRequest {
  motivo: string;
}

/** Vista denormalizada para UI (joins en cliente). */
export interface PagoView extends Pago {
  codigo: string;
  nombreGrupo: string;
  responsableNombre: string;
  /** Teléfono del responsable (WhatsApp directo desde la cola de pagos). */
  responsableTelefono: string;
  modalidad: string;
}
