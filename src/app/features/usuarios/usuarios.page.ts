import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Usuario } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { BadgeComponent } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { InputComponent } from '../../shared/ui/input.component';
import { ModalComponent } from '../../shared/ui/modal.component';

const emptyForm = () => ({
  nombre: '',
  correo: '',
  password: '',
});

type EstadoFiltro = 'activos' | 'inactivos';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-usuarios-page',
  imports: [
    FormsModule,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    InputComponent,
    ModalComponent,
  ],
  styleUrl: './usuarios.page.css',
  templateUrl: './usuarios.page.html',
})
export class UsuariosPage {
  readonly store = inject(DataStoreService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly busqueda = signal('');
  readonly estadoFiltro = signal<EstadoFiltro>('activos');
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly form = signal(emptyForm());
  readonly paginaActual = signal(1);
  readonly pageSize = PAGE_SIZE;

  readonly filtros: { key: EstadoFiltro; label: string }[] = [
    { key: 'activos', label: 'Activos' },
    { key: 'inactivos', label: 'Inactivos' },
  ];

  readonly lista = computed(() =>
    this.estadoFiltro() === 'activos'
      ? this.store.usuarios()
      : this.store.usuariosInactivos(),
  );

  readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return this.lista().filter(
      (u) =>
        !q ||
        u.nombre.toLowerCase().includes(q) ||
        u.correo.toLowerCase().includes(q),
    );
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.filtrados().length / PAGE_SIZE)),
  );

  readonly paginado = computed(() => {
    const page = Math.min(this.paginaActual(), this.totalPaginas());
    const start = (page - 1) * PAGE_SIZE;
    return this.filtrados().slice(start, start + PAGE_SIZE);
  });

  readonly paginas = computed(() =>
    Array.from({ length: this.totalPaginas() }, (_, i) => i + 1),
  );

  readonly overview = computed(() => ({
    total: this.store.usuarios().length,
    activos: this.store.usuarios().length,
    inactivos: this.store.usuariosInactivos().length,
  }));

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.paginaActual.set(1);
  }

  irAPagina(p: number): void {
    const clamped = Math.max(1, Math.min(p, this.totalPaginas()));
    this.paginaActual.set(clamped);
  }

  rowIndex(localIndex: number): string {
    const global = (this.paginaActual() - 1) * PAGE_SIZE + localIndex + 1;
    return String(global).padStart(2, '0');
  }

  iniciales(usuario: Usuario): string {
    return usuario.nombre
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  fechaCorta(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.set(emptyForm());
    this.modalOpen.set(true);
  }

  async openEdit(usuario: Usuario): Promise<void> {
    this.editingId.set(usuario.id);
    try {
      const fresco = await this.store.obtenerUsuario(usuario.id);
      this.form.set({ nombre: fresco.nombre, correo: fresco.correo, password: '' });
    } catch {
      this.form.set({ nombre: usuario.nombre, correo: usuario.correo, password: '' });
    }
    this.modalOpen.set(true);
  }

  patch(partial: Partial<{ nombre: string; correo: string; password: string }>): void {
    this.form.update((f) => ({ ...f, ...partial }));
  }

  async save(): Promise<void> {
    const data = this.form();
    if (!data.nombre.trim() || !data.correo.trim()) {
      this.toast.warning('Complete los campos obligatorios');
      return;
    }
    if (data.correo && !/^\S+@\S+\.\S+$/.test(data.correo)) {
      this.toast.warning('Ingrese un correo válido');
      return;
    }
    const id = this.editingId();
    try {
      if (id) {
        await this.store.actualizarUsuario(id, {
          nombre: data.nombre.trim(),
          correo: data.correo.trim(),
          password: data.password || undefined,
        });
        this.toast.success('Usuario actualizado');
      } else {
        if (!data.password) {
          this.toast.warning('La contraseña es obligatoria');
          return;
        }
        await this.store.registrar({
          nombre: data.nombre.trim(),
          correo: data.correo.trim(),
          password: data.password,
        });
        this.toast.success('Usuario creado');
      }
      this.modalOpen.set(false);
    } catch (err) {
      this.toast.error('No se pudo guardar', (err as Error).message);
    }
  }

  async remove(usuario: Usuario): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Eliminar usuario',
      description: `«${usuario.nombre}» quedará inactivo y podrá restaurarse después. ¿Continuar?`,
      confirmLabel: 'Desactivar',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await this.store.eliminarLogicoUsuario(usuario.id);
      this.toast.success('Usuario desactivado');
    } catch (err) {
      this.toast.error('No se pudo eliminar', (err as Error).message);
    }
  }

  async restore(usuario: Usuario): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Restaurar usuario',
      description: `¿Reactivar la cuenta de «${usuario.nombre}»?`,
      confirmLabel: 'Restaurar',
    });
    if (!ok) return;
    try {
      await this.store.restaurarUsuario(usuario.id);
      this.toast.success('Usuario restaurado');
    } catch (err) {
      this.toast.error('No se pudo restaurar', (err as Error).message);
    }
  }

  async removeFisico(usuario: Usuario): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Eliminar definitivamente',
      description: `«${usuario.nombre}» se borrará de forma permanente. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar para siempre',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await this.store.eliminarFisicoUsuario(usuario.id, true);
      this.toast.success('Usuario eliminado definitivamente');
    } catch (err) {
      this.toast.error('No se pudo eliminar', (err as Error).message);
    }
  }
}