import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from '../services/auth-session.service';

/** Protege /admin/** — exige sesión con rol ADMIN. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);

  if (auth.isAdmin()) {
    return true;
  }

  // Participante autenticado: no borrar sesión; solo negar el panel.
  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/inscribirse']);
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/** Si ya hay admin autenticado, evita volver al formulario de login admin. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);

  if (auth.isAdmin()) {
    return router.createUrlTree(['/admin']);
  }

  return true;
};

/**
 * Evita mostrar /acceso si ya hay sesión de delegado.
 * Sesión de admin NO se redirige al panel desde aquí (el login público
 * no es puerta al panel de organización).
 */
export const publicGuestGuard: CanActivateFn = (route) => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  // Organizador con sesión: vuelve a la portada; el panel solo vía /login.
  if (auth.isAdmin()) {
    return router.createUrlTree(['/']);
  }

  const returnUrl = route.queryParamMap.get('returnUrl');
  const safe =
    returnUrl &&
    returnUrl.startsWith('/') &&
    !returnUrl.startsWith('//') &&
    returnUrl !== '/admin' &&
    !returnUrl.startsWith('/admin/')
      ? returnUrl
      : '/';
  return router.parseUrl(safe);
};
