import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CATEGORIAS } from '../../core/data/mock-data';
import { InscripcionEstado, InscripcionView, Sexo } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { BadgeComponent, statusLabel, statusTone } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { InputComponent } from '../../shared/ui/input.component';
import { ModalComponent } from '../../shared/ui/modal.component';

type EstadoFiltro = 'todos' | InscripcionEstado;

interface DetailMember {
  id: string;
  nombreCompleto: string;
  iniciales: string;
  dni: string;
  edad: number;
  sexo: Sexo;
  sexoLabel: string;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const PAGE_SIZE = 5;

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
  readonly categorias = CATEGORIAS;
  readonly pageSize = PAGE_SIZE;

  readonly busqueda = signal('');
  readonly eventoFilter = signal('');
  readonly categoriaFilter = signal('');
  readonly estadoFiltro = signal<EstadoFiltro>('todos');
  readonly selected = signal<InscripcionView | null>(null);
  readonly page = signal(1);

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
        nombreCompleto: `${p.nombres} ${p.apellidos}`,
        iniciales: `${p.nombres.charAt(0)}${p.apellidos.charAt(0)}`.toUpperCase(),
        dni: p.dni,
        edad: p.edad,
        sexo: p.sexo,
        sexoLabel: p.sexo === 'M' ? 'Varón' : 'Mujer',
      }));
  });

  constructor() {
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

  goToPage(page: number): void {
    const next = Math.min(Math.max(1, page), this.totalPages());
    this.page.set(next);
  }

  rowIndex(localIndex: number): string {
    const p = Math.min(this.page(), this.totalPages());
    return String((p - 1) * this.pageSize + localIndex + 1).padStart(2, '0');
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

  goNew(): void {
    void this.router.navigateByUrl('/inscripciones/nueva');
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
