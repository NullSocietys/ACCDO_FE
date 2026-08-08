/** Módulo Responsables — tabla responsables. */

export interface Responsable {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  correo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  activo: boolean;
  createdAt: string;
}

/** POST /api/responsables · PUT /api/responsables/{id} · anidado en InscripcionRequest */
export interface ResponsableRequest {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  correo: string;
  departamento: string;
  provincia: string;
  distrito: string;
}
