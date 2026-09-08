import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ActualizarRequest, ContactoRequest, LoginRequest, RegistroRequest, Usuario } from '../../models';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class UsuarioApiService extends ApiBaseService {
  private readonly usuarioServidor = (u: any): Usuario => ({ ...u, password: '' } as Usuario);

  registrar(datos: RegistroRequest): Observable<Usuario> {
    return this.post<Usuario>('/usuarios/registro', datos).pipe(map(this.usuarioServidor));
  }

  /** Actualiza los datos de contacto del usuario autenticado (sin tocar correo/password). */
  actualizarMiContacto(datos: ContactoRequest): Observable<Usuario> {
    return this.patch<Usuario>('/usuarios/mi/contacto', datos).pipe(map(this.usuarioServidor));
  }

  login(datos: LoginRequest): Observable<Usuario> {
    return this.post<Usuario>('/usuarios/login', datos).pipe(map(this.usuarioServidor));
  }
  listar(): Observable<Usuario[]> {
    return this.get<Usuario[]>('/usuarios').pipe(map((lista) => lista.map(this.usuarioServidor)));
  }

  listarInactivos(): Observable<Usuario[]> {
    return this.get<Usuario[]>('/usuarios/inactivos').pipe(
      map((lista) => lista.map(this.usuarioServidor)),
    );
  }

  obtener(id: string): Observable<Usuario> {
    return this.get<Usuario>(`/usuarios/${id}`).pipe(map(this.usuarioServidor));
  }

  actualizar(id: string, datos: ActualizarRequest): Observable<Usuario> {
    return this.put<Usuario>(`/usuarios/${id}`, datos).pipe(map(this.usuarioServidor));
  }

  eliminarLogico(id: string): Observable<Usuario> {
    return this.patch<Usuario>(`/usuarios/${id}/eliminar`).pipe(map(this.usuarioServidor));
  }

  restaurar(id: string): Observable<Usuario> {
    return this.patch<Usuario>(`/usuarios/${id}/restaurar`).pipe(map(this.usuarioServidor));
  }

  eliminarFisico(id: string): Observable<void> {
    return this.delete<void>(`/usuarios/${id}`);
  }
}