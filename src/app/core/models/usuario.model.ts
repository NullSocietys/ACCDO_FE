/** Módulo Usuarios — tabla usuarios + DTOs de autenticación. */

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  /** Solo mock; nunca se expone en UI. */
  password: string;
  activo: boolean;
  createdAt: string;
}

/** POST /api/usuarios/registro */
export interface RegistroRequest {
  nombre: string;
  correo: string;
  password: string;
}

/** PUT /api/usuarios/{id} — password opcional (vacío = no cambia) */
export interface ActualizarRequest {
  nombre: string;
  correo: string;
  password?: string;
}

/** POST /api/usuarios/login */
export interface LoginRequest {
  correo: string;
  password: string;
}
