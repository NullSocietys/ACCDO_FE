import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Reclamo, ReclamoRequest } from '../../models';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class ReclamoApiService extends ApiBaseService {
  private readonly mapReclamo = (r: Record<string, unknown>): Reclamo => ({
    id: r['id'] as string,
    eventoId: r['eventoId'] as string,
    nombreGrupo: (r['nombreGrupo'] as string) ?? '',
    encargadoNombres: (r['encargadoNombres'] as string) ?? '',
    encargadoApellidos: (r['encargadoApellidos'] as string) ?? '',
    encargadoDni: (r['encargadoDni'] as string) ?? '',
    telefono: (r['telefono'] as string) ?? '',
    correo: (r['correo'] as string) ?? '',
    mensaje: (r['mensaje'] as string) ?? '',
    estado: (r['estado'] as Reclamo['estado']) ?? 'PENDIENTE',
    activo: (r['activo'] as boolean) ?? true,
    createdAt: (r['createdAt'] as string) ?? '',
  });

  /** Público: el encargado real registra el reclamo. */
  crear(req: ReclamoRequest): Observable<Reclamo> {
    return this.post<Record<string, unknown>>('/reclamos', req).pipe(
      map(this.mapReclamo),
    );
  }

  /** Admin: pendientes (activo = true). */
  listarPendientes(): Observable<Reclamo[]> {
    return this.get<Record<string, unknown>[]>('/reclamos').pipe(
      map((lista) => lista.map(this.mapReclamo)),
    );
  }

  /** Admin: histórico atendidos. */
  listarAtendidos(): Observable<Reclamo[]> {
    return this.get<Record<string, unknown>[]>('/reclamos/atendidos').pipe(
      map((lista) => lista.map(this.mapReclamo)),
    );
  }

  atender(id: string): Observable<Reclamo> {
    return this.patch<Record<string, unknown>>(`/reclamos/${id}/atender`).pipe(
      map(this.mapReclamo),
    );
  }

  restaurar(id: string): Observable<Reclamo> {
    return this.patch<Record<string, unknown>>(`/reclamos/${id}/restaurar`).pipe(
      map(this.mapReclamo),
    );
  }

  eliminar(id: string): Observable<void> {
    return this.delete<void>(`/reclamos/${id}`);
  }
}
