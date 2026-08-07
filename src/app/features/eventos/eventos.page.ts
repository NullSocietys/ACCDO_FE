import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Evento, EventoEstado } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { BadgeComponent, statusLabel, statusTone } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { InputComponent } from '../../shared/ui/input.component';
import { ModalComponent } from '../../shared/ui/modal.component';

const emptyForm = (): Omit<Evento, 'id'> => ({
  nombre: '',
  descripcion: '',
  fecha: '',
  hora: '',
  lugar: '',
  estado: 'PROXIMO',
  activo: true,
  createdAt: new Date().toISOString(),
});

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

type EstadoFiltro = 'todos' | EventoEstado;

@Component({
  selector: 'app-eventos-page',
  imports: [
    FormsModule,
    RouterLink,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    InputComponent,
    ModalComponent,
  ],
  styleUrl: './eventos.page.css',
  templateUrl: './eventos.page.html',
})
export class EventosPage {
  readonly store = inject(DataStoreService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly statusTone = statusTone;
  readonly statusLabel = statusLabel;

  readonly busqueda = signal('');
  readonly estadoFiltro = signal<EstadoFiltro>('todos');
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly form = signal(emptyForm());

  readonly filtros: { key: EstadoFiltro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'ACTIVO', label: 'Activos' },
    { key: 'PROXIMO', label: 'Próximos' },
    { key: 'FINALIZADO', label: 'Finalizados' },
    { key: 'CANCELADO', label: 'Cancelados' },
  ];

  private readonly ordenados = computed(() =>
    [...this.store.eventos()].sort(
      (a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora),
    ),
  );

  readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const f = this.estadoFiltro();
    return this.ordenados().filter(
      (e) =>
        (f === 'todos' || e.estado === f) &&
        (!q ||
          e.nombre.toLowerCase().includes(q) ||
          e.lugar.toLowerCase().includes(q) ||
          e.descripcion.toLowerCase().includes(q)),
    );
  });

  readonly featured = computed(() => {
    const activos = this.ordenados().filter((e) => e.estado === 'ACTIVO' && e.activo);
    const ev = activos[0];
    if (!ev) return null;
    const q = this.busqueda().trim().toLowerCase();
    const f = this.estadoFiltro();
    const pasaFiltro = f === 'todos' || f === 'ACTIVO';
    const pasaBusqueda =
      !q || ev.nombre.toLowerCase().includes(q) || ev.lugar.toLowerCase().includes(q);
    return pasaFiltro && pasaBusqueda ? ev : null;
  });

  readonly overview = computed(() => {
    const eventos = this.store.eventos();
    return {
      total: eventos.length,
      activos: eventos.filter((e) => e.estado === 'ACTIVO').length,
      proximos: eventos.filter((e) => e.estado === 'PROXIMO').length,
      grupos: this.store.inscripcionesView().filter((i) => i.estado !== 'RECHAZADA').length,
    };
  });

  private inscripcionesDe(eventoId: string) {
    return this.store
      .inscripcionesView()
      .filter((i) => i.eventoId === eventoId && i.estado !== 'RECHAZADA');
  }

  gruposDe(eventoId: string): number {
    return this.inscripcionesDe(eventoId).length;
  }

  integrantesDe(eventoId: string): number {
    return this.inscripcionesDe(eventoId).reduce((sum, i) => sum + i.cantidadIntegrantes, 0);
  }

  cuentaEstado(key: EstadoFiltro): number {
    if (key === 'todos') return this.store.eventos().length;
    return this.store.eventos().filter((e) => e.estado === key).length;
  }

  /* Fecha parsing local (evita desfase de zona horaria del date pipe) */
  dayOf(fecha: string): string {
    return String(Number(fecha.slice(8, 10)));
  }

  monthOf(fecha: string): string {
    return MESES[Number(fecha.slice(5, 7)) - 1] ?? '';
  }

  yearOf(fecha: string): string {
    return fecha.slice(0, 4);
  }

  weekdayOf(fecha: string): string {
    const d = new Date(
      Number(fecha.slice(0, 4)),
      Number(fecha.slice(5, 7)) - 1,
      Number(fecha.slice(8, 10)),
    );
    return DIAS[d.getDay()] ?? '';
  }

  countdownLabel(evento: Evento): string | null {
    if (evento.estado === 'FINALIZADO' || evento.estado === 'CANCELADO') return null;
    const target = new Date(
      Number(evento.fecha.slice(0, 4)),
      Number(evento.fecha.slice(5, 7)) - 1,
      Number(evento.fecha.slice(8, 10)),
    );
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dias = Math.round((target.getTime() - hoy.getTime()) / 86_400_000);
    if (dias < 0) return null;
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Mañana';
    return `En ${dias} días`;
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.estadoFiltro.set('todos');
  }

  rowIndex(localIndex: number): string {
    return String(localIndex + 1).padStart(2, '0');
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.set(emptyForm());
    this.modalOpen.set(true);
  }

  openEdit(evento: Evento): void {
    this.editingId.set(evento.id);
    const { id: _id, ...rest } = evento;
    this.form.set(rest);
    this.modalOpen.set(true);
  }

  patch(partial: Partial<Omit<Evento, 'id'>>): void {
    this.form.update((f) => ({ ...f, ...partial }));
  }

  save(): void {
    const data = this.form();
    if (!data.nombre || !data.fecha || !data.hora || !data.lugar) {
      this.toast.warning('Complete los campos obligatorios');
      return;
    }
    const id = this.editingId();
    if (id) {
      this.store.updateEvento({ id, ...data, estado: data.estado as EventoEstado });
      this.toast.success('Evento actualizado');
    } else {
      this.store.addEvento({
        id: crypto.randomUUID(),
        ...data,
        estado: data.estado as EventoEstado,
        activo: true,
        createdAt: new Date().toISOString(),
      });
      this.toast.success('Evento creado');
    }
    this.modalOpen.set(false);
  }

  async remove(evento: Evento): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Eliminar evento',
      description: `¿Eliminar «${evento.nombre}»?`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    this.store.removeEvento(evento.id);
    this.toast.success('Evento eliminado');
  }
}
