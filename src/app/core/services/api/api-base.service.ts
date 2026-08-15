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

  private manejarError(e: HttpErrorResponse): Observable<never> {
    const msg =
      e.error && typeof e.error === 'object' && e.error.mensaje
        ? (e.error.mensaje as string)
        : e.status === 0
          ? 'No se pudo conectar con el servidor'
          : `Error ${e.status}: ${e.statusText ?? 'desconocido'}`;
    return throwError(() => new Error(msg));
  }
}