import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Configuracion } from '../../models';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class ConfiguracionApiService extends ApiBaseService {
  private readonly conf = (c: any): Configuracion => ({
    id: c.id as string,
    nombreAsociacion: (c.nombreAsociacion as string) ?? '',
    telefono: (c.telefono as string) ?? '',
    correo: (c.correo as string) ?? '',
    direccion: (c.direccion as string) ?? '',
    cuentaBancaria: (c.cuentaBancaria as string) ?? '',
    numeroYape: (c.numeroYape as string) ?? '',
    numeroPlin: (c.numeroPlin as string) ?? '',
    coordinadoraGeneral: (c.coordinadoraGeneral as string) ?? '',
    logoUrl: (c.logoUrl as string) ?? '',
    mensajeConfirmacion: (c.mensajeConfirmacion as string) ?? '',
    fechaLimiteInscripcion: this.toDate(c.fechaLimiteInscripcion),
    fechaSorteo: this.toDate(c.fechaSorteo),
    horaSorteo: this.toTime(c.horaSorteo),
    horaInicioConcurso: this.toTime(c.horaInicioConcurso),
    activo: c.activo as boolean,
    createdAt: (c.createdAt as string) ?? '',
  });

  listar(): Observable<Configuracion[]> {
    return this.get<Configuracion[]>('/configuracion').pipe(
      map((lista) => lista.map(this.conf)),
    );
  }

  listarInactivas(): Observable<Configuracion[]> {
    return this.get<Configuracion[]>('/configuracion/inactivas').pipe(
      map((lista) => lista.map(this.conf)),
    );
  }

  obtenerActiva(): Observable<Configuracion> {
    return this.get<Configuracion>('/configuracion/activa').pipe(map(this.conf));
  }

  obtener(id: string): Observable<Configuracion> {
    return this.get<Configuracion>(`/configuracion/${id}`).pipe(map(this.conf));
  }

  crear(config: Configuracion): Observable<Configuracion> {
    return this.post<Configuracion>('/configuracion', config).pipe(map(this.conf));
  }

  actualizar(id: string, config: Configuracion): Observable<Configuracion> {
    return this.put<Configuracion>(`/configuracion/${id}`, config).pipe(map(this.conf));
  }

  eliminarLogico(id: string): Observable<Configuracion> {
    return this.patch<Configuracion>(`/configuracion/${id}/eliminar`).pipe(map(this.conf));
  }

  restaurar(id: string): Observable<Configuracion> {
    return this.patch<Configuracion>(`/configuracion/${id}/restaurar`).pipe(map(this.conf));
  }

  eliminarFisico(id: string): Observable<void> {
    return this.delete<void>(`/configuracion/${id}`);
  }
}
