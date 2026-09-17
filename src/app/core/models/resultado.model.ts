/** Módulo Resultados — tabla resultados. */

export interface Resultado {
  id: string;
  inscripcionId: string;
  puesto: number;
  puntaje: number;
  observaciones: string;
  activo: boolean;
  createdAt: string;
}

/** POST /api/resultados · PUT /api/resultados/{id} */
export interface ResultadoRequest {
  inscripcionId: string;
  puesto: number;
  puntaje: number;
  observaciones?: string;
}

/** Vista denormalizada para UI (joins en cliente). */
export interface ResultadoView extends Resultado {
  nombreGrupo: string;
  categoriaId: string;
  categoriaNombre: string;
  eventoId: string;
  eventoNombre: string;
  codigoInscripcion: string;
}
