import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { LandingPage } from './features/landing/landing.page';

export const routes: Routes = [
  {
    path: '',
    component: LandingPage,
    pathMatch: 'full',
  },
  {
    path: 'admin',
    component: ShellComponent,
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