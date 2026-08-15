import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthResponse, AuthUsuario, LoginRequest, Usuario } from '../../models';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class AuthApiService extends ApiBaseService {
  login(datos: LoginRequest): Observable<AuthResponse> {
    return this.post<AuthResponse>('/auth/login', datos);
  }

  refresh(refreshToken: string): Observable<AuthResponse> {
    return this.post<AuthResponse>('/auth/refresh', { refreshToken });
  }

  logout(refreshToken: string): Observable<void> {
    return this.post<void>('/auth/logout', { refreshToken });
  }

  me(): Observable<AuthUsuario> {
    return this.get<Usuario>('/auth/me').pipe(
      map((u) => ({
        id: u.id,
        nombre: u.nombre,
        correo: u.correo,
        activo: u.activo,
        roles: (u.roles ?? []) as AuthUsuario['roles'],
        createdAt: u.createdAt,
      })),
    );
  }
}
