import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Resultado, ResultadoRequest } from '../../models';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class ResultadoApiService extends ApiBaseService {
  listarPorInscripcion(inscripcionId: string): Observable<Resultado[]> {
    return this.get<Resultado[]>(`/inscripciones/${inscripcionId}/resultados`);
  }

  listarInactivos(inscripcionId: string): Observable<Resultado[]> {
    return this.get<Resultado[]>(`/inscripciones/${inscripcionId}/resultados/inactivos`);
  }

  listarPorEvento(eventoId: string): Observable<Resultado[]> {
    return this.get<Resultado[]>(`/eventos/${eventoId}/resultados`);
  }

  registrar(req: ResultadoRequest): Observable<Resultado> {
    return this.post<Resultado>('/resultados', req);
  }

  actualizar(id: string, req: ResultadoRequest): Observable<Resultado> {
    return this.put<Resultado>(`/resultados/${id}`, req);
  }

  eliminar(id: string): Observable<void> {
    return this.delete<void>(`/resultados/${id}`);
  }

  restaurar(id: string): Observable<Resultado> {
    return this.patch<Resultado>(`/resultados/${id}/restaurar`);
  }

  eliminarFisico(id: string): Observable<void> {
    return this.delete<void>(`/resultados/${id}/fisico`);
  }
}