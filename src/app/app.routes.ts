import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { LandingPage } from './features/landing/landing.page';
import { adminGuard, guestGuard, publicGuestGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    component: LandingPage,
    pathMatch: 'full',
  },
  {
    path: 'acceso',
    canActivate: [publicGuestGuard],
    loadComponent: () =>
      import('./features/auth/acceso.page').then((m) => m.AccesoPage),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'inscribirse',
    loadComponent: () =>
      import('./features/inscripcion-publica/inscripcion-publica.page').then(
        (m) => m.InscripcionPublicaPage,
      ),
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
        path: 'participantes',
        loadComponent: () =>
          import('./features/participantes/participantes.page').then((m) => m.ParticipantesPage),
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
  { path: '**', redirectTo: '' },
];
