import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Pago, PagoEstado } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { BadgeComponent, statusLabel, statusTone } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { InputComponent } from '../../shared/ui/input.component';
import { KpiBoardComponent } from '../../shared/ui/kpi-board.component';
import { KpiItem } from '../../shared/ui/kpi-board.types';
import { ModalComponent } from '../../shared/ui/modal.component';

type EstadoFiltro = 'todos' | PagoEstado;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const PAGE_SIZE = 5;

@Component({
  selector: 'app-pagos-page',
  imports: [
    CurrencyPipe,
    FormsModule,
    IconComponent,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    InputComponent,
    ModalComponent,
    KpiBoardComponent,
  ],
  styleUrl: './pagos.page.css',
  templateUrl: './pagos.page.html',
})
export class PagosPage {
  readonly store = inject(DataStoreService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly statusTone = statusTone;
  readonly statusLabel = statusLabel;
  readonly pageSize = PAGE_SIZE;

  readonly busqueda = signal('');
  readonly estadoFiltro = signal<EstadoFiltro>('todos');
  readonly page = signal(1);
  readonly selected = signal<Pago | null>(null);

  readonly filtros: { key: EstadoFiltro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'verificado', label: 'Verificados' },
    { key: 'rechazado', label: 'Rechazados' },
  ];

  readonly overview = computed(() => {
    const list = this.store.pagos();
    const pendientes = list.filter((p) => p.estado === 'pendiente').length;
    const verificados = list.filter((p) => p.estado === 'verificado');
    const rechazados = list.filter((p) => p.estado === 'rechazado').length;
    const ingresos = verificados.reduce((sum, p) => sum + p.monto, 0);
    const total = list.length;
    const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

    return {
      total,
      pendientes,
      verificados: verificados.length,
      rechazados,
      ingresos,
      pctVerificados: pct(verificados.length),
    };
  });

  readonly kpis = computed((): KpiItem[] => {
    const o = this.overview();
    const ingresos = new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      maximumFractionDigits: 0,
    }).format(o.ingresos);

    return [
      {
        label: 'Pagos',
        value: o.total,
        hint: 'Registrados en temporada',
        icon: 'creditCard',
        tone: 'ink',
      },
      {
        label: 'Pendientes',
        value: o.pendientes,
        hint: o.pendientes > 0 ? 'Por verificar' : 'Cola limpia',
        icon: 'clock',
        tone: 'warn',
      },
      {
        label: 'Verificados',
        value: o.verificados,
        hint: `${o.pctVerificados}% del total`,
        icon: 'circle-check',
        tone: 'ok',
      },
      {
        label: 'Ingresos',
        value: ingresos,
        hint: 'Solo verificados',
        icon: 'wallet',
        tone: 'gold',
        money: true,
      },
    ];
  });

  readonly filtered = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const estado = this.estadoFiltro();
    return this.store.pagos().filter((pago) => {
      const matchEst = estado === 'todos' || pago.estado === estado;
      const matchQ =
        !q ||
        pago.grupo.toLowerCase().includes(q) ||
        pago.codigo.toLowerCase().includes(q) ||
        pago.responsable.toLowerCase().includes(q) ||
        (pago.numeroOperacion?.toLowerCase().includes(q) ?? false) ||
        statusLabel(pago.metodo).toLowerCase().includes(q);
      return matchEst && matchQ;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize)),
  );

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = Math.min(this.page(), total);
    const window = 5;
    let start = Math.max(1, current - Math.floor(window / 2));
    const end = Math.min(total, start + window - 1);
    start = Math.max(1, end - window + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  readonly paged = computed(() => {
    const list = this.filtered();
    const p = Math.min(Math.max(1, this.page()), this.totalPages());
    const start = (p - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  readonly rangeLabel = computed(() => {
    const total = this.filtered().length;
    if (total === 0) return '0 resultados';
    const p = Math.min(this.page(), this.totalPages());
    const from = (p - 1) * this.pageSize + 1;
    const to = Math.min(p * this.pageSize, total);
    return `${from}–${to} de ${total}`;
  });

  readonly modalDescription = computed(() => {
    const pago = this.selected();
    if (!pago) return null;
    return `${pago.codigo} · ${statusLabel(pago.metodo)}`;
  });

  constructor() {
    effect(() => {
      this.busqueda();
      this.estadoFiltro();
      untracked(() => this.page.set(1));
    });
  }

  cuentaEstado(key: EstadoFiltro): number {
    if (key === 'todos') return this.store.pagos().length;
    return this.store.pagos().filter((p) => p.estado === key).length;
  }

  formatFecha(fecha: string): string {
    const d = Number(fecha.slice(8, 10));
    const m = MESES[Number(fecha.slice(5, 7)) - 1] ?? '';
    const y = fecha.slice(0, 4);
    return `${d} ${m} ${y}`;
  }

  metodoIcon(metodo: string): string {
    switch (metodo) {
      case 'yape':
      case 'plin':
        return 'phone';
      case 'transferencia':
        return 'creditCard';
      case 'efectivo':
        return 'wallet';
      default:
        return 'wallet';
    }
  }

  goToPage(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  rowIndex(localIndex: number): string {
    const p = Math.min(this.page(), this.totalPages());
    return String((p - 1) * this.pageSize + localIndex + 1).padStart(2, '0');
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.estadoFiltro.set('todos');
  }

  viewComprobante(pago: Pago): void {
    this.selected.set(pago);
  }

  closeComprobante(): void {
    this.selected.set(null);
  }

  async accept(pago: Pago): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Aceptar pago',
      description: `¿Confirmar el pago de «${pago.grupo}» por ${pago.monto}?`,
      confirmLabel: 'Aceptar',
    });
    if (!ok) return;
    this.store.updatePago({ ...pago, estado: 'verificado' });
    if (this.selected()?.id === pago.id) {
      this.selected.set({ ...pago, estado: 'verificado' });
    }
    this.toast.success('Pago verificado', pago.codigo);
  }

  async reject(pago: Pago): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Rechazar pago',
      description: `¿Rechazar el pago de «${pago.grupo}»?`,
      confirmLabel: 'Rechazar',
      tone: 'danger',
    });
    if (!ok) return;
    this.store.updatePago({ ...pago, estado: 'rechazado' });
    if (this.selected()?.id === pago.id) {
      this.selected.set({ ...pago, estado: 'rechazado' });
    }
    this.toast.warning('Pago rechazado', pago.codigo);
  }
}
