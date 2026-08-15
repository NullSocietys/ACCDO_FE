import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Evento, Reclamo } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { EventoApiService } from '../../core/services/api/evento.api.service';
import { ReclamoApiService } from '../../core/services/api/reclamo.api.service';
import { ToastService } from '../../core/services/toast.service';
import { BadgeComponent, statusLabel, statusTone } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { InputComponent } from '../../shared/ui/input.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

type EstadoFiltro = 'pendientes' | 'atendidos';

const PAGE_SIZE = 6;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

@Component({
  selector: 'app-reclamos-admin-page',
  imports: [
    FormsModule,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    InputComponent,
    ModalComponent,
    PaginationComponent,
    SkeletonComponent,
  ],
  styleUrl: './reclamos-admin.page.css',
  templateUrl: './reclamos-admin.page.html',
})
export class ReclamosAdminPage {
  private readonly reclamoApi = inject(ReclamoApiService);
  private readonly eventoApi = inject(EventoApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly statusTone = statusTone;
  readonly statusLabel = statusLabel;
  readonly pageSize = PAGE_SIZE;

  readonly cargando = signal(true);
  readonly pendientes = signal<Reclamo[]>([]);
  readonly atendidos = signal<Reclamo[]>([]);
  readonly eventos = signal<Evento[]>([]);
  readonly busqueda = signal('');
  readonly estadoFiltro = signal<EstadoFiltro>('pendientes');
  readonly page = signal(1);
  readonly selected = signal<Reclamo | null>(null);
  readonly busyId = signal<string | null>(null);

  readonly filtros: { key: EstadoFiltro; label: string }[] = [
    { key: 'pendientes', label: 'Pendientes' },
    { key: 'atendidos', label: 'Atendidos' },
  ];

  readonly overview = computed(() => ({
    pendientes: this.pendientes().length,
    atendidos: this.atendidos().length,
    total: this.pendientes().length + this.atendidos().length,
  }));

  readonly lista = computed(() =>
    this.estadoFiltro() === 'pendientes' ? this.pendientes() : this.atendidos(),
  );

  readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return this.lista().filter((r) => {
      if (!q) return true;
      const evento = this.nombreEvento(r.eventoId).toLowerCase();
      return (
        r.nombreGrupo.toLowerCase().includes(q) ||
        r.encargadoNombres.toLowerCase().includes(q) ||
        r.encargadoApellidos.toLowerCase().includes(q) ||
        r.encargadoDni.includes(q) ||
        r.correo.toLowerCase().includes(q) ||
        evento.includes(q)
      );
    });
  });

  readonly paginado = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtrados().slice(start, start + this.pageSize);
  });

  readonly rangeLabel = computed(() => {
    const total = this.filtrados().length;
    if (total === 0) return '0 resultados';
    const from = (this.page() - 1) * this.pageSize + 1;
    const to = Math.min(this.page() * this.pageSize, total);
    return `${from}–${to} de ${total}`;
  });

  constructor() {
    this.cargar();
    effect(() => {
      this.busqueda();
      this.estadoFiltro();
      untracked(() => this.page.set(1));
    });
  }

  cargar(): void {
    this.cargando.set(true);
    forkJoin({
      pendientes: this.reclamoApi.listarPendientes(),
      atendidos: this.reclamoApi.listarAtendidos(),
      eventos: this.eventoApi.listar(),
      inactivos: this.eventoApi.listarInactivos(),
    }).subscribe({
      next: ({ pendientes, atendidos, eventos, inactivos }) => {
        this.pendientes.set(pendientes);
        this.atendidos.set(atendidos);
        this.eventos.set([...eventos, ...inactivos]);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar los reclamos', err?.message ?? '');
      },
    });
  }

  nombreEvento(id: string): string {
    return this.eventos().find((e) => e.id === id)?.nombre ?? 'Evento';
  }

  encargadoNombre(r: Reclamo): string {
    return `${r.encargadoNombres} ${r.encargadoApellidos}`.trim();
  }

  fechaCorta(raw: string): string {
    if (!raw) return '—';
    const fecha = raw.slice(0, 10);
    const d = Number(fecha.slice(8, 10));
    const m = MESES[Number(fecha.slice(5, 7)) - 1] ?? '';
    const y = fecha.slice(0, 4);
    return `${d} ${m} ${y}`;
  }

  rowIndex(localIndex: number): string {
    return String((this.page() - 1) * this.pageSize + localIndex + 1).padStart(2, '0');
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.page.set(1);
  }

  onPageChange(next: number): void {
    this.page.set(next);
    const folio = document.querySelector('.folio');
    if (!folio) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    folio.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  openDetail(reclamo: Reclamo): void {
    this.selected.set(reclamo);
  }

  closeDetail(): void {
    this.selected.set(null);
  }

  async atender(reclamo: Reclamo): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Marcar como atendido',
      description: `¿Confirmas que el reclamo de «${reclamo.nombreGrupo}» ya fue resuelto?`,
      confirmLabel: 'Atender',
    });
    if (!ok) return;
    this.busyId.set(reclamo.id);
    this.reclamoApi.atender(reclamo.id).subscribe({
      next: (updated) => {
        this.pendientes.update((list) => list.filter((r) => r.id !== updated.id));
        this.atendidos.update((list) => [updated, ...list]);
        this.busyId.set(null);
        this.selected.set(null);
        this.toast.success('Reclamo atendido', reclamo.nombreGrupo);
      },
      error: (err: Error) => {
        this.busyId.set(null);
        this.toast.error('No se pudo atender', err?.message ?? '');
      },
    });
  }

  async restaurar(reclamo: Reclamo): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Reabrir reclamo',
      description: `¿Devolver «${reclamo.nombreGrupo}» a pendientes?`,
      confirmLabel: 'Reabrir',
    });
    if (!ok) return;
    this.busyId.set(reclamo.id);
    this.reclamoApi.restaurar(reclamo.id).subscribe({
      next: (updated) => {
        this.atendidos.update((list) => list.filter((r) => r.id !== updated.id));
        this.pendientes.update((list) => [updated, ...list]);
        this.busyId.set(null);
        this.selected.set(null);
        this.toast.success('Reclamo reabierto', reclamo.nombreGrupo);
      },
      error: (err: Error) => {
        this.busyId.set(null);
        this.toast.error('No se pudo reabrir', err?.message ?? '');
      },
    });
  }

  async eliminar(reclamo: Reclamo): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Eliminar reclamo',
      description: `Esta acción no se puede deshacer. ¿Eliminar el reclamo de «${reclamo.nombreGrupo}»?`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    this.busyId.set(reclamo.id);
    this.reclamoApi.eliminar(reclamo.id).subscribe({
      next: () => {
        this.pendientes.update((list) => list.filter((r) => r.id !== reclamo.id));
        this.atendidos.update((list) => list.filter((r) => r.id !== reclamo.id));
        this.busyId.set(null);
        this.selected.set(null);
        this.toast.success('Reclamo eliminado', reclamo.nombreGrupo);
      },
      error: (err: Error) => {
        this.busyId.set(null);
        this.toast.error('No se pudo eliminar', err?.message ?? '');
      },
    });
  }
}
