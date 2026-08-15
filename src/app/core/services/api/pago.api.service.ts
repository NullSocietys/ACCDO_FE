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

  /** Sube el voucher (multipart) a Cloudinary / disco vía backend. */
  adjuntarComprobante(pagoId: string, archivo: File): Observable<Pago> {
    const form = new FormData();
    form.append('archivo', archivo, archivo.name);
    return this.postFormData<Pago>(`/pagos/${pagoId}/comprobante`, form);
  }

  /** URL del endpoint de comprobante (admin con JWT, o redirect Cloudinary). */
  urlComprobante(pagoId: string): string {
    return `${this.url}/pagos/${pagoId}/comprobante`;
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