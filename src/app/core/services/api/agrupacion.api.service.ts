import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Agrupacion, AgrupacionCrearRequest } from '../../models';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class AgrupacionApiService extends ApiBaseService {
  obtenerMi(): Observable<Agrupacion> {
    return this.get<Agrupacion>('/agrupaciones/mi');
  }

  crearMi(req: AgrupacionCrearRequest): Observable<Agrupacion> {
    return this.post<Agrupacion>('/agrupaciones/mi', req);
  }
}
