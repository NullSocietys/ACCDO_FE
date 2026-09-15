import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InscripcionEstado, InscripcionView } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { BadgeComponent, statusLabel, statusTone } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { InputComponent } from '../../shared/ui/input.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

type EstadoFiltro = 'todos' | InscripcionEstado;

interface DetailMember {
  id: string;
  nombreCompleto: string;
  iniciales: string;
  celular: string;
}

function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0].charAt(0)}${partes[1].charAt(0)}`.toUpperCase();
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** Filas por página: caben en viewport con mast + filtros sin scroll excesivo. */
const PAGE_SIZE = 10;

@Component({
  selector: 'app-inscripciones-page',
  imports: [
    CurrencyPipe,
    FormsModule,
    RouterLink,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    InputComponent,
    ModalComponent,
    PaginationComponent,
    SkeletonComponent,
  ],
  styleUrl: './inscripciones.page.css',
  templateUrl: './inscripciones.page.html',
})
export class InscripcionesPage {
  readonly store = inject(DataStoreService);
  readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  readonly statusTone = statusTone;
  readonly statusLabel = statusLabel;
  readonly pageSize = PAGE_SIZE;

  readonly busqueda = signal('');
  readonly eventoFilter = signal('');
  readonly categoriaFilter = signal('');
  readonly estadoFiltro = signal<EstadoFiltro>('todos');
  readonly selected = signal<InscripcionView | null>(null);
  readonly page = signal(1);
  /** Esqueleto de carga inicial (igual que el dashboard). */
  readonly cargando = signal(true);

  readonly filtros: { key: EstadoFiltro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'CONFIRMADA', label: 'Confirmadas' },
    { key: 'PENDIENTE', label: 'Pendientes' },
    { key: 'RECHAZADA', label: 'Rechazadas' },
  ];

  readonly overview = computed(() => {
    const list = this.store.inscripcionesView();
    const total = list.length;
    const confirmadas = list.filter((i) => i.estado === 'CONFIRMADA');
    const pendientes = list.filter((i) => i.estado === 'PENDIENTE').length;

    return {
      total,
      confirmadas: confirmadas.length,
      pendientes,
      monto: confirmadas.reduce((sum, i) => sum + i.total, 0),
    };
  });

  readonly filtered = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const estado = this.estadoFiltro();
    return this.store.inscripcionesView().filter((ins) => {
      const matchQ =
        !q ||
        ins.nombreGrupo.toLowerCase().includes(q) ||
        ins.codigo.toLowerCase().includes(q) ||
        ins.responsableNombre.toLowerCase().includes(q) ||
        ins.categoriaNombre.toLowerCase().includes(q);
      const matchEv = !this.eventoFilter() || ins.eventoId === this.eventoFilter();
      const matchCat = !this.categoriaFilter() || ins.categoriaNombre === this.categoriaFilter();
      const matchEst = estado === 'todos' || ins.estado === estado;
      return matchQ && matchEv && matchCat && matchEst;
    });
  });

  readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  readonly rangeLabel = computed(() => {
    const total = this.filtered().length;
    if (total === 0) return '0 resultados';
    const from = (this.page() - 1) * this.pageSize + 1;
    const to = Math.min(this.page() * this.pageSize, total);
    return `${from}–${to} de ${total}`;
  });

  readonly modalDescription = computed(() => {
    const ins = this.selected();
    if (!ins) return null;
    return `${ins.categoriaNombre} · ${ins.codigo}`;
  });

  readonly detailMembers = computed((): DetailMember[] => {
    const ins = this.selected();
    if (!ins) return [];
    return this.store
      .participantesView()
      .filter((p) => p.inscripcionId === ins.id)
      .map((p) => ({
        id: p.id,
        nombreCompleto: p.nombres,
        iniciales: inicialesDe(p.nombres),
        celular: p.celular ?? '—',
      }));
  });

  /** Rellenado de nómina: cuando el cliente saltó el paso de participantes,
   *  el admin agrega los bailarines (nombre + celular) desde el detalle. */
  readonly nuevoNombre = signal('');
  readonly nuevoCelular = signal('');
  readonly agregandoParticipante = signal(false);

  async agregarParticipante(): Promise<void> {
    const ins = this.selected();
    const nombre = this.nuevoNombre().trim();
    const celular = this.nuevoCelular().trim();
    if (!ins || !nombre || this.agregandoParticipante()) return;
    if (!/^9\d{8}$/.test(celular)) {
      this.toast.error('El celular debe tener 9 dígitos y empezar con 9');
      return;
    }
    this.agregandoParticipante.set(true);
    try {
      await this.store.addParticipante(ins.id, { nombres: nombre, celular });
      this.nuevoNombre.set('');
      this.nuevoCelular.set('');
      this.toast.success('Participante agregado a la nómina');
    } catch (err) {
      this.toast.error((err as Error).message || 'No se pudo agregar el participante');
    } finally {
      this.agregandoParticipante.set(false);
    }
  }

  constructor() {
    window.setTimeout(() => this.cargando.set(false), 500);
    effect(() => {
      this.busqueda();
      this.eventoFilter();
      this.categoriaFilter();
      this.estadoFiltro();
      untracked(() => this.page.set(1));
    });
  }

  cuentaEstado(key: EstadoFiltro): number {
    if (key === 'todos') return this.store.inscripcionesView().length;
    return this.store.inscripcionesView().filter((i) => i.estado === key).length;
  }

  formatFecha(fecha: string): string {
    const d = Number(fecha.slice(8, 10));
    const m = MESES[Number(fecha.slice(5, 7)) - 1] ?? '';
    const y = fecha.slice(0, 4);
    return `${d} ${m} ${y}`;
  }

  formatRegistro(ins: InscripcionView): string {
    const created = ins.createdAt;
    const fecha = created.slice(0, 10);
    const hora = created.includes('T') ? created.slice(11, 16) : '';
    return hora ? `${this.formatFecha(fecha)} · ${hora}` : this.formatFecha(fecha);
  }

  rowIndex(localIndex: number): string {
    return String(localIndex + 1).padStart(2, '0');
  }

  openDetail(ins: InscripcionView): void {
    this.selected.set(ins);
  }

  closeDetail(): void {
    this.selected.set(null);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.eventoFilter.set('');
    this.categoriaFilter.set('');
    this.estadoFiltro.set('todos');
  }

  onPageChange(next: number): void {
    this.page.set(next);
    const folio = document.querySelector('.folio');
    if (!folio) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    folio.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  goNew(): void {
    void this.router.navigateByUrl('/admin/inscripciones/nueva');
  }

  async remove(ins: InscripcionView): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Eliminar inscripción',
      description: `¿Eliminar la inscripción de «${ins.nombreGrupo}»?`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    if (this.selected()?.id === ins.id) this.selected.set(null);
    this.store.removeInscripcion(ins.id);
    this.toast.success('Inscripción eliminada');
  }
}
