import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Categoria, CategoriaPayload } from '../../models';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class CategoriaApiService extends ApiBaseService {
  listar(activas?: boolean): Observable<Categoria[]> {
    const qs = activas === undefined ? '' : `?activas=${activas}`;
    return this.get<Categoria[]>(`/categorias${qs}`);
  }

  listarInactivas(): Observable<Categoria[]> {
    return this.get<Categoria[]>('/categorias/inactivas');
  }

  obtener(id: string): Observable<Categoria> {
    return this.get<Categoria>(`/categorias/${id}`);
  }

  crear(categoria: CategoriaPayload): Observable<Categoria> {
    return this.post<Categoria>('/categorias', categoria);
  }

  actualizar(id: string, categoria: CategoriaPayload): Observable<Categoria> {
    return this.put<Categoria>(`/categorias/${id}`, categoria);
  }

  eliminarLogico(id: string): Observable<Categoria> {
    return this.patch<Categoria>(`/categorias/${id}/eliminar`);
  }

  restaurar(id: string): Observable<Categoria> {
    return this.patch<Categoria>(`/categorias/${id}/restaurar`);
  }

  eliminarFisico(id: string): Observable<void> {
    return this.delete<void>(`/categorias/${id}`);
  }
}