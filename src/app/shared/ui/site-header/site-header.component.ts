import { AfterViewInit, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Header fijo de la portada: transparente sobre el hero y sólido al hacer
 * scroll, con menú hamburguesa en móvil. Compartido entre páginas públicas
 * (landing y seguimiento) para mantener el mismo look & feel.
 */
@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-header.component.html',
  styleUrls: ['./site-header.component.css'],
})
export class SiteHeaderComponent implements AfterViewInit, OnChanges, OnDestroy {
  /** Emitido al pulsar "Coordinadores" (cada página decide qué hacer). */
  @Output() readonly cta = new EventEmitter<void>();

  /** Fuerza el estado "scrolled" (compacto) sin depender del scroll. */
  @Input() compact = false;

  private readonly onScroll = (): void => {
    const header = document.getElementById('siteHeader');
    if (!header) return;
    if (this.compact) {
      header.classList.add('scrolled');
      return;
    }
    // En la landing scrollea la ventana; en /seguimiento scrollea .ipo-main.
    const main = document.querySelector<HTMLElement>('.ipo-main');
    const scrolled = window.scrollY > 40 || (main ? main.scrollTop > 40 : false);
    header.classList.toggle('scrolled', scrolled);
  };

  ngOnChanges(_changes: SimpleChanges): void {
    this.onScroll();
  }

  private mainEl: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.onScroll();
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.mainEl = document.querySelector<HTMLElement>('.ipo-main');
    this.mainEl?.addEventListener('scroll', this.onScroll, { passive: true });
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    this.mainEl?.removeEventListener('scroll', this.onScroll);
    this.mainEl = null;
  }

  toggleMenu(): void {
    const toggle = document.getElementById('menuToggle');
    const nav = document.getElementById('primaryNav');
    const isExpanded = toggle?.getAttribute('aria-expanded') === 'true';
    toggle?.setAttribute('aria-expanded', String(!isExpanded));
    nav?.classList.toggle('open');
  }

  closeMenu(): void {
    document.getElementById('primaryNav')?.classList.remove('open');
    document.getElementById('menuToggle')?.setAttribute('aria-expanded', 'false');
  }
}
