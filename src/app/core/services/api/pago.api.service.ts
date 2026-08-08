import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Pago, PagoRequest } from '../../models';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class PagoApiService extends ApiBaseService {
  listarPorInscripcion(inscripcionId: string): Observable<Pago[]> {
    return this.get<Pago[]>(`/inscripciones/${inscripcionId}/pagos`);
  }

  listarInactivos(inscripcionId: string): Observable<Pago[]> {
    return this.get<Pago[]>(`/inscripciones/${inscripcionId}/pagos/inactivos`);
  }

  obtener(id: string): Observable<Pago> {
    return this.get<Pago>(`/pagos/${id}`);
  }

  registrar(req: PagoRequest): Observable<Pago> {
    return this.post<Pago>('/pagos', req);
  }

  confirmar(id: string): Observable<Pago> {
    return this.patch<Pago>(`/pagos/${id}/confirmar`);
  }

  rechazar(id: string, motivo: string): Observable<Pago> {
    return this.patch<Pago>(`/pagos/${id}/rechazar`, { motivo });
  }

  eliminarLogico(id: string): Observable<Pago> {
    return this.patch<Pago>(`/pagos/${id}/eliminar`);
  }

  restaurar(id: string): Observable<Pago> {
    return this.patch<Pago>(`/pagos/${id}/restaurar`);
  }

  eliminarFisico(id: string): Observable<void> {
    return this.delete<void>(`/pagos/${id}`);
  }
}