import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Pago, PagoEstado, PagoView } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { BadgeComponent, statusLabel, statusTone } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { InputComponent } from '../../shared/ui/input.component';
import { LoadMoreComponent } from '../../shared/ui/load-more.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

type EstadoFiltro = 'todos' | PagoEstado;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const PAGE_SIZE = 10;

function toPagoEntity(pago: PagoView, estado: PagoEstado): Pago {
  return {
    id: pago.id,
    inscripcionId: pago.inscripcionId,
    monto: pago.monto,
    metodoPago: pago.metodoPago,
    numeroOperacion: pago.numeroOperacion,
    comprobante: pago.comprobante,
    estado,
    fechaPago: pago.fechaPago,
    observaciones: pago.observaciones,
    activo: pago.activo,
    createdAt: pago.createdAt,
  };
}

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
    LoadMoreComponent,
    ModalComponent,
    SkeletonComponent,
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
  /** Carga fluida: cuántos pagos se muestran hasta el momento. */
  readonly visible = signal(PAGE_SIZE);
  /** Esqueleto de carga inicial (igual que el dashboard). */
  readonly cargando = signal(true);
  readonly selected = signal<PagoView | null>(null);

  readonly filtros: { key: EstadoFiltro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'PENDIENTE', label: 'Pendientes' },
    { key: 'CONFIRMADO', label: 'Confirmados' },
    { key: 'RECHAZADO', label: 'Rechazados' },
  ];

  readonly overview = computed(() => {
    const list = this.store.pagosView();
    const pendientes = list.filter((p) => p.estado === 'PENDIENTE').length;
    const confirmados = list.filter((p) => p.estado === 'CONFIRMADO');
    const rechazados = list.filter((p) => p.estado === 'RECHAZADO').length;
    const ingresos = confirmados.reduce((sum, p) => sum + p.monto, 0);
    const total = list.length;

    return {
      total,
      pendientes,
      confirmados: confirmados.length,
      rechazados,
      ingresos,
    };
  });

  readonly filtered = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const estado = this.estadoFiltro();
    return this.store.pagosView().filter((pago) => {
      const matchEst = estado === 'todos' || pago.estado === estado;
      const matchQ =
        !q ||
        pago.nombreGrupo.toLowerCase().includes(q) ||
        pago.codigo.toLowerCase().includes(q) ||
        pago.responsableNombre.toLowerCase().includes(q) ||
        (pago.numeroOperacion?.toLowerCase().includes(q) ?? false) ||
        statusLabel(pago.metodoPago).toLowerCase().includes(q);
      return matchEst && matchQ;
    });
  });

  readonly paged = computed(() => this.filtered().slice(0, this.visible()));

  readonly hasMore = computed(() => this.visible() < this.filtered().length);

  readonly remaining = computed(() => Math.max(0, this.filtered().length - this.visible()));

  readonly rangeLabel = computed(() => {
    const total = this.filtered().length;
    if (total === 0) return '0 resultados';
    const to = Math.min(this.visible(), total);
    return `1–${to} de ${total}`;
  });

  loadMore(): void {
    this.visible.update((v) => Math.min(v + this.pageSize, this.filtered().length));
  }

  readonly modalDescription = computed(() => {
    const pago = this.selected();
    if (!pago) return null;
    return `${pago.codigo} · ${statusLabel(pago.metodoPago)}`;
  });

  constructor() {
    window.setTimeout(() => this.cargando.set(false), 500);
    effect(() => {
      this.busqueda();
      this.estadoFiltro();
      untracked(() => this.visible.set(PAGE_SIZE));
    });
  }

  cuentaEstado(key: EstadoFiltro): number {
    if (key === 'todos') return this.store.pagosView().length;
    return this.store.pagosView().filter((p) => p.estado === key).length;
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const d = Number(fecha.slice(8, 10));
    const m = MESES[Number(fecha.slice(5, 7)) - 1] ?? '';
    const y = fecha.slice(0, 4);
    return `${d} ${m} ${y}`;
  }

  metodoIcon(metodo: string): string {
    switch (metodo.toUpperCase()) {
      case 'YAPE':
      case 'PLIN':
        return 'phone';
      case 'TRANSFERENCIA':
        return 'creditCard';
      case 'EFECTIVO':
        return 'wallet';
      default:
        return 'wallet';
    }
  }

  rowIndex(localIndex: number): string {
    return String(localIndex + 1).padStart(2, '0');
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.estadoFiltro.set('todos');
  }

  viewComprobante(pago: PagoView): void {
    this.selected.set(pago);
  }

  closeComprobante(): void {
    this.selected.set(null);
  }

  async accept(pago: PagoView): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Aceptar pago',
      description: `¿Confirmar el pago de «${pago.nombreGrupo}» por ${pago.monto}?`,
      confirmLabel: 'Aceptar',
    });
    if (!ok) return;
    try {
      await this.store.confirmarPago(pago.id);
      if (this.selected()?.id === pago.id) {
        this.selected.set({ ...pago, estado: 'CONFIRMADO' });
      }
      this.toast.success('Pago confirmado', pago.codigo);
      this.toast.info('Correo enviado', 'Confirmación de inscripción enviada al correo del inscrito');
    } catch (err) {
      this.toast.error('No se pudo confirmar', (err as Error).message);
    }
  }

  async reject(pago: PagoView): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Rechazar pago',
      description: `¿Rechazar el pago de «${pago.nombreGrupo}»?`,
      confirmLabel: 'Rechazar',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await this.store.rechazarPago(pago.id, 'Rechazado por el administrador');
      if (this.selected()?.id === pago.id) {
        this.selected.set({ ...pago, estado: 'RECHAZADO' });
      }
      this.toast.warning('Pago rechazado', pago.codigo);
    } catch (err) {
      this.toast.error('No se pudo rechazar', (err as Error).message);
    }
  }
}
