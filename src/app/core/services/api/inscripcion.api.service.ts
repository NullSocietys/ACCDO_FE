import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Inscripcion, InscripcionRequest } from '../../models';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class InscripcionApiService extends ApiBaseService {
  listar(eventoId?: string): Observable<Inscripcion[]> {
    const qs = eventoId ? `?eventoId=${eventoId}` : '';
    return this.get<Inscripcion[]>(`/inscripciones${qs}`);
  }

  listarInactivas(): Observable<Inscripcion[]> {
    return this.get<Inscripcion[]>('/inscripciones/inactivas');
  }

  obtener(id: string): Observable<Inscripcion> {
    return this.get<Inscripcion>(`/inscripciones/${id}`);
  }

  obtenerPorCodigo(codigo: string): Observable<Inscripcion> {
    return this.get<Inscripcion>(`/inscripciones/codigo/${codigo}`);
  }

  crear(req: InscripcionRequest): Observable<Inscripcion> {
    return this.post<Inscripcion>('/inscripciones', req);
  }

  cambiarEstado(id: string, estado: string): Observable<Inscripcion> {
    return this.patch<Inscripcion>(`/inscripciones/${id}/estado`, { estado });
  }

  eliminarLogico(id: string): Observable<Inscripcion> {
    return this.patch<Inscripcion>(`/inscripciones/${id}/eliminar`);
  }

  restaurar(id: string): Observable<Inscripcion> {
    return this.patch<Inscripcion>(`/inscripciones/${id}/restaurar`);
  }

  eliminarFisico(id: string): Observable<void> {
    return this.delete<void>(`/inscripciones/${id}`);
  }
}