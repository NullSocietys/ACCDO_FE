/** Agrupación única asociada al usuario responsable. */
export interface Agrupacion {
  id: string;
  usuarioId: string;
  nombre: string;
  codigo: string;
  createdAt: string;
}

export interface AgrupacionCrearRequest {
  nombre: string;
}

/** Resultado de la verificación difusa de nombres de agrupación. */
export interface SimilarityResult {
  hayCoincidencia: boolean;
  nombrePropuesto: string;
  coincidencias: Coincidencia[];
}

export interface Coincidencia {
  nombreExistente: string;
  score: number;
  tipo: 'EXACT' | 'NEAR_EXACT' | 'HIGH_SIMILARITY' | 'MODERATE_SIMILARITY';
}
