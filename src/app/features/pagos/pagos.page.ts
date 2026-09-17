import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, OnDestroy, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Pago, PagoEstado, PagoView, InscripcionView } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { PagoApiService } from '../../core/services/api/pago.api.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { BadgeComponent, statusLabel, statusTone } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { InputComponent } from '../../shared/ui/input.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

type EstadoFiltro = 'todos' | PagoEstado;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** Filas por página (patrón usuarios): filas compactas de tabla. */
const PAGE_SIZE = window.innerWidth <= 700 ? 5 : 10;

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
    ModalComponent,
    PaginationComponent,
    SkeletonComponent,
  ],
  styleUrl: './pagos.page.css',
  templateUrl: './pagos.page.html',
})
export class PagosPage implements OnDestroy {
  readonly store = inject(DataStoreService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly pagoApi = inject(PagoApiService);
  private readonly http = inject(HttpClient);

  readonly statusTone = statusTone;
  readonly statusLabel = statusLabel;
  readonly pageSize = PAGE_SIZE;

  readonly busqueda = signal('');
  readonly estadoFiltro = signal<EstadoFiltro>('todos');
  readonly page = signal(1);
  /** Esqueleto de carga inicial (igual que el dashboard). */
  readonly cargando = signal(true);
  readonly selected = signal<PagoView | null>(null);
  /** URL para <img>/<iframe> del voucher (Cloudinary o blob autenticado). */
  readonly comprobanteSrc = signal<string | null>(null);
  readonly comprobanteEsPdf = signal(false);
  private comprobanteBlobUrl: string | null = null;
  /** Subida manual del voucher desde el panel (reenvío/reemplazo). */
  readonly subiendo = signal(false);
  readonly voucherPendiente = signal<File | null>(null);
  readonly voucherError = signal('');

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

  readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  /** true cuando la página actual tiene exactamente pageSize filas.
   *  Página llena → la card usa flex:1 y llena el alto disponible.
   *  Página parcial → la card mide lo justo (altura natural).
   */
  readonly isFullPage = computed(() => this.paged().length >= this.pageSize);

  readonly rangeLabel = computed(() => {
    const total = this.filtered().length;
    if (total === 0) return '0 resultados';
    const from = (this.page() - 1) * this.pageSize + 1;
    const to = Math.min(this.page() * this.pageSize, total);
    return `${from}–${to} de ${total}`;
  });

  readonly modalDescription = computed(() => {
    const pago = this.selected();
    if (!pago) return null;
    return `${pago.codigo} · ${statusLabel(pago.metodoPago)}`;
  });

  /** Inscripción asociada al pago seleccionado: datos completos para revisión. */
  readonly inscripcionSeleccionada = computed(() => {
    const pago = this.selected();
    if (!pago) return null;
    return this.store.inscripcionesView().find((i) => i.id === pago.inscripcionId) ?? null;
  });

  /** Nómina de la inscripción seleccionada (participantes que competirán). */
  readonly participantesSeleccionados = computed(() => {
    const ins = this.inscripcionSeleccionada();
    if (!ins) return [];
    return this.store
      .participantesView()
      .filter((p) => p.inscripcionId === ins.id);
  });

  ubicacionDe(ins: InscripcionView | null): string {
    if (!ins) return '—';
    return (
      [ins.responsableDepartamento, ins.responsableProvincia, ins.responsableDistrito]
        .filter(Boolean)
        .join(' / ') || '—'
    );
  }

  constructor() {
    window.setTimeout(() => this.cargando.set(false), 500);
    effect(() => {
      this.busqueda();
      this.estadoFiltro();
      untracked(() => this.page.set(1));
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

  onPageChange(next: number): void {
    this.page.set(next);
    const folio = document.querySelector('.folio');
    if (!folio) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    folio.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  viewComprobante(pago: PagoView): void {
    this.selected.set(pago);
    this.voucherPendiente.set(null);
    this.voucherError.set('');
    void this.cargarVistaComprobante(pago);
  }

  closeComprobante(): void {
    this.selected.set(null);
    this.limpiarComprobanteSrc();
  }

  ngOnDestroy(): void {
    this.limpiarComprobanteSrc();
  }

  private limpiarComprobanteSrc(): void {
    if (this.comprobanteBlobUrl) {
      URL.revokeObjectURL(this.comprobanteBlobUrl);
      this.comprobanteBlobUrl = null;
    }
    this.comprobanteSrc.set(null);
    this.comprobanteEsPdf.set(false);
  }

  private async cargarVistaComprobante(pago: PagoView): Promise<void> {
    this.limpiarComprobanteSrc();
    const ref = (pago.comprobante ?? '').trim();
    if (!ref) return;

    const esUrl = /^https?:\/\//i.test(ref);
    const esPdf = /\.pdf($|\?)/i.test(ref) || ref.toLowerCase().includes('/raw/');
    this.comprobanteEsPdf.set(esPdf);

    if (esUrl) {
      this.comprobanteSrc.set(ref);
      return;
    }

    try {
      const blob = await firstValueFrom(
        this.http.get(this.pagoApi.urlComprobante(pago.id), { responseType: 'blob' }),
      );
      this.comprobanteEsPdf.set(blob.type === 'application/pdf' || esPdf);
      this.comprobanteBlobUrl = URL.createObjectURL(blob);
      this.comprobanteSrc.set(this.comprobanteBlobUrl);
    } catch {
      this.toast.warning('No se pudo cargar el comprobante', 'Intente de nuevo o revise el archivo.');
    }
  }

  /* ============================================================
     SUBIDA MANUAL DEL VOUCHER (reenvío / reemplazo)
     ============================================================ */

  onVoucherFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      this.voucherError.set('Solo fotos (JPG/PNG) o PDF.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      this.voucherError.set('El archivo supera los 8 MB.');
      return;
    }
    this.voucherError.set('');
    this.voucherPendiente.set(file);
  }

  async subirVoucher(): Promise<void> {
    const pago = this.selected();
    const file = this.voucherPendiente();
    if (!pago || !file || this.subiendo()) return;
    this.subiendo.set(true);
    this.voucherError.set('');
    try {
      const actualizado = await firstValueFrom(
        this.pagoApi.adjuntarComprobante(pago.id, file),
      );
      this.store.pagos.update((list) =>
        list.map((p) => (p.id === pago.id ? actualizado : p)),
      );
      this.selected.set({ ...pago, comprobante: actualizado.comprobante });
      this.voucherPendiente.set(null);
      this.toast.success('Voucher guardado', pago.codigo);
      await this.cargarVistaComprobante({ ...pago, comprobante: actualizado.comprobante });
    } catch (err) {
      this.voucherError.set((err as Error).message || 'No se pudo subir el archivo.');
    } finally {
      this.subiendo.set(false);
    }
  }

  descartarVoucherPendiente(): void {
    this.voucherPendiente.set(null);
    this.voucherError.set('');
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
    } catch (err) {
      this.toast.error('No se pudo confirmar', (err as Error).message);
    }
  }

  async reject(pago: PagoView): Promise<void> {
    const motivoInput = window.prompt(
      `Motivo del rechazo del pago de «${pago.nombreGrupo}» (el responsable lo verá en el seguimiento):`,
      'Comprobante ilegible o incompleto',
    );
    if (motivoInput === null) return;
    const motivo = motivoInput.trim();
    if (!motivo) {
      this.toast.error('Debes indicar un motivo para rechazar el pago');
      return;
    }
    const ok = await this.confirm.ask({
      title: 'Rechazar pago',
      description: `Se rechazará el pago y la inscripción «${pago.nombreGrupo}» (${pago.codigo}).`,
      confirmLabel: 'Rechazar',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await this.store.rechazarPago(pago.id, motivo);
      if (this.selected()?.id === pago.id) {
        this.selected.set({ ...pago, estado: 'RECHAZADO' });
      }
      this.toast.warning('Pago e inscripción rechazados', pago.codigo);
    } catch (err) {
      this.toast.error('No se pudo rechazar', (err as Error).message);
    }
  }
}
