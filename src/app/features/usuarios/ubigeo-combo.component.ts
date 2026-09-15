import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Combobox de ubigeo con buscador y dropdown portal.
 *
 * El dropdown se monta directamente en <body> (portal) para escapar
 * cualquier overflow:hidden o stacking context del modal padre.
 * Se posiciona con coordenadas absolutas calculadas desde el trigger.
 */
@Component({
  selector: 'app-ubigeo-combo',
  standalone: true,
  imports: [FormsModule],
  template: `
    <!-- Solo el trigger vive en el componente -->
    <button
      #triggerBtn
      type="button"
      class="uc__trigger"
      [class.uc__trigger--open]="open()"
      [class.uc__trigger--disabled]="disabled()"
      [attr.aria-expanded]="open()"
      [attr.aria-haspopup]="'listbox'"
      [attr.aria-label]="label()"
      [disabled]="disabled() || undefined"
      (click)="toggle($event)"
    >
      <span class="uc__value" [class.uc__value--placeholder]="!value()">
        {{ value() || placeholder() }}
      </span>
      <svg class="uc__chevron" [class.uc__chevron--open]="open()"
           viewBox="0 0 12 7" fill="none" aria-hidden="true">
        <path d="M1 1l5 5 5-5" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    /* ── Trigger ── */
    .uc__trigger {
      width: 100%;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 0 10px 0 12px;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 2px;
      background: #0c0a09;
      color: #e7e5e4;
      font-family: inherit;
      font-size: .8125rem;
      cursor: pointer;
      text-align: left;
      transition: border-color 150ms ease, background 150ms ease,
                  box-shadow 150ms ease;
      outline: none;
    }

    .uc__trigger:hover:not(:disabled) {
      background: #1c1917;
      border-color: rgba(255,255,255,.28);
    }

    .uc__trigger--open {
      border-color: #fbbf24 !important;
      box-shadow: 0 0 0 2px rgba(161,98,7,.22);
    }

    .uc__trigger:focus-visible {
      border-color: #fbbf24;
      box-shadow: 0 0 0 2px rgba(161,98,7,.22);
    }

    .uc__trigger--disabled,
    .uc__trigger:disabled {
      opacity: .38;
      cursor: not-allowed;
    }

    .uc__value {
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #e7e5e4;
    }

    .uc__value--placeholder { color: #78716c; }

    .uc__chevron {
      width: 11px;
      height: 7px;
      flex-shrink: 0;
      color: #a8a29e;
      transition: transform 150ms ease, color 150ms ease;
    }

    .uc__chevron--open {
      transform: rotate(180deg);
      color: #fbbf24;
    }

    @media (prefers-reduced-motion: reduce) {
      .uc__trigger,
      .uc__chevron { transition: none; }
    }
  `],
})
export class UbigeoComboComponent implements AfterViewInit, OnDestroy {

  /* ── inputs / outputs ── */
  readonly options     = input<string[]>([]);
  readonly value       = input<string>('');
  readonly label       = input<string>('Selecciona');
  readonly placeholder = input<string>('Selecciona…');
  readonly disabled    = input<boolean>(false);
  readonly valueChange = output<string>();

  /* ── estado ── */
  readonly open = signal(false);
  query = '';

  readonly filtered = computed(() => {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.options();
    return this.options().filter(o => o.toLowerCase().includes(q));
  });

  /* ── refs ── */
  private readonly triggerBtn =
    viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');
  private readonly elRef = inject(ElementRef);

  /* El nodo del portal (montado en <body>) */
  private portalEl: HTMLElement | null = null;
  /* Input de búsqueda dentro del portal */
  private searchEl: HTMLInputElement | null = null;

  /* ── ciclo de vida ── */
  ngAfterViewInit(): void { /* nada — portal se crea al abrir */ }

  ngOnDestroy(): void {
    this.destroyPortal();
  }

  /* ── API pública ── */
  toggle(e: MouseEvent): void {
    e.stopPropagation();
    if (this.disabled()) return;
    this.open() ? this.close() : this.openDropdown();
  }

  select(opt: string): void {
    this.valueChange.emit(opt);
    this.close();
  }

  close(): void {
    this.open.set(false);
    this.query = '';
    this.destroyPortal();
  }

