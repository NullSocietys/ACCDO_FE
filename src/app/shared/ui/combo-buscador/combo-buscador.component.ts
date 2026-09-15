import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  inject,
  signal,
} from '@angular/core';

/**
 * Combobox con buscador integrado: al desplegar muestra un input para
 * filtrar las opciones y la lista resultante. Drop-in de <select> para
 * listas largas (ubigeo: departamentos/provincias/distritos).
 */
@Component({
  selector: 'app-combo-buscador',
  standalone: true,
  template: `
    <div class="cb" [class.cb--abierto]="abierto()" [class.cb--disabled]="disabled">
      <button
        type="button"
        class="cb__control"
        (click)="toggle()"
        [disabled]="disabled"
        [attr.aria-expanded]="abierto()"
        aria-haspopup="listbox"
      >
        <span [class.cb__placeholder]="!valor">{{ valor || placeholder }}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      @if (abierto()) {
        <div
          class="cb__panel"
          role="listbox"
          [style.top.px]="panelTop()"
          [style.left.px]="panelLeft()"
          [style.width.px]="panelAncho()"
          [style.visibility]="panelListo() ? 'visible' : 'hidden'"
        >
          <div class="cb__search">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              class="cb__input"
              placeholder="Buscar…"
              [value]="busqueda()"
              (input)="busqueda.set($any($event.target).value)"
              (keydown.enter)="$event.preventDefault(); elegirPrimera()"
              #buscador
            />
          </div>

          @if (filtradas().length === 0) {
            <div class="cb__vacio">Sin resultados</div>
          } @else {
            <ul class="cb__lista" role="listbox">
              @for (op of filtradas(); track op) {
                <li>
                  <button
                    type="button"
                    class="cb__opcion"
                    [class.cb__opcion--activa]="op === valor"
                    (click)="elegir(op)"
                    role="option"
                    [attr.aria-selected]="op === valor"
                  >
                    {{ op }}
                    @if (op === valor) {
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    }
                  </button>
                </li>
              }
            </ul>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; width: 100%; }

    .cb { position: relative; width: 100%; }

    .cb--disabled { opacity: 0.5; }

    .cb__control {
      width: 100%;
      height: 44px;
      padding: 0 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      background: #1c1917;
      color: #f5efe4;
      font: inherit;
      font-size: 14px;
      text-align: left;
      cursor: pointer;
      transition: border-color 0.15s;
    }

    .cb__control:focus-visible,
    .cb--abierto .cb__control {
      border-color: rgba(212, 175, 55, 0.65);
      outline: none;
    }

    .cb--disabled .cb__control { cursor: not-allowed; }

    .cb__placeholder { color: #a8a29e; opacity: 1; }

    .cb__panel {
      position: fixed;
      z-index: 120;
      display: flex;
      flex-direction: column;
      max-height: 340px;
      overflow: hidden;
      border: 1px solid rgba(212, 175, 55, 0.35);
      background: #16130f;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
    }

    .cb__search {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      color: rgba(245, 239, 228, 0.6);
    }

    .cb__input {
      flex: 1;
      height: 32px;
      border: 0;
      outline: none;
      background: transparent;
      color: #f5efe4;
      font: inherit;
      font-size: 13.5px;
    }

    .cb__input::placeholder { opacity: 0.4; }

    .cb__lista {
      list-style: none;
      margin: 0;
      padding: 4px;
      flex: 1;
      min-height: 0;
      max-height: 300px;
      overflow-y: auto;
      scrollbar-width: none;        /* Firefox: barra invisible */
      -ms-overflow-style: none;     /* IE/Edge legacy: invisible */
    }

    .cb__lista::-webkit-scrollbar {
      display: none;                /* Chrome/Safari/Edge: barra invisible */
    }

    .cb__vacio {
      padding: 14px;
      font-size: 12.5px;
      opacity: 0.55;
      text-align: center;
    }

    .cb__opcion {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 10px;
      border: 0;
      background: transparent;
      color: #e7e5e4;
      font: inherit;
      font-size: 13.5px;
      text-align: left;
      cursor: pointer;
      border-radius: 4px;
    }

    .cb__opcion:hover {
      background: rgba(212, 175, 55, 0.12);
      color: #f5efe4;
    }

    .cb__opcion--activa {
      color: #fbbf24;
      font-weight: 650;
      background: rgba(212, 175, 55, 0.08);
    }
  `,
})
export class ComboBuscadorComponent implements OnDestroy {
  @Input({ required: true }) opciones: string[] = [];
  @Input() valor = '';
  @Input() placeholder = 'Selecciona…';
  @Input() disabled = false;
  @Output() valorSalida = new EventEmitter<string>();

