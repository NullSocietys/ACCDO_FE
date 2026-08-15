import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import type { Configuracion } from '../../../core/models/configuracion.model';
import { ConfiguracionApiService } from '../../../core/services/api/configuracion.api.service';
import { AuthSessionService } from '../../../core/services/auth-session.service';

type DatosCoord = {
  nombreAsociacion: string;
  coordinadoraGeneral: string;
  telefono: string;
  correo: string;
  direccion: string;
  numeroYape: string;
  numeroPlin: string;
};

/**
 * Header fijo de páginas públicas. Transparente sobre el hero;
 * fondo sólido al hacer scroll. Incluye modal de coordinación.
 */
@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-header.component.html',
  styleUrls: ['./site-header.component.css'],
})
export class SiteHeaderComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly configApi = inject(ConfiguracionApiService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthSessionService);
  /** Delegado con sesión (no admin): muestra Salir y oculta acceso. */
  readonly esDelegadoLogueado = computed(
    () => this.auth.isAuthenticated() && !this.auth.isAdmin(),
  );
  /** Organizador con sesión: no mostrar “Iniciar sesión” (evita puente a /admin). */
  readonly esAdminLogueado = computed(() => this.auth.isAdmin());
  readonly sinSesion = computed(() => !this.auth.isAuthenticated());

  private readonly FALLBACK: DatosCoord = {
    nombreAsociacion: 'Asociación Cultural Chicote de Oro',
    coordinadoraGeneral: 'Martha Bravo',
    telefono: '926 266 295',
    correo: 'contacto@chicotedeoro.pe',
    direccion: 'Tacna, Perú',
    numeroYape: '926 266 295',
    numeroPlin: '926 266 295',
  };

  datosCoordinacion: DatosCoord = { ...this.FALLBACK };
  modalAbierto = false;
  readonly panelAbierto = signal(false);

  private datosDesdeApi = false;
  private focoPrevio: HTMLElement | null = null;
  private modalEscListener: ((e: KeyboardEvent) => void) | null = null;
  private mainEl: HTMLElement | null = null;
  private routeSub: Subscription | null = null;

  private readonly onScroll = (): void => {
    const header = document.getElementById('siteHeader');
    if (!header) return;

    const onLandingHero =
      this.router.url === '/' ||
      this.router.url.startsWith('/#') ||
      this.router.url.startsWith('/?');

    if (!onLandingHero) {
      header.classList.add('is-solid');
      return;
    }

    const mainScrolled = this.mainEl ? this.mainEl.scrollTop > 24 : false;
    const scrolled = window.scrollY > 24 || mainScrolled;
    header.classList.toggle('is-solid', scrolled);
  };

  ngAfterViewInit(): void {
    this.mainEl = document.querySelector<HTMLElement>('.ipo-main, .rc-main');
    this.onScroll();
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.mainEl?.addEventListener('scroll', this.onScroll, { passive: true });
    this.routeSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.cerrarPanel();
        queueMicrotask(() => this.onScroll());
      });
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    this.mainEl?.removeEventListener('scroll', this.onScroll);
    this.mainEl = null;
    this.routeSub?.unsubscribe();
    this.routeSub = null;
    this.cerrarModal();
    this.cerrarPanel();
  }

  @HostListener('document:keydown', ['$event'])
  onDocKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.panelAbierto() && !this.modalAbierto) {
      this.cerrarPanel();
    }
  }

  toggleMenu(): void {
    const toggle = document.getElementById('menuToggle');
    const nav = document.getElementById('primaryNav');
    const isExpanded = toggle?.getAttribute('aria-expanded') === 'true';
    toggle?.setAttribute('aria-expanded', String(!isExpanded));
    nav?.classList.toggle('open');
    if (!isExpanded) this.cerrarPanel();
  }

  closeMenu(): void {
    document.getElementById('primaryNav')?.classList.remove('open');
    document.getElementById('menuToggle')?.setAttribute('aria-expanded', 'false');
  }

  togglePanel(event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    this.panelAbierto.update((v) => !v);
  }

  cerrarPanel(): void {
    this.panelAbierto.set(false);
  }

  onInscribirse(): void {
    this.cerrarPanel();
    this.closeMenu();
    void this.router.navigateByUrl('/inscribirse');
  }

  onAcceso(): void {
    this.cerrarPanel();
    this.closeMenu();
    void this.router.navigate(['/acceso']);
  }

  onPanelAdmin(): void {
    this.cerrarPanel();
    this.closeMenu();
    void this.router.navigateByUrl('/admin');
  }

  onSalir(): void {
    this.cerrarPanel();
    this.cerrarSesion();
  }

  onCoordinacion(): void {
    this.cerrarPanel();
    void this.abrirModal();
  }

  cerrarSesion(): void {
    this.closeMenu();
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: () => void this.router.navigateByUrl('/'),
    });
  }

  /** Salto instantáneo a una sección de la landing. */
  goToSection(event: Event, fragment: string): void {
    event.preventDefault();
    this.closeMenu();
    this.cerrarPanel();

    const path = this.router.url.split('?')[0].split('#')[0];
    const onHome = path === '/' || path === '';

    if (onHome) {
      if (window.location.hash !== `#${fragment}`) {
        history.replaceState(history.state, '', `/#${fragment}`);
      }
      this.scrollToId(fragment);
      return;
    }

    void this.router.navigate(['/'], { fragment });
  }

  private scrollToId(fragment: string): void {
    const el = document.getElementById(fragment);
    if (!el) return;
    const header = document.getElementById('siteHeader');
    const offset = (header?.offsetHeight ?? 72) + 20;
    const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
    window.scrollTo(0, y);
  }

  async abrirModal(): Promise<void> {
    this.closeMenu();
    this.cerrarPanel();
    if (!this.datosDesdeApi) {
      try {
        const c: Configuracion | null = await firstValueFrom(this.configApi.obtenerActiva());
        if (c) {
          this.datosDesdeApi = true;
          const f = this.FALLBACK;
          this.datosCoordinacion = {
            nombreAsociacion: c.nombreAsociacion || f.nombreAsociacion,
            coordinadoraGeneral: c.coordinadoraGeneral || f.coordinadoraGeneral,
            telefono: c.telefono || f.telefono,
            correo: c.correo || f.correo,
            direccion: c.direccion || f.direccion,
            numeroYape: c.numeroYape || f.numeroYape,
            numeroPlin: c.numeroPlin || f.numeroPlin,
          };
        }
      } catch {
        /* sin conexión: se usan los datos de respaldo */
      }
    }

    this.focoPrevio = document.activeElement as HTMLElement | null;
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
    this.modalEscListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.cerrarModal();
    };
    window.addEventListener('keydown', this.modalEscListener);
    requestAnimationFrame(() => {
      const close = this.host.nativeElement.querySelector(
        '.coord-modal__close',
      ) as HTMLButtonElement | null;
      close?.focus();
    });
  }

  cerrarModal(): void {
    if (!this.modalAbierto && !this.modalEscListener) return;
    this.modalAbierto = false;
    document.body.style.overflow = '';
    if (this.modalEscListener) {
      window.removeEventListener('keydown', this.modalEscListener);
      this.modalEscListener = null;
    }
    this.focoPrevio?.focus();
    this.focoPrevio = null;
  }

  get telefonoHref(): string {
    return `tel:+51${this.datosCoordinacion.telefono.replace(/\D/g, '')}`;
  }

  get whatsappHref(): string {
    return `https://wa.me/51${this.datosCoordinacion.telefono.replace(/\D/g, '')}`;
  }
}
