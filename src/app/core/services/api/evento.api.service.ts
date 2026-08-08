import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Evento, EventoPayload } from '../../models';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class EventoApiService extends ApiBaseService {
  private readonly evento = (e: any): Evento => ({
    id: e.id as string,
    nombre: e.nombre as string,
    descripcion: (e.descripcion as string) ?? '',
    fecha: this.toDate(e.fecha),
    hora: this.toTime(e.hora),
    lugar: (e.lugar as string) ?? '',
    estado: e.estado as Evento['estado'],
    activo: e.activo as boolean,
    createdAt: (e.createdAt as string) ?? '',
  });

  listar(): Observable<Evento[]> {
    return this.get<Evento[]>('/eventos').pipe(map((lista) => lista.map(this.evento)));
  }

  listarInactivos(): Observable<Evento[]> {
    return this.get<Evento[]>('/eventos/inactivos').pipe(
      map((lista) => lista.map(this.evento)),
    );
  }

  obtener(id: string): Observable<Evento> {
    return this.get<Evento>(`/eventos/${id}`).pipe(map(this.evento));
  }

  crear(e: EventoPayload): Observable<Evento> {
    return this.post<Evento>('/eventos', e).pipe(map(this.evento));
  }

  actualizar(id: string, e: EventoPayload): Observable<Evento> {
    return this.put<Evento>(`/eventos/${id}`, e).pipe(map(this.evento));
  }

  cambiarEstado(id: string, estado: string): Observable<Evento> {
    return this.patch<Evento>(`/eventos/${id}/estado`, { estado }).pipe(map(this.evento));
  }

  eliminarLogico(id: string): Observable<Evento> {
    return this.patch<Evento>(`/eventos/${id}/eliminar`).pipe(map(this.evento));
  }

  restaurar(id: string): Observable<Evento> {
    return this.patch<Evento>(`/eventos/${id}/restaurar`).pipe(map(this.evento));
  }

  eliminarFisico(id: string): Observable<void> {
    return this.delete<void>(`/eventos/${id}`);
  }
}