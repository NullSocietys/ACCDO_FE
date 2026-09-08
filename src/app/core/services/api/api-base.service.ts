import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';

/** Base con helpers HTTP + normalización de respuestas del backend. */
export abstract class ApiBaseService {
  protected readonly http = inject(HttpClient);
  protected readonly base = environment.apiUrl;
  protected readonly url = `${this.base}/api`;

  protected get<T>(path: string): Observable<T> {
    return this.http.get<T>(this.url + path).pipe(catchError((e) => this.manejarError(e)));
  }

  protected post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<T>(this.url + path, body)
      .pipe(catchError((e) => this.manejarError(e)));
  }

  /** POST multipart (FormData); no Content-Type manual — el browser pone el boundary. */
  protected postFormData<T>(path: string, form: FormData): Observable<T> {
    return this.http
      .post<T>(this.url + path, form)
      .pipe(catchError((e) => this.manejarError(e)));
  }

  protected put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.url + path, body).pipe(catchError((e) => this.manejarError(e)));
  }

  protected patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http
      .patch<T>(this.url + path, body ?? {})
      .pipe(catchError((e) => this.manejarError(e)));
  }

  protected delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url + path).pipe(catchError((e) => this.manejarError(e)));
  }

  /** Normaliza fechas/horas del backend (LocalDate -> YYYY-MM-DD, LocalTime -> HH:mm). */
  protected toDate(v: unknown): string {
    return typeof v === 'string' ? v.slice(0, 10) : '';
  }

  protected toTime(v: unknown): string {
    return typeof v === 'string' ? v.slice(0, 5) : '';
  }

  /**
   * Traduce errores técnicos a mensajes que un cliente entiende.
   * El detalle técnico (status, stack) queda en la consola para el desarrollador.
   */
  private manejarError(e: HttpErrorResponse): Observable<never> {
    const mensajeBE =
      e.error && typeof e.error === 'object' && (e.error as { mensaje?: string }).mensaje
        ? String((e.error as { mensaje?: string }).mensaje)
        : '';

    let msg: string;
    if (mensajeBE) {
      // Los mensajes del backend ya están escritos para el cliente.
      msg = mensajeBE;
    } else if (e.status === 0) {
      msg = 'No pudimos conectarnos. Revisa tu conexión a internet e inténtalo de nuevo.';
    } else if (e.status === 400) {
      msg = 'Revisa los datos que ingresaste e inténtalo de nuevo.';
    } else if (e.status === 401) {
      msg = 'Tu sesión expiró. Entra de nuevo para continuar.';
    } else if (e.status === 403) {
      msg = 'No tienes permiso para esta acción. Verifica que entraste con tu cuenta.';
    } else if (e.status === 404) {
      msg = 'No encontramos lo que buscabas. Verifica los datos e inténtalo de nuevo.';
    } else if (e.status === 409) {
      msg = 'Ese dato ya está registrado. Verifica e inténtalo de nuevo.';
    } else if (e.status >= 500) {
      msg = 'Tuvimos un problema inesperado. Espera unos minutos e inténtalo de nuevo.';
    } else {
      msg = 'No se pudo completar la operación. Inténtalo de nuevo.';
    }

    if (e.status >= 500 || e.status === 0) {
      console.error('[API]', e.status, e.url, e.error);
    }
    return throwError(() => new Error(msg));
  }
}