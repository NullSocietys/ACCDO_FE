/** Módulo Participantes — tabla participantes. */

export type Sexo = 'M' | 'F' | 'O';

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

/** POST /api/inscripciones/{inscripcionId}/participantes · anidado en InscripcionRequest */
export interface ParticipanteRequest {
  nombres: string;
  apellidos: string;
  dni: string;
  edad: number;
  sexo: Sexo;
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
