/** Módulo Participantes — tabla participantes. */

export type Sexo = 'M' | 'F' | 'O';

export interface Participante {
  id: string;
  inscripcionId: string;
  /** Nombre completo del integrante */
  nombres: string;
  /** Celular opcional (9 dígitos, empieza con 9); puede venir null del API */
  celular: string | null;
  /** @deprecated Campos legacy; pueden venir null desde el API */
  apellidos?: string | null;
  dni?: string | null;
  edad?: number | null;
  sexo?: Sexo | null;
  activo: boolean;
  createdAt: string;
}

/** POST /api/inscripciones/{inscripcionId}/participantes · anidado en InscripcionRequest */
export interface ParticipanteRequest {
  nombres: string;
  /** Opcional: se omite si va vacío (permitir skipear datos). */
  celular?: string;
}

export interface ParticipanteView extends Participante {
  nombreGrupo: string;
  categoriaNombre: string;
  eventoNombre: string;
  responsableNombre: string;
  codigoInscripcion: string;
  estadoInscripcion: InscripcionEstado;
}

import type { InscripcionEstado } from './inscripcion.model';
