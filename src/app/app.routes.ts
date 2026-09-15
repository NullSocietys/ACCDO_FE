import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { LandingPage } from './features/landing/landing.page';
import { NotFoundPage } from './features/not-found/not-found.page';
import { adminGuard, guestGuard, inscribirseGuard, clienteGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    component: LandingPage,
    pathMatch: 'full',
  },
  {
    // Alias histórico: la pantalla dedicada se fusionó con el wizard.
    path: 'acceso',
    redirectTo: 'inscribirse',
    pathMatch: 'full',
  },
  {
    path: 'inscribirse',
    canActivate: [inscribirseGuard],
    loadComponent: () =>
      import('./features/inscripcion-publica/inscripcion-publica.page').then(
        (m) => m.InscripcionPublicaPage,
      ),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'mi-cuenta',
    canActivate: [clienteGuard],
    loadComponent: () =>
      import('./features/mi-cuenta/mi-cuenta.page').then((m) => m.MiCuentaPage),
  },
  {
    path: 'seguimiento',
    loadComponent: () =>
      import('./features/inscripcion-publica/seguimiento.page').then((m) => m.SeguimientoPage),
  },
  {
    path: 'seguimiento/:codigo',
    loadComponent: () =>
      import('./features/inscripcion-publica/seguimiento.page').then((m) => m.SeguimientoPage),
  },
  {
    path: 'reclamos',
    loadComponent: () =>
      import('./features/reclamos/reclamos.page').then((m) => m.ReclamosPage),
  },
  {
    path: 'admin',
    component: ShellComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'eventos',
        loadComponent: () =>
          import('./features/eventos/eventos.page').then((m) => m.EventosPage),
      },
      {
        path: 'inscripciones',
        loadComponent: () =>
          import('./features/inscripciones/inscripciones.page').then((m) => m.InscripcionesPage),
      },
      {
        path: 'inscripciones/nueva',
        loadComponent: () =>
          import('./features/inscripciones/inscripcion-wizard.page').then(
            (m) => m.InscripcionWizardPage,
          ),
      },
      {
        // La nómina vive dentro del flujo de inscripciones (detalle de cada una).
        path: 'participantes',
        redirectTo: 'inscripciones',
        pathMatch: 'full',
      },
      {
        path: 'pagos',
        loadComponent: () => import('./features/pagos/pagos.page').then((m) => m.PagosPage),
      },
      {
        path: 'reclamos',
        loadComponent: () =>
          import('./features/reclamos/reclamos-admin.page').then((m) => m.ReclamosAdminPage),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/usuarios/usuarios.page').then((m) => m.UsuariosPage),
      },
      {
        path: 'resultados',
        loadComponent: () =>
          import('./features/resultados/resultados.page').then((m) => m.ResultadosPage),
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./features/reportes/reportes.page').then((m) => m.ReportesPage),
      },
      {
        path: 'bases',
        loadComponent: () => import('./features/bases/bases.page').then((m) => m.BasesPage),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./features/configuracion/configuracion.page').then((m) => m.ConfiguracionPage),
      },
    ],
  },
  { path: '**', component: NotFoundPage },
];
