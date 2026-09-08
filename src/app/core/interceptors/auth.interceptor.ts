import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthSessionService, readAccessToken } from '../services/auth-session.service';

const AUTH_PUBLIC = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout', '/api/usuarios/registro'];

function redirectAfterAuthLoss(router: Router): void {
  const url = router.url;
  const adminArea = url.startsWith('/admin') || url.startsWith('/login');
  void router.navigate([adminArea ? '/login' : '/inscribirse'], {
    queryParams: {
      returnUrl: adminArea
        ? url.startsWith('/admin')
          ? url
          : '/admin'
        : url.startsWith('/inscribirse')
          ? null
          : url,
    },
  });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const router = inject(Router);

  const isPublicAuth = AUTH_PUBLIC.some((p) => req.url.includes(p));
  const token = readAccessToken();

  const authReq =
    token && !isPublicAuth
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || isPublicAuth) {
        return throwError(() => err);
      }

      if (req.headers.has('X-Auth-Retry')) {
        injector.get(AuthSessionService).clearSession();
        redirectAfterAuthLoss(router);
        return throwError(() => err);
      }

      const auth = injector.get(AuthSessionService);
      return auth.refreshAccessToken().pipe(
        switchMap((accessToken) =>
          next(
            req.clone({
              setHeaders: {
                Authorization: `Bearer ${accessToken}`,
                'X-Auth-Retry': '1',
              },
            }),
          ),
        ),
        catchError(() => {
          auth.clearSession();
          redirectAfterAuthLoss(router);
          return throwError(() => err);
        }),
      );
    }),
  );
};
