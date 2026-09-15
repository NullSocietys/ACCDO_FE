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
import { IconComponent } from '../../shared/icons/icon.component';
import { InputComponent } from '../../shared/ui/input.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

const emptyForm = (): Omit<Evento, 'id'> => ({
  nombre: '',
  descripcion: '',
  fecha: '',
  hora: '',
  lugar: '',
  estado: 'ACTIVO',
  activo: true,
  createdAt: new Date().toISOString(),
});

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const PAGE_SIZE = 5;

type EstadoFiltro = 'todos' | 'inactivos' | EventoEstado;

@Component({
  selector: 'app-eventos-page',
  imports: [
    FormsModule,
    RouterLink,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    IconComponent,
    InputComponent,
    ModalComponent,
    PaginationComponent,
    SkeletonComponent,
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
  readonly estadoOriginal = signal<string | null>(null);
  readonly form = signal(emptyForm());
  readonly errores = signal<Record<string, string>>({});
  readonly pageSize = PAGE_SIZE;
  readonly page = signal(1);
  /** Esqueleto de carga inicial (igual que el dashboard). */
  readonly cargando = signal(true);

  constructor() {
    window.setTimeout(() => this.cargando.set(false), 500);
  }

  readonly filtros: { key: EstadoFiltro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'ACTIVO', label: 'Activos' },
    { key: 'CERRADO', label: 'Cerrados' },
    { key: 'CANCELADO', label: 'Cancelados' },
    { key: 'inactivos', label: 'Inactivos' },
  ];

  private readonly lista = computed(() => {
    const f = this.estadoFiltro();
    if (f === 'inactivos') return this.store.eventosInactivos();
    if (f === 'todos') return [...this.store.eventos(), ...this.store.eventosInactivos()];
    return this.store.eventos();
  });

  private readonly ordenados = computed(() =>
    [...this.lista()].sort(
      (a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora),
    ),
  );

  readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const f = this.estadoFiltro();
    return this.ordenados().filter(
      (e) =>
        (f === 'todos' || f === 'inactivos' || e.estado === f) &&
        (!q ||
          e.nombre.toLowerCase().includes(q) ||
          e.lugar.toLowerCase().includes(q) ||
          e.descripcion.toLowerCase().includes(q)),
    );
  });

  readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtrados().slice(start, start + this.pageSize);
  });

  /** true cuando la página actual tiene exactamente pageSize filas.
   *  Página llena → la card usa flex:1 y llena el alto disponible.
   *  Página parcial → la card mide lo justo (altura natural).
   */
  readonly isFullPage = computed(() => this.paged().length >= this.pageSize);

  readonly rangeLabel = computed(() => {
    const total = this.filtrados().length;
    if (total === 0) return '0 resultados';
    const from = (this.page() - 1) * this.pageSize + 1;
    const to = Math.min(this.page() * this.pageSize, total);
    return `${from}–${to} de ${total}`;
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
    const inactivos = this.store.eventosInactivos();
    return {
      total: eventos.length + inactivos.length,
      activos: eventos.filter((e) => e.estado === 'ACTIVO').length,
      cerrados: eventos.filter((e) => e.estado === 'CERRADO').length,
      inactivos: inactivos.length,
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
    if (key === 'todos') return this.store.eventos().length + this.store.eventosInactivos().length;
    if (key === 'inactivos') return this.store.eventosInactivos().length;
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
    if (evento.estado === 'CERRADO' || evento.estado === 'CANCELADO') return null;
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
    this.page.set(1);
  }

  onEstadoChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as EstadoFiltro;
    this.estadoFiltro.set(value);
    this.page.set(1);
  }

  rowIndex(localIndex: number): string {
    return String((this.page() - 1) * this.pageSize + localIndex + 1).padStart(2, '0');
  }

  openCreate(): void {
    this.editingId.set(null);
    this.estadoOriginal.set(null);
    this.form.set(emptyForm());
    this.errores.set({});
    this.modalOpen.set(true);
  }

  openEdit(evento: Evento): void {
    this.editingId.set(evento.id);
    this.estadoOriginal.set(evento.estado);
    const { id: _id, ...rest } = evento;
    // El backend serializa la hora con segundos ("HH:mm:ss"); el input time espera "HH:mm".
    const hora = rest.hora ?? '';
    this.form.set({ ...rest, hora: /^\d{2}:\d{2}$/.test(hora) ? hora : hora.slice(0, 5) });
    this.errores.set({});
    this.modalOpen.set(true);
  }

  patch(partial: Partial<Omit<Evento, 'id'>>): void {
    this.form.update((f) => ({ ...f, ...partial }));
    this.errores.update((e) => {
      const clave = Object.keys(partial)[0];
      if (!clave) return e;
      const nuevo = { ...e };
      delete nuevo[clave];
      return nuevo;
    });
  }

  private validar(): boolean {
    const d = this.form();
    const e: Record<string, string> = {};

    if (!d.nombre.trim()) {
      e['nombre'] = 'El nombre es obligatorio.';
    } else if (d.nombre.trim().length < 2) {
      e['nombre'] = 'El nombre debe tener al menos 2 caracteres.';
    }

    if (!d.fecha) {
      e['fecha'] = 'La fecha es obligatoria.';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) {
      e['fecha'] = 'Formato de fecha no válido.';
    }

    if (!d.hora) {
      e['hora'] = 'La hora es obligatoria.';
    } else if (!/^\d{2}:\d{2}$/.test(d.hora)) {
      e['hora'] = 'Formato de hora no válido (HH:mm).';
    }

    if (!d.lugar.trim()) {
      e['lugar'] = 'El lugar es obligatorio.';
    } else if (d.lugar.trim().length < 2) {
      e['lugar'] = 'El lugar debe tener al menos 2 caracteres.';
    }

    this.errores.set(e);
    return Object.keys(e).length === 0;
  }

  async save(): Promise<void> {
    if (!this.validar()) {
      this.toast.warning('Revisa los campos marcados en el formulario');
      return;
    }
    const data = this.form();
    const { createdAt: _c, ...payload } = data;
    const id = this.editingId();
    try {
      if (id) {
        await this.store.updateEvento(id, payload);
        if (this.estadoOriginal() !== this.form().estado) {
          await this.store.cambiarEstadoEvento(id, this.form().estado);
        }
        this.toast.success('Evento actualizado');
      } else {
        await this.store.addEvento(payload);
        this.toast.success('Evento creado');
      }
      this.modalOpen.set(false);
    } catch (err) {
      this.toast.error('No se pudo guardar', (err as Error).message);
    }
  }

  async remove(evento: Evento): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Eliminar evento',
      description: `«${evento.nombre}» pasará al archivo inactivo y podrá restaurarse después. ¿Continuar?`,
      confirmLabel: 'Desactivar',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await this.store.removeEvento(evento.id);
      this.toast.success('Evento desactivado');
    } catch (err) {
      this.toast.error('No se pudo eliminar', (err as Error).message);
    }
  }

  async restore(evento: Evento): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Restaurar evento',
      description: `¿Reactivar «${evento.nombre}» para que vuelva al calendario?`,
      confirmLabel: 'Restaurar',
    });
    if (!ok) return;
    try {
      await this.store.restaurarEvento(evento.id);
      this.toast.success('Evento restaurado');
    } catch (err) {
      this.toast.error('No se pudo restaurar', (err as Error).message);
    }
  }

  async removeFisico(evento: Evento): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Eliminar definitivamente',
      description:
        `«${evento.nombre}» se borrará permanentemente. Solo es posible si no tiene inscripciones asociadas. ` +
        `Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar para siempre',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await this.store.eliminarFisicoEvento(evento.id);
      this.toast.success('Evento eliminado definitivamente');
    } catch (err) {
      this.toast.error('No se pudo eliminar', (err as Error).message);
    }
  }
}
