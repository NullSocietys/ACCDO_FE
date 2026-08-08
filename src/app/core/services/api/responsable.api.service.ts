import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Responsable, ResponsableRequest } from '../../models';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class ResponsableApiService extends ApiBaseService {
  listar(): Observable<Responsable[]> {
    return this.get<Responsable[]>('/responsables');
  }

  listarInactivos(): Observable<Responsable[]> {
    return this.get<Responsable[]>('/responsables/inactivos');
  }

  obtener(id: string): Observable<Responsable> {
    return this.get<Responsable>(`/responsables/${id}`);
  }

  crear(req: ResponsableRequest): Observable<Responsable> {
    return this.post<Responsable>('/responsables', req);
  }

  actualizar(id: string, req: ResponsableRequest): Observable<Responsable> {
    return this.put<Responsable>(`/responsables/${id}`, req);
  }

  eliminarLogico(id: string): Observable<Responsable> {
    return this.patch<Responsable>(`/responsables/${id}/eliminar`);
  }

  restaurar(id: string): Observable<Responsable> {
    return this.patch<Responsable>(`/responsables/${id}/restaurar`);
  }

  eliminarFisico(id: string): Observable<void> {
    return this.delete<void>(`/responsables/${id}`);
  }
}