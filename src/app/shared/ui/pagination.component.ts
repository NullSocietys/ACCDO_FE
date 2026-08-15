import { Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../icons/icon.component';

/**
 * Paginación Swiss / Minimal: rango + controles tipográficos.
 * Sin sombras ni pills; hairlines y tipografía mono para índices.
 */
@Component({
  selector: 'app-pagination',
  imports: [IconComponent],
  template: `
    @if (total() > 0) {
      <nav class="pager" [attr.aria-label]="ariaLabel()">
        <p class="pager__range">{{ rangeLabel() }}</p>

        @if (totalPages() > 1) {
          <div class="pager__controls">
            <button
              type="button"
              class="pager__nav"
              [disabled]="page() <= 1"
              aria-label="Página anterior"
              (click)="go(page() - 1)"
            >
              <app-icon name="chevronLeft" [size]="14" />
            </button>

            @for (item of pages(); track $index) {
              @if (item === '…') {
                <span class="pager__ellipsis" aria-hidden="true">…</span>
              } @else {
                <button
                  type="button"
                  class="pager__page"
                  [class.is-active]="item === page()"
                  [attr.aria-current]="item === page() ? 'page' : null"
                  [attr.aria-label]="'Página ' + item"
                  (click)="go(item)"
                >
                  {{ item }}
                </button>
              }
            }

            <button
              type="button"
              class="pager__nav"
              [disabled]="page() >= totalPages()"
              aria-label="Página siguiente"
              (click)="go(page() + 1)"
            >
              <app-icon name="chevronRight" [size]="14" />
            </button>
          </div>
        }
      </nav>
    }
  `,
  styles: `
    :host {
      display: block;
      flex-shrink: 0;
    }

    .pager {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px 20px;
      padding: 12px 16px;
      border-top: 1px solid var(--color-border);
      background: var(--stone-50);
    }

    .pager__range {
      margin: 0;
      font-size: 12.5px;
      font-weight: 550;
      color: var(--stone-500);
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.01em;
    }

    .pager__controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .pager__nav,
    .pager__page {
      appearance: none;
      border: 1px solid transparent;
      background: transparent;
      color: var(--stone-500);
      cursor: pointer;
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
      transition:
        color 180ms ease,
        border-color 180ms ease,
        background 180ms ease;
    }

    .pager__nav {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      color: var(--stone-600);
    }

    .pager__nav:hover:not(:disabled) {
      color: var(--stone-900);
      border-color: var(--color-border);
      background: var(--color-card);
    }

    .pager__nav:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .pager__page {
      min-width: 32px;
      height: 32px;
      padding: 0 8px;
      font-size: 12.5px;
      font-weight: 650;
    }

    .pager__page:hover {
      color: var(--stone-900);
      border-color: var(--color-border);
      background: var(--color-card);
    }

    .pager__page.is-active {
      color: var(--color-card);
      background: var(--stone-900);
      border-color: var(--stone-900);
    }

    .pager__nav:focus-visible,
    .pager__page:focus-visible {
      outline: 2px solid var(--gold-600);
      outline-offset: 2px;
    }

    .pager__ellipsis {
      width: 24px;
      text-align: center;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--stone-400);
      user-select: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .pager__nav,
      .pager__page {
        transition: none;
      }
    }
  `,
})
export class PaginationComponent {
  readonly total = input.required<number>();
  readonly pageSize = input(10);
  readonly page = input(1);
  readonly ariaLabel = input('Paginación');
  readonly pageChange = output<number>();

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / Math.max(1, this.pageSize()))),
  );

  readonly rangeLabel = computed(() => {
    const total = this.total();
    if (total === 0) return '0 resultados';
    const size = Math.max(1, this.pageSize());
    const current = Math.min(Math.max(1, this.page()), this.totalPages());
    const from = (current - 1) * size + 1;
    const to = Math.min(current * size, total);
    return `${from}–${to} de ${total}`;
  });

  /** Ventana de páginas con elipsis (máx. ~7 slots). */
  readonly pages = computed((): Array<number | '…'> => {
    const total = this.totalPages();
    const current = Math.min(Math.max(1, this.page()), total);
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const items: Array<number | '…'> = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    if (start > 2) items.push('…');
    for (let n = start; n <= end; n++) items.push(n);
    if (end < total - 1) items.push('…');
    items.push(total);
    return items;
  });

  go(next: number): void {
    const clamped = Math.min(Math.max(1, next), this.totalPages());
    if (clamped !== this.page()) {
      this.pageChange.emit(clamped);
    }
  }
}
