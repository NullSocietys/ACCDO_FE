import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Participante, ParticipanteRequest } from '../../models';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class ParticipanteApiService extends ApiBaseService {
  listar(inscripcionId: string): Observable<Participante[]> {
    return this.get<Participante[]>(`/inscripciones/${inscripcionId}/participantes`);
  }

  /** Nómina pública vía código de inscripción (seguimiento). */
  listarPorCodigo(codigo: string): Observable<Participante[]> {
    return this.get<Participante[]>(`/inscripciones/0/participantes/publico/${encodeURIComponent(codigo)}`);
  }

  listarInactivos(inscripcionId: string): Observable<Participante[]> {
    return this.get<Participante[]>(`/inscripciones/${inscripcionId}/participantes/inactivos`);
  }

  agregar(inscripcionId: string, p: ParticipanteRequest): Observable<Participante> {
    return this.post<Participante>(`/inscripciones/${inscripcionId}/participantes`, p);
  }

  eliminar(inscripcionId: string, participanteId: string): Observable<void> {
    return this.delete<void>(`/inscripciones/${inscripcionId}/participantes/${participanteId}`);
  }

  restaurar(inscripcionId: string, participanteId: string): Observable<Participante> {
    return this.patch<Participante>(
      `/inscripciones/${inscripcionId}/participantes/${participanteId}/restaurar`,
    );
  }

  eliminarFisico(inscripcionId: string, participanteId: string): Observable<void> {
    return this.delete<void>(
      `/inscripciones/${inscripcionId}/participantes/${participanteId}/fisico`,
    );
  }
}