import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Agrupacion, AgrupacionCrearRequest, SimilarityResult } from '../../models';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class AgrupacionApiService extends ApiBaseService {
  obtenerMi(): Observable<Agrupacion> {
    return this.get<Agrupacion>('/agrupaciones/mi');
  }

  crearMi(req: AgrupacionCrearRequest): Observable<Agrupacion> {
    return this.post<Agrupacion>('/agrupaciones/mi', req);
  }

  /** Uso administrativo: agrupación registrada de un cliente concreto. */
  obtenerDeUsuario(usuarioId: string): Observable<Agrupacion> {
    return this.get<Agrupacion>(`/agrupaciones/usuario/${usuarioId}`);
  }

  /** Verifica si un nombre es similar a algún grupo ya registrado (público). */
  verificarNombre(nombre: string): Observable<SimilarityResult> {
    const qs = encodeURIComponent(nombre.trim());
    return this.get<SimilarityResult>(`/agrupaciones/verificar-nombre?nombre=${qs}`);
  }
}
