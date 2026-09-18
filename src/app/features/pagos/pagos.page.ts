import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, OnDestroy, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute);

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

  constructor() {
    // Deep-link del dashboard: /admin/pagos?filtro=PENDIENTE abre la cola.
    const filtro = this.route.snapshot.queryParamMap.get('filtro');
    if (filtro === 'PENDIENTE' || filtro === 'CONFIRMADO' || filtro === 'RECHAZADO') {
      this.estadoFiltro.set(filtro);
    }
    window.setTimeout(() => this.cargando.set(false), 500);
    effect(() => {
      this.busqueda();
      this.estadoFiltro();
      untracked(() => this.page.set(1));
    });
  }

  /** WhatsApp del responsable para un pago pendiente/rechazado. */
  waHref(pago: PagoView): string {
    const tel = pago.responsableTelefono?.replace(/\D/g, '') ?? '';
    const texto = encodeURIComponent(
      `Hola ${pago.responsableNombre}! Revisamos la inscripción ${pago.codigo} ` +
        `de «${pago.nombreGrupo}» en el VII Concurso Nacional de Caporales 2026. ` +
        `El pago de S/ ${pago.monto} (Op. ${pago.numeroOperacion || 'sin número'}) está ` +
        `${pago.estado === 'PENDIENTE' ? 'pendiente de verificación' : 'rechazado'}. ` +
        `¿Podemos ayudarte con algo?`,
    );
    return tel
      ? `https://wa.me/51${tel}?text=${texto}`
      : `https://wa.me/51926266295?text=${texto}`;
  }

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
  readonly isFullPage = computed(() => this.paged().length >= this.pageSize);  readonly rangeLabel = computed(() => {
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

  /* ── MODAL DE RECHAZO: estado del confirm con motivo ── */

  readonly modalRechazoAbierto = signal(false);
  readonly pagoRechazo = signal<PagoView | null>(null);
  readonly motivoRechazo = signal('');
  readonly errorMotivo = signal('');
  readonly procesando = signal(false);

  readonly motivosFrecuentes: readonly string[] = [
    'Comprobante ilegible o incompleto',
    'El nombre no coincide con el titular del pago',
    'El monto abonado no coincide con el total',
    'La operación de Yape no corresponde a la fecha del evento',
  ];

  abrirModalRechazo(pago: PagoView): void {
    this.pagoRechazo.set(pago);
    this.motivoRechazo.set('');
    this.errorMotivo.set('');
    this.modalRechazoAbierto.set(true);
  }

  cancelarRechazo(): void {
    this.modalRechazoAbierto.set(false);
    this.pagoRechazo.set(null);
    this.motivoRechazo.set('');
    this.errorMotivo.set('');
  }

  async confirmarRechazo(): Promise<void> {
    const pago = this.pagoRechazo();
    if (!pago) return;
    const motivo = this.motivoRechazo().trim();
    if (!motivo) {
      this.errorMotivo.set('Indica el motivo: el responsable lo verá en su seguimiento.');
      return;
    }
    this.procesando.set(true);
    try {
      await this.store.rechazarPago(pago.id, motivo);
      if (this.selected()?.id === pago.id) {
        this.selected.set({ ...pago, estado: 'RECHAZADO' });
      }
      this.cancelarRechazo();
      this.toast.warning('Pago e inscripción rechazados', pago.codigo);
    } catch (err) {
      this.errorMotivo.set((err as Error).message || 'No se pudo rechazar el pago.');
    } finally {
      this.procesando.set(false);
    }
  }

  /** Atajo: el ícono ✕ de la fila abre el mismo modal del footer. */
  reject(pago: PagoView): void {
    this.abrirModalRechazo(pago);
  }

  /* ── ACCIONES MASIVAS: aprobar varios pagos pendientes a la vez ── */

  seleccionados = signal<Set<string>>(new Set());
  procesandoMasivo = signal(false);

  toggleMasivo(id: string): void {
    const next = new Set(this.seleccionados());
    next.has(id) ? next.delete(id) : next.add(id);
    this.seleccionados.set(next);
  }

  limpiarMasivo(): void {
    this.seleccionados.set(new Set());
  }

  async aprobarSeleccionados(): Promise<void> {
    const ids = [...this.seleccionados()].filter((id) =>
      this.store.pagosView().some((p) => p.id === id && p.estado === 'PENDIENTE'),
    );
    if (!ids.length) return;
    this.procesandoMasivo.set(true);
    let ok = 0;
    for (const id of ids) {
      try {
        await this.store.confirmarPago(id);
        ok++;
      } catch {
        /* sigue con el siguiente; al final se resumen */
      }
    }
    this.limpiarMasivo();
    this.procesandoMasivo.set(false);
    if (ok === ids.length) {
      this.toast.success(`${ok} pago(s) verificados`);
    } else {
      this.toast.warning(`${ok} de ${ids.length} verificados`, 'Revisa los que quedaron pendientes');
    }
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
}
