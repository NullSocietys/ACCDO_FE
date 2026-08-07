import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CATEGORIAS } from '../../core/data/mock-data';
import { Inscripcion, InscripcionEstado, Sexo } from '../../core/models';
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
    IconComponent,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    InputComponent,
    KpiBoardComponent,
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
  readonly selected = signal<Inscripcion | null>(null);
  readonly page = signal(1);

  readonly filtros: { key: EstadoFiltro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'confirmada', label: 'Confirmadas' },
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'borrador', label: 'Borradores' },
    { key: 'rechazada', label: 'Rechazadas' },
  ];

  readonly overview = computed(() => {
    const list = this.store.inscripciones();
    const total = list.length;
    const confirmadas = list.filter((i) => i.estado === 'confirmada');
    const pendientes = list.filter((i) => i.estado === 'pendiente').length;
    const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

    return {
      total,
      confirmadas: confirmadas.length,
      pendientes,
      monto: confirmadas.reduce((sum, i) => sum + i.monto, 0),
      pctConfirmadas: pct(confirmadas.length),
    };
  });

  readonly kpis = computed((): KpiItem[] => {
    const o = this.overview();
    const monto = new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      maximumFractionDigits: 0,
    }).format(o.monto);

    return [
      {
        label: 'Inscripciones',
        value: o.total,
        hint: 'Total en temporada',
        icon: 'clipboardList',
        tone: 'ink',
      },
      {
        label: 'Confirmadas',
        value: o.confirmadas,
        hint: `${o.pctConfirmadas}% del registro`,
        icon: 'circle-check',
        tone: 'ok',
      },
      {
        label: 'Pendientes',
        value: o.pendientes,
        hint: o.pendientes > 0 ? 'Requieren revisión' : 'Sin cola de revisión',
        icon: 'clock',
        tone: 'warn',
      },
      {
        label: 'Monto declarado',
        value: monto,
        hint: 'Solo confirmadas',
        icon: 'wallet',
        tone: 'gold',
        money: true,
      },
    ];
  });

  readonly filtered = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const estado = this.estadoFiltro();
    return this.store.inscripciones().filter((ins) => {
      const matchQ =
        !q ||
        ins.grupo.toLowerCase().includes(q) ||
        ins.codigo.toLowerCase().includes(q) ||
        ins.responsable.toLowerCase().includes(q) ||
        ins.categoria.toLowerCase().includes(q);
      const matchEv = !this.eventoFilter() || ins.eventoId === this.eventoFilter();
      const matchCat = !this.categoriaFilter() || ins.categoria === this.categoriaFilter();
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
    return `${ins.categoria} · ${ins.codigo}`;
  });

  readonly detailMembers = computed((): DetailMember[] => {
    const ins = this.selected();
    if (!ins) return [];
    return this.store
      .participantes()
      .filter((p) => p.inscripcionId === ins.id)
      .map((p) => ({
        id: p.id,
        nombreCompleto: `${p.nombre} ${p.apellido}`,
        iniciales: `${p.nombre.charAt(0)}${p.apellido.charAt(0)}`.toUpperCase(),
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
    if (key === 'todos') return this.store.inscripciones().length;
    return this.store.inscripciones().filter((i) => i.estado === key).length;
  }

  formatFecha(fecha: string): string {
    const d = Number(fecha.slice(8, 10));
    const m = MESES[Number(fecha.slice(5, 7)) - 1] ?? '';
    const y = fecha.slice(0, 4);
    return `${d} ${m} ${y}`;
  }

  formatRegistro(ins: Inscripcion): string {
    return `${this.formatFecha(ins.fecha)} · ${ins.hora}`;
  }

  goToPage(page: number): void {
    const next = Math.min(Math.max(1, page), this.totalPages());
    this.page.set(next);
  }

  openDetail(ins: Inscripcion): void {
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

  async remove(ins: Inscripcion): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Eliminar inscripción',
      description: `¿Eliminar la inscripción de «${ins.grupo}»?`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    if (this.selected()?.id === ins.id) this.selected.set(null);
    this.store.inscripciones.update((list) => list.filter((i) => i.id !== ins.id));
    this.toast.success('Inscripción eliminada');
  }
}