  readonly abierto = signal(false);
  readonly busqueda = signal('');
  /** Posición fixed del panel (evita quedar atrapado por overflow de contenedores). */
  readonly panelTop = signal(0);
  readonly panelLeft = signal(0);
  readonly panelAncho = signal(0);
  /** Se pone en true sólo después del primer posicionarPanel(), evita el flash en left:0 */
  readonly panelListo = signal(false);

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly onScroll = () => { if (this.abierto()) this.posicionarPanel(); };

  filtradas(): string[] {
    const q = this.busqueda().trim().toLowerCase();
    const lista = this.opciones ?? [];
    return q ? lista.filter((o) => o.toLowerCase().includes(q)) : lista;
  }

  toggle(): void {
    if (this.disabled) return;
    this.abierto.update((v) => !v);
    this.busqueda.set('');
    if (this.abierto()) {
      this.panelListo.set(false);
      // Esperamos al siguiente frame de pintura para que el panel esté en el DOM
      // y el layout esté completo antes de leer getBoundingClientRect().
      requestAnimationFrame(() => {
        this.posicionarPanel();
        queueMicrotask(() => {
          const input = this.host.nativeElement.querySelector('.cb__input') as HTMLInputElement | null;
          input?.focus();
        });
      });
    } else {
      this.panelListo.set(false);
    }
  }

  /** Calcula la posición del panel respecto al viewport (position: fixed).
   *  El top queda recortado dentro de la ventana: si no hay espacio, la
   *  lista interna hace scroll y el panel nunca se corta abajo. */
  private posicionarPanel(): void {
    if (!this.abierto()) return;
    const control = this.host.nativeElement.querySelector('.cb__control') as HTMLElement | null;
    if (!control) return;
    const r = control.getBoundingClientRect();
    this.panelAncho.set(Math.round(r.width));
    const panel = this.host.nativeElement.querySelector('.cb__panel') as HTMLElement | null;
    const alto = panel?.offsetHeight || 360;
    const margen = 6;
    const espacioAbajo = window.innerHeight - r.bottom - margen;
    const espacioArriba = r.top - margen;
    // Prefiere abrir hacia abajo; si no cabe y arriba hay más espacio, sube.
    const top =
      espacioAbajo >= alto || espacioAbajo >= espacioArriba
        ? r.bottom + margen
        : r.top - alto - margen;
    // Recorte final: siempre visible de principio a fin (cota 8px por lado).
    const topCotado = Math.min(Math.max(top, 8), Math.max(8, window.innerHeight - alto - 8));
    this.panelTop.set(Math.round(topCotado));
    this.panelLeft.set(Math.round(r.left));
    this.panelListo.set(true);
  }

  elegir(op: string): void {
    this.valorSalida.emit(op);
    this.abierto.set(false);
    this.busqueda.set('');
    this.panelListo.set(false);
  }

  elegirPrimera(): void {
    const lista = this.filtradas();
    if (lista.length > 0) this.elegir(lista[0]);
  }

  @HostListener('document:click', ['$event'])
  onClickFuera(e: Event): void {
    if (this.abierto() && !this.host.nativeElement.contains(e.target)) {
      this.abierto.set(false);
      this.panelListo.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.abierto()) {
      this.abierto.set(false);
      this.busqueda.set('');
      this.panelListo.set(false);
    }
  }

  @HostListener('window:resize', [])
  onResize(): void {
    if (this.abierto()) this.posicionarPanel();
  }

  constructor() {
    // Fase captura: detecta scroll de CUALQUIER contenedor interno
    // (los paneles del wizard hacen scroll propio) y reposiciona el panel.
    document.addEventListener('scroll', this.onScroll, { capture: true, passive: true });
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.onScroll, { capture: true });
  }
}
