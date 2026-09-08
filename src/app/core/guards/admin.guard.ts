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

  // Cliente autenticado: no borrar sesión; solo negar el panel.
  if (auth.isCliente()) {
    return router.createUrlTree(['/mi-cuenta']);
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
 * Guard del wizard de inscripción (/inscribirse).
 * - Sin sesión: PERMITE el acceso (el paso 1 del wizard crea la cuenta o
 *   inicia sesión; /acceso ya no existe como pantalla separada).
 * - Con sesión CLIENTE: continúa directo (paso "Sesión activa").
 * - Con sesión ADMIN: el organizador no se inscribe; lo lleva a su panel.
 */
export const inscribirseGuard: CanActivateFn = () => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);

  if (auth.isAdmin()) {
    return router.createUrlTree(['/admin']);
  }

  return true;
};

/**
 * Rutas solo para clientes autenticados (/mi-cuenta).
 * Sin sesión lo manda al wizard (que incluye login) y recuerda el destino;
 * tras entrar, el wizard lo devuelve a ese destino.
 */
export const clienteGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);

  if (auth.isCliente()) {
    return true;
  }

  if (auth.isAdmin()) {
    return router.createUrlTree(['/admin']);
  }

  return router.createUrlTree(['/inscribirse'], {
    queryParams: { returnUrl: state.url },
  });
};