  /* ── Portal ── */
  private openDropdown(): void {
    this.open.set(true);
    this.query = '';
    this.destroyPortal(); // limpia cualquier instancia previa

    const portal = document.createElement('div');
    portal.className = 'uc-portal';
    portal.setAttribute('role', 'listbox');
    portal.setAttribute('aria-label', this.label());

    // posiciona relativo al trigger
    this.positionPortal(portal);

    portal.innerHTML = this.buildPortalHTML();
    document.body.appendChild(portal);
    this.portalEl = portal;

    // bind eventos internos del portal
    this.bindPortalEvents(portal);

    // foco al buscador
    this.searchEl = portal.querySelector<HTMLInputElement>('.uc-portal__search');
    setTimeout(() => this.searchEl?.focus(), 20);
  }

  private positionPortal(el: HTMLElement): void {
    const trigger = this.triggerBtn()?.nativeElement;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH = 280; // altura máxima del portal

    // abre hacia arriba si no hay espacio abajo
    const openUp = spaceBelow < dropH && rect.top > dropH;

    Object.assign(el.style, {
      position:   'fixed',
      zIndex:     '99999',
      left:       `${rect.left}px`,
      width:      `${rect.width}px`,
      top:        openUp ? `${rect.top - dropH - 4}px` : `${rect.bottom + 4}px`,
    });
  }

  private buildPortalHTML(): string {
    const opts = this.filtered();
    const current = this.value();
    const lbl = this.label().toLowerCase();

    const items = opts.length
      ? opts.map(o => `
          <li class="uc-portal__option ${o === current ? 'uc-portal__option--selected' : ''}"
              role="option" aria-selected="${o === current}" data-value="${this.esc(o)}">
            <span class="uc-portal__opt-text">${this.esc(o)}</span>
            ${o === current ? `<svg class="uc-portal__check" viewBox="0 0 12 10" fill="none">
              <path d="M1 5l3.5 3.5L11 1" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>` : ''}
          </li>`).join('')
      : `<li class="uc-portal__empty">Sin resultados</li>`;

    return `
      <div class="uc-portal__search-wrap">
        <svg class="uc-portal__search-icon" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.4"/>
          <path d="M10.5 10.5L13 13" stroke="currentColor"
                stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <input class="uc-portal__search" type="text" autocomplete="off"
               placeholder="Buscar ${lbl}…" value="${this.esc(this.query)}" />
        <button type="button" class="uc-portal__clear"
                aria-label="Limpiar" style="${this.query ? '' : 'display:none'}">
          <svg viewBox="0 0 10 10" fill="none">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor"
                  stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <ul class="uc-portal__list" role="listbox">${items}</ul>`;
  }

  /** Reconstruye la lista dentro del portal sin recrear todo el nodo */
  private rebuildList(): void {
    if (!this.portalEl) return;
    const opts = this.filtered();
    const current = this.value();

    const list = this.portalEl.querySelector('.uc-portal__list');
    if (!list) return;

    if (opts.length === 0) {
      list.innerHTML = `<li class="uc-portal__empty">Sin resultados</li>`;
      return;
    }

    list.innerHTML = opts.map(o => `
      <li class="uc-portal__option ${o === current ? 'uc-portal__option--selected' : ''}"
          role="option" aria-selected="${o === current}" data-value="${this.esc(o)}">
        <span class="uc-portal__opt-text">${this.esc(o)}</span>
        ${o === current ? `<svg class="uc-portal__check" viewBox="0 0 12 10" fill="none">
          <path d="M1 5l3.5 3.5L11 1" stroke="currentColor"
                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>` : ''}
      </li>`).join('');

    // re-bind clicks en las nuevas <li>
    list.querySelectorAll<HTMLElement>('.uc-portal__option').forEach(li => {
      li.addEventListener('click', () => this.select(li.dataset['value'] ?? ''));
    });
  }

