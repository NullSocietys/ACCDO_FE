import { Component, computed, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { AuthSessionService } from '../core/services/auth-session.service';
import { ToastService } from '../core/services/toast.service';
import { IconComponent } from '../shared/icons/icon.component';
import { ConfirmDialogComponent } from '../shared/ui/confirm-dialog.component';
import { ModalComponent } from '../shared/ui/modal.component';
import { ToastHostComponent } from '../shared/ui/toast-host.component';
import { ButtonComponent } from '../shared/ui/button.component';

interface NavItem {
  label: string;
  path: string;
  icon: string;
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
    ModalComponent,
    ButtonComponent,
  ],
  styleUrl: './shell.component.css',
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthSessionService);

  readonly collapsed = signal(false);
  readonly mobileOpen = signal(false);
  readonly navigating = signal(false);
  readonly pageTitle = signal('Dashboard');
  readonly sectionLabel = signal('General');
  readonly loggingOut = signal(false);
  /** Modal de perfil (datos del usuario + cerrar sesión). */
  readonly perfilOpen = signal(false);

  readonly usuario = this.auth.usuario;
  readonly initials = computed(() => this.auth.initials());
  readonly displayName = computed(() => this.usuario()?.nombre ?? 'Administrador');
  readonly displayEmail = computed(() => this.usuario()?.correo ?? '');

  readonly navGroups: NavGroup[] = [
    {
      label: 'General',
      items: [{ label: 'Dashboard', path: '/admin', icon: 'layoutDashboard' }],
    },
    {
      label: 'Gestión',
      items: [
        { label: 'Usuarios', path: '/admin/usuarios', icon: 'user' },
        { label: 'Eventos', path: '/admin/eventos', icon: 'calendar' },
        { label: 'Inscripciones', path: '/admin/inscripciones', icon: 'clipboardList' },
        { label: 'Pagos', path: '/admin/pagos', icon: 'creditCard' },
        { label: 'Reclamos', path: '/admin/reclamos', icon: 'megaphone' },
        { label: 'Ganadores', path: '/admin/resultados', icon: 'trophy' },
        { label: 'Reportes', path: '/admin/reportes', icon: 'fileText' },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { label: 'Bases', path: '/admin/bases', icon: 'fileText' },
      ],
    },
  ];

  private readonly titles: Record<string, { title: string; section: string }> = {
    '/admin': { title: 'Dashboard', section: 'General' },
    '/admin/usuarios': { title: 'Usuarios', section: 'Gestión' },
    '/admin/eventos': { title: 'Eventos', section: 'Gestión' },
    '/admin/inscripciones': { title: 'Inscripciones', section: 'Gestión' },
    '/admin/inscripciones/nueva': { title: 'Nueva inscripción', section: 'Gestión' },
    '/admin/pagos': { title: 'Pagos', section: 'Gestión' },
    '/admin/reclamos': { title: 'Reclamos', section: 'Gestión' },
    '/admin/resultados': { title: 'Ganadores', section: 'Gestión' },
    '/admin/reportes': { title: 'Reportes', section: 'Gestión' },
    '/admin/bases': { title: 'Bases del concurso', section: 'Sistema' },
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
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.perfilOpen.set(false);
    this.auth.logout().subscribe({
      next: () => {
        this.loggingOut.set(false);
        this.toast.success('Sesión cerrada', 'Hasta pronto');
        void this.router.navigateByUrl('/login');
      },
      error: () => {
        this.loggingOut.set(false);
        this.auth.clearSession();
        void this.router.navigateByUrl('/login');
      },
    });
  }

  private scrollMainToTop(): void {
    const main = document.getElementById('main-content');
    if (main) {
      main.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
