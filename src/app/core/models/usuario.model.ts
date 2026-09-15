/** Módulo Usuarios — tabla usuarios + DTOs de autenticación. */

export type RolNombre = 'ADMIN' | 'CLIENTE';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  /** Solo mock / legado; nunca se expone en UI. */
  password: string;
  activo: boolean;
  createdAt: string;
  roles?: RolNombre[];
  /** Nombre de la única agrupación del usuario (solo clientes). */
  agrupacionNombre?: string | null;
  /** Datos de contacto del responsable (el backend los usa en sus inscripciones). */
  dni?: string | null;
  telefono?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
}

/** POST /api/usuarios/registro — incluye el contacto que se guarda en la cuenta. */
export interface RegistroRequest {
  nombre: string;
  correo: string;
  password: string;
  dni?: string;
  telefono?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  agrupacionNombre: string;
}

/** PATCH /api/usuarios/mi/contacto — actualiza el contacto del usuario autenticado. */
export interface ContactoRequest {
  nombre: string;
  dni?: string;
  telefono?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
}

/** PUT /api/usuarios/{id} — password opcional (vacío = no cambia); contacto opcional (null = no cambia) */
export interface ActualizarRequest {
  nombre: string;
  correo: string;
  password?: string;
  dni?: string;
  telefono?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
}

/** POST /api/auth/login y POST /api/auth/refresh */
export interface LoginRequest {
  correo: string;
  password: string;
}

/** Resumen de usuario en AuthResponse (sin password, con contacto). */
export interface AuthUsuario {
  id: string;
  nombre: string;
  correo: string;
  activo: boolean;
  roles: RolNombre[];
  createdAt: string;
  dni?: string | null;
  telefono?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
}

/** POST /api/auth/login | /api/auth/refresh */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: AuthUsuario;
}
