/** Módulo Usuarios — tabla usuarios + DTOs de autenticación. */

export type RolNombre = 'ADMIN' | 'PARTICIPANTE';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  /** Solo mock / legado; nunca se expone en UI. */
  password: string;
  activo: boolean;
  createdAt: string;
  roles?: RolNombre[];
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

/** POST /api/auth/login y POST /api/usuarios/login */
export interface LoginRequest {
  correo: string;
  password: string;
}

/** Resumen de usuario en AuthResponse (sin password). */
export interface AuthUsuario {
  id: string;
  nombre: string;
  correo: string;
  activo: boolean;
  roles: RolNombre[];
  createdAt: string;
}

/** POST /api/auth/login | /api/auth/refresh */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: AuthUsuario;
}