  private bindPortalEvents(portal: HTMLElement): void {
    // opciones ya renderizadas
    portal.querySelectorAll<HTMLElement>('.uc-portal__option').forEach(li => {
      li.addEventListener('click', () => this.select(li.dataset['value'] ?? ''));
    });

    // búsqueda
    const search = portal.querySelector<HTMLInputElement>('.uc-portal__search');
    const clearBtn = portal.querySelector<HTMLButtonElement>('.uc-portal__clear');

    search?.addEventListener('input', () => {
      this.query = search.value;
      if (clearBtn) clearBtn.style.display = this.query ? '' : 'none';
      this.rebuildList();
    });

    clearBtn?.addEventListener('click', () => {
      this.query = '';
      if (search) search.value = '';
      if (clearBtn) clearBtn.style.display = 'none';
      this.rebuildList();
      search?.focus();
    });

    // impedir que el click dentro del portal cierre por el listener global
    portal.addEventListener('click', e => e.stopPropagation());
    portal.addEventListener('mousedown', e => e.stopPropagation());
  }

  private destroyPortal(): void {
    if (this.portalEl) {
      this.portalEl.remove();
      this.portalEl = null;
      this.searchEl = null;
    }
  }

  /** Escapa texto para HTML inline */
  private esc(s: string): string {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  /* ── Listeners globales ── */
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (!this.open()) return;
    const inside = this.elRef.nativeElement.contains(e.target) ||
                   this.portalEl?.contains(e.target as Node);
    if (!inside) this.close();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (this.open() && e.key === 'Escape') {
      e.stopPropagation();
      this.close();
      this.triggerBtn()?.nativeElement.focus();
    }
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onScrollOrResize(): void {
    if (this.open() && this.portalEl) {
      this.positionPortal(this.portalEl);
    }
  }
}

/* ── Estilos globales del portal (inyectados una sola vez) ─────────────
   Usamos un <style> estático porque el portal vive en <body>,
   fuera del shadow del componente.
─────────────────────────────────────────────────────────────────────── */
const PORTAL_STYLE_ID = 'uc-portal-styles';
if (!document.getElementById(PORTAL_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = PORTAL_STYLE_ID;
  s.textContent = `
    .uc-portal {
      background: #141312;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 4px;
      box-shadow: 0 12px 32px rgba(0,0,0,.85), 0 2px 8px rgba(0,0,0,.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: uc-portal-in 120ms ease both;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    }
    @keyframes uc-portal-in {
      from { opacity:0; transform:translateY(-4px); }
      to   { opacity:1; transform:translateY(0); }
    }

    /* buscador */
    .uc-portal__search-wrap {
      position: relative;
      display: flex;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,.09);
      flex-shrink: 0;
    }
    .uc-portal__search-icon {
      position: absolute;
      left: 10px;
      width: 14px;
      height: 14px;
      color: #78716c;
      pointer-events: none;
    }
    .uc-portal__search {
      width: 100%;
      height: 34px;
      padding: 0 32px 0 32px;
      border: none;
      background: transparent;
      color: #e7e5e4;
      font-family: inherit;
      font-size: .8125rem;
      outline: none;
    }
    .uc-portal__search::placeholder { color: #78716c; }
    .uc-portal__clear {
      position: absolute;
      right: 6px;
      width: 20px; height: 20px;
      display: grid; place-items: center;
      border: none;
      background: transparent;
      color: #78716c;
      cursor: pointer;
      padding: 0;
      border-radius: 2px;
    }
    .uc-portal__clear svg { width:9px; height:9px; }
    .uc-portal__clear:hover { color: #e7e5e4; }

    /* lista */
    .uc-portal__list {
      list-style: none;
      margin: 0;
      padding: 4px 0;
      max-height: 220px;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .uc-portal__list::-webkit-scrollbar { display: none; }

    /* opción */
    .uc-portal__option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 7px 12px;
      cursor: pointer;
      font-size: .8125rem;
      color: #a8a29e;
      transition: background 80ms ease, color 80ms ease;
      user-select: none;
    }
    .uc-portal__option:hover {
      background: rgba(255,255,255,.05);
      color: #e7e5e4;
    }
    .uc-portal__option--selected {
      color: #fbbf24;
      background: rgba(161,98,7,.12);
    }
    .uc-portal__option--selected:hover {
      background: rgba(161,98,7,.18);
    }
    .uc-portal__opt-text {
      flex: 1; min-width: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .uc-portal__check {
      width: 12px; height: 10px; flex-shrink: 0; color: #fbbf24;
    }
    .uc-portal__empty {
      padding: 14px 12px;
      font-size: .8125rem;
      color: #78716c;
      text-align: center;
    }
    @media (prefers-reduced-motion: reduce) {
      .uc-portal { animation: none; }
    }
  `;
  document.head.appendChild(s);
}
