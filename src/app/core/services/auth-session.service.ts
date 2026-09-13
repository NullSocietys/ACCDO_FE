import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, throwError, timeout } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  AuthUsuario,
  LoginRequest,
  RegistroRequest,
  RolNombre,
} from '../models';

const ACCESS_KEY = 'chicote.accessToken';
const REFRESH_KEY = 'chicote.refreshToken';
const USER_KEY = 'chicote.usuario';
const AUTH_URL = `${environment.apiUrl}/api/auth`;
const USUARIOS_URL = `${environment.apiUrl}/api/usuarios`;
const LOGIN_TIMEOUT_MS = 20_000;

/** Lectura síncrona para el interceptor (sin DI circular). */
export function readAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export type LoginMode = 'admin' | 'public';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  /** Sin interceptores: login/refresh/logout no entran en el ciclo DI. */
  private readonly http = new HttpClient(inject(HttpBackend));

  private readonly usuarioSignal = signal<AuthUsuario | null>(this.readUsuario());
  private readonly accessTokenSignal = signal<string | null>(readAccessToken());
  private readonly refreshTokenSignal = signal<string | null>(this.read(REFRESH_KEY));

  private refreshInFlight: Observable<string> | null = null;

  readonly usuario = this.usuarioSignal.asReadonly();
  readonly accessToken = this.accessTokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.accessTokenSignal() && !!this.usuarioSignal());
  readonly isAdmin = computed(() => this.hasAdminRole(this.usuarioSignal()?.roles));
  readonly isCliente = computed(() => {
    const roles = this.normalizeRoles(this.usuarioSignal()?.roles);
    return roles.includes('CLIENTE') && !roles.includes('ADMIN');
  });

  /** Login al panel de administración (exige rol ADMIN). */
  login(datos: LoginRequest): Observable<AuthUsuario> {
    return this.authenticate(datos, 'admin');
  }

  /** Login público para delegados / participantes. */
  loginPublic(datos: LoginRequest): Observable<AuthUsuario> {
    return this.authenticate(datos, 'public');
  }

  /** Registro de participante + emisión de JWT. */
  register(datos: RegistroRequest): Observable<AuthUsuario> {
    const correo = datos.correo.trim().toLowerCase();
    return this.http.post(`${USUARIOS_URL}/registro`, { ...datos, correo }).pipe(
      timeout({ first: LOGIN_TIMEOUT_MS }),
      switchMap(() => this.authenticate({ correo, password: datos.password }, 'public')),
      catchError((err) => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  logout(): Observable<void> {
    const refreshToken = this.refreshTokenSignal();
    const clear = () => this.clearSession();

    if (!refreshToken) {
      clear();
      return of(undefined);
    }

    return this.http.post<void>(`${AUTH_URL}/logout`, { refreshToken }).pipe(
      timeout({ first: 8_000 }),
      catchError(() => of(undefined)),
      finalize(clear),
      map(() => undefined),
    );
  }

  /** Renueva el access token. Devuelve el nuevo access token. */
  refreshAccessToken(): Observable<string> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    const refreshToken = this.refreshTokenSignal();
    if (!refreshToken) {
      this.clearSession();
      return throwError(() => new Error('Sesión expirada'));
    }

    this.refreshInFlight = this.http.post<AuthResponse>(`${AUTH_URL}/refresh`, { refreshToken }).pipe(
      timeout({ first: 12_000 }),
      tap((res) => {
        const roles = this.normalizeRoles(res.usuario?.roles);
        this.persist({ ...res, usuario: { ...res.usuario, roles } });
      }),
      map((res) => res.accessToken),
      catchError((err) => {
        this.clearSession();
        return throwError(() => err);
      }),
      finalize(() => {
        this.refreshInFlight = null;
      }),
      shareReplay(1),
    );

    return this.refreshInFlight;
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.accessTokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    this.usuarioSignal.set(null);
  }

  /**
   * Valida la sesión contra el backend (/api/auth/me). Un token guardado en
   * localStorage puede quedar huérfano (usuario borrado o BD restaurada):
   * el token sigue siendo válido criptográficamente, así que no hay 401 y
   * el backend rechaza recién en las operaciones con errores de negocio.
   *
   * OJO: este servicio usa HttpClient SIN interceptores (evita dependencia
   * circular), así que el header Authorization se agrega a mano. Sin él,
   * /me respondería 401 y limpiaría la sesión en cada carga de página.
   * En 4xx limpia la sesión local; en errores de red la conserva.
   */
  validarSesion(): Observable<AuthUsuario> {
    return this.verificarSesion().pipe(
      catchError((err) => {
        const status = (err as HttpErrorResponse)?.status ?? 0;
        if (status !== 401) {
          // 403/404/400 (usuario borrado/inactivo): limpiar. Red (0) o 5xx: conservar.
          if (status >= 400 && status < 500) {
            this.clearSession();
          }
          return throwError(() => err);
        }
        // Access token expirado: refrescar y reintentar una vez.
        return this.refreshAccessToken().pipe(
          switchMap(() => this.verificarSesion()),
          catchError((err2) => {
            const status2 = (err2 as HttpErrorResponse)?.status ?? 0;
            if (status2 >= 400 && status2 < 500) {
              this.clearSession();
            }
            return throwError(() => err2);
          }),
        );
      }),
    );
  }

  /** GET /me con el token manual. 401 si no hay token. */
  private verificarSesion(): Observable<AuthUsuario> {
    const token = this.accessTokenSignal();
    const req$: Observable<AuthUsuario> = token
      ? this.http.get<AuthUsuario>(`${AUTH_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      : throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Sin token' }));
    return req$.pipe(
      timeout({ first: 10_000 }),
      map((u) => {
        const usuario: AuthUsuario = { ...u, roles: this.normalizeRoles(u.roles) };
        localStorage.setItem(USER_KEY, JSON.stringify(usuario));
        this.usuarioSignal.set(usuario);
        return usuario;
      }),
    );
  }

  /** Mantiene la sesión local alineada tras actualizar el perfil de contacto. */
  actualizarContactoLocal(contacto: Pick<AuthUsuario,
    'nombre' | 'dni' | 'telefono' | 'departamento' | 'provincia' | 'distrito'>): void {
    const actual = this.usuarioSignal();
    if (!actual) return;
    const usuario: AuthUsuario = { ...actual, ...contacto };
    localStorage.setItem(USER_KEY, JSON.stringify(usuario));
    this.usuarioSignal.set(usuario);
  }

  /** Destino por defecto tras autenticarse. */
  defaultHome(): string {
    return this.isAdmin() ? '/admin' : '/';
  }

  initials(): string {
    const nombre = this.usuarioSignal()?.nombre?.trim() ?? '';
    if (!nombre) return 'US';
    const parts = nombre.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private authenticate(datos: LoginRequest, mode: LoginMode): Observable<AuthUsuario> {
    return this.http
      .post<AuthResponse>(`${AUTH_URL}/login`, {
        ...datos,
        correo: datos.correo.trim().toLowerCase(),
      })
      .pipe(
      timeout({ first: LOGIN_TIMEOUT_MS }),
      switchMap((res) => {
        const roles = this.normalizeRoles(res?.usuario?.roles);
        if (mode === 'admin' && !roles.includes('ADMIN')) {
          return throwError(
            () => new Error('Esta cuenta no tiene acceso al panel de administración'),
          );
        }
        // Login público nunca abre sesión de organizador (evita puente a /admin).
        if (mode === 'public' && roles.includes('ADMIN')) {
          return throwError(
            () =>
              new Error(
                'Esta cuenta es de organización. Usa el acceso de administración, no el de delegados.',
              ),
          );
        }
        
        const usuario: AuthUsuario = { ...res.usuario, roles };
        this.persist({ ...res, usuario });
        return of(usuario);
      }),
      catchError((err) => throwError(() => new Error(this.errorMessage(err)))),
    );
  }

  private persist(res: AuthResponse): void {
    localStorage.setItem(ACCESS_KEY, res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.usuario));
    this.accessTokenSignal.set(res.accessToken);
    this.refreshTokenSignal.set(res.refreshToken);
    this.usuarioSignal.set(res.usuario);
  }

  private hasAdminRole(roles: string[] | undefined): boolean {
    return this.normalizeRoles(roles).includes('ADMIN');
  }

  private normalizeRoles(roles: unknown): RolNombre[] {
    if (!Array.isArray(roles)) return [];
    return roles
      .map((r) => String(r).replace(/^ROLE_/i, '').toUpperCase())
      .filter((r): r is RolNombre => r === 'ADMIN' || r === 'CLIENTE');
  }

  private errorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'TimeoutError') {
      return 'El servidor tardó demasiado en responder. ¿Está el backend en marcha?';
    }
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && 'mensaje' in body && typeof body.mensaje === 'string') {
        return body.mensaje;
      }
      if (typeof body === 'string' && body.trim()) {
        try {
          const parsed = JSON.parse(body) as { mensaje?: string };
          if (parsed.mensaje) return parsed.mensaje;
        } catch {
          /* ignore */
        }
      }
      if (err.status === 0) return 'No se pudo conectar con el servidor';
      return `Error ${err.status}: ${err.statusText || 'desconocido'}`;
    }
    if (err instanceof Error && err.message) return err.message;
    return 'No se pudo iniciar sesión';
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private readUsuario(): AuthUsuario | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthUsuario;
      return { ...parsed, roles: this.normalizeRoles(parsed.roles) };
    } catch {
      return null;
    }
  }
}
