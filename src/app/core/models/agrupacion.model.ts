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
