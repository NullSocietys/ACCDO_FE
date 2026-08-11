import {
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/**
 * Carga fluida: muestra "Cargar más (X restantes)" al final de una lista.
 * Se dispara solo al hacer scroll (IntersectionObserver) o al hacer clic.
 * Mientras carga, muestra filas esqueleto con animación shimmer (como el dashboard).
 */
@Component({
  selector: 'app-load-more',
  imports: [SkeletonComponent],
  template: `
    @if (loading()) {
      <div class="lm-sk" aria-hidden="true">
        <app-skeleton variant="table" [count]="skeletonCount()" />
      </div>
    } @else if (hasMore()) {
      <div
        class="lm"
        #sentinel
        role="button"
        tabindex="0"
        aria-label="Cargar más resultados"
        (click)="emit()"
        (keydown.enter)="emit()"
      >
        <span class="lm__dot" aria-hidden="true"></span>
        <span class="lm__label">{{ label() }}</span>
        @if (remaining() > 0) {
          <span class="lm__count">{{ remaining() }} restantes</span>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .lm {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 16px;
      border-top: 1px solid var(--color-border);
      font-size: 12.5px;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--gold-700);
      cursor: pointer;
      user-select: none;
      transition:
        color 160ms ease,
        background 160ms ease;
    }

    .lm:hover {
      background: var(--stone-50);
      color: var(--gold-800);
    }

    .lm:focus-visible {
      outline: 2px solid var(--gold-600);
      outline-offset: -2px;
    }

    .lm__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--gold-500);
      flex-shrink: 0;
      animation: lm-pulse 1.4s ease-in-out infinite;
    }

    .lm__count {
      color: var(--stone-500);
      font-weight: 550;
      font-variant-numeric: tabular-nums;
    }

    /* Filas esqueleto mientras carga (animación shimmer del app-skeleton). */
    .lm-sk {
      padding: 10px 14px 14px;
      border-top: 1px solid var(--color-border);
      background: var(--color-card);
    }

    @keyframes lm-pulse {
      0%,
      100% {
        opacity: 0.35;
        transform: scale(0.85);
      }
      50% {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
})
export class LoadMoreComponent implements OnDestroy {
  readonly hasMore = input.required<boolean>();
  readonly remaining = input(0);
  readonly label = input('Cargar más');
  /** Cuántas filas esqueleto mostrar mientras carga. */
  readonly skeletonCount = input(3);
  /** Milisegundos de animación esqueleto antes de revelar los datos. */
  readonly delay = input(450);
  readonly loadMore = output<void>();

  /** Estado interno de carga (accesible desde el template). */
  readonly loading = signal(false);
  private readonly sentinel = viewChild<ElementRef<HTMLDivElement>>('sentinel');
  private obs?: IntersectionObserver;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    // El sentinel aparece/desaparece con hasMore y puede llegar con datos tardíos:
    // el effect (re)crea el observer cada vez que cambia el elemento observado.
    effect(() => {
      const el = this.sentinel()?.nativeElement;
      this.obs?.disconnect();
      this.obs = undefined;
      if (!el || !this.hasMore()) return;
      this.obs = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) this.emit();
        },
        { rootMargin: '140px 0px' },
      );
      this.obs.observe(el);
    });
  }

  ngOnDestroy(): void {
    this.obs?.disconnect();
    if (this.timer) clearTimeout(this.timer);
  }

  /** Accesible desde el template (click / teclado) y desde el observer. */
  emit(): void {
    if (!this.hasMore() || this.loading()) return;
    this.loading.set(true);
    this.timer = setTimeout(() => {
      this.loading.set(false);
      this.loadMore.emit();
    }, this.delay());
  }
}
