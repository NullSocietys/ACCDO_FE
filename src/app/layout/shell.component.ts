import { Component, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { ToastService } from '../core/services/toast.service';
import { IconComponent } from '../shared/icons/icon.component';
import { ConfirmDialogComponent } from '../shared/ui/confirm-dialog.component';
import { ToastHostComponent } from '../shared/ui/toast-host.component';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  index: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    ToastHostComponent,
    ConfirmDialogComponent,
  ],
  styleUrl: './shell.component.css',
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly collapsed = signal(false);
  readonly mobileOpen = signal(false);
  readonly navigating = signal(false);
  readonly pageTitle = signal('Principal');
  readonly sectionLabel = signal('General');

  readonly navGroups: NavGroup[] = (() => {
    let n = 0;
    const idx = () => String(++n).padStart(2, '0');
    return [
      {
        label: 'General',
        items: [{ label: 'Principal', path: '/', icon: 'layoutDashboard', index: idx() }],
      },
      {
        label: 'Gestión',
        items: [
          { label: 'Eventos', path: '/eventos', icon: 'calendar', index: idx() },
          { label: 'Inscripciones', path: '/inscripciones', icon: 'clipboardList', index: idx() },
          { label: 'Participantes', path: '/participantes', icon: 'users', index: idx() },
          { label: 'Pagos', path: '/pagos', icon: 'creditCard', index: idx() },
        ],
      },
      {
        label: 'Sistema',
        items: [
          { label: 'Resultados', path: '/resultados', icon: 'trophy', index: idx() },
          { label: 'Bases', path: '/bases', icon: 'fileText', index: idx() },
          { label: 'Configuración', path: '/configuracion', icon: 'settings', index: idx() },
        ],
      },
    ];
  })();

  private readonly titles: Record<string, { title: string; section: string }> = {
    '/': { title: 'Principal', section: 'General' },
    '/eventos': { title: 'Eventos', section: 'Gestión' },
    '/inscripciones': { title: 'Inscripciones', section: 'Gestión' },
    '/inscripciones/nueva': { title: 'Nueva inscripción', section: 'Gestión' },
    '/participantes': { title: 'Participantes', section: 'Gestión' },
    '/pagos': { title: 'Pagos', section: 'Gestión' },
    '/resultados': { title: 'Resultados', section: 'Sistema' },
    '/bases': { title: 'Bases del concurso', section: 'Sistema' },
    '/configuracion': { title: 'Configuración', section: 'Sistema' },
  };

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationStart)).subscribe(() => {
      this.navigating.set(true);
    });

    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      const url = (e as NavigationEnd).urlAfterRedirects.split('?')[0];
      const meta = this.titles[url] ?? { title: 'Chicote de Oro', section: 'Sistema' };
      this.pageTitle.set(meta.title);
      this.sectionLabel.set(meta.section);
      this.navigating.set(false);
      this.scrollMainToTop();
    });
  }

  onNavClick(): void {
    this.mobileOpen.set(false);
  }

  toggleSidebar(): void {
    if (window.innerWidth <= 900) {
      this.mobileOpen.update((v) => !v);
      return;
    }
    this.collapsed.update((v) => !v);
  }

  logout(): void {
    this.toast.success('Sesión cerrada', 'Esta es una demostración sin backend.');
  }

  private scrollMainToTop(): void {
    const main = document.getElementById('main-content');
    if (main) {
      main.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
