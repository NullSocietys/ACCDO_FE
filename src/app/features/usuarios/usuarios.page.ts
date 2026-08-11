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
import { LoadMoreComponent } from '../../shared/ui/load-more.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

const emptyForm = () => ({
  nombre: '',
  correo: '',
  password: '',
});

const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

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
    LoadMoreComponent,
    ModalComponent,
    SkeletonComponent,
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
  readonly errores = signal<Record<string, string>>({});
  readonly pageSize = PAGE_SIZE;
  /** Carga fluida: cuántos usuarios se muestran hasta el momento. */
  readonly visible = signal(PAGE_SIZE);
  /** Esqueleto de carga inicial (igual que el dashboard). */
  readonly cargando = signal(true);

  constructor() {
    window.setTimeout(() => this.cargando.set(false), 500);
  }

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

  readonly paginado = computed(() => this.filtrados().slice(0, this.visible()));

  readonly hasMore = computed(() => this.visible() < this.filtrados().length);

  readonly remaining = computed(() => Math.max(0, this.filtrados().length - this.visible()));

  loadMore(): void {
    this.visible.update((v) => Math.min(v + PAGE_SIZE, this.filtrados().length));
  }

  readonly overview = computed(() => ({
    total: this.store.usuarios().length,
    activos: this.store.usuarios().length,
    inactivos: this.store.usuariosInactivos().length,
  }));

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.visible.set(PAGE_SIZE);
  }

  rowIndex(localIndex: number): string {
    return String(localIndex + 1).padStart(2, '0');
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
    this.errores.set({});
    this.modalOpen.set(true);
  }

  async openEdit(usuario: Usuario): Promise<void> {
    this.editingId.set(usuario.id);
    this.errores.set({});
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
    this.errores.update((e) => {
      const clave = Object.keys(partial)[0];
      if (!clave) return e;
      const nuevo = { ...e };
      delete nuevo[clave];
      return nuevo;
    });
  }

  /** Solo letras (incl. tildes, ñ), espacios y apóstrofo — nada de números ni símbolos. */
  soloLetras(v: string): string {
    return v.replace(/[^\p{L}\s']/gu, '');
  }

  private readonly MAYUS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  private readonly MINUS = 'abcdefghijkmnopqrstuvwxyz';
  private readonly NUM = '23456789';
  private readonly SIMB = '!@#$%&*_-+=?';

  private aleatorio(pool: string): string {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return pool[arr[0] % pool.length];
  }

  generarPassword(longitud = 14): void {
    const todas = this.MAYUS + this.MINUS + this.NUM + this.SIMB;
    const chars: string[] = [
      this.aleatorio(this.MAYUS),
      this.aleatorio(this.MINUS),
      this.aleatorio(this.NUM),
      this.aleatorio(this.SIMB),
    ];
    const resto = longitud - chars.length;
    for (let i = 0; i < resto; i++) {
      chars.push(this.aleatorio(todas));
    }
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    this.patch({ password: chars.join('') });
  }

  private validar(): boolean {
    const d = this.form();
    const e: Record<string, string> = {};

    if (!d.nombre.trim()) {
      e['nombre'] = 'El nombre es obligatorio.';
    } else if (d.nombre.trim().length < 2) {
      e['nombre'] = 'El nombre debe tener al menos 2 caracteres.';
    } else if (/\d/.test(d.nombre)) {
      e['nombre'] = 'El nombre no puede contener números.';
    }

    if (!d.correo.trim()) {
      e['correo'] = 'El correo es obligatorio.';
    } else if (!/^\S+@\S+\.\S+$/.test(d.correo.trim())) {
      e['correo'] = 'Ingrese un correo válido.';
    }

    if (!this.editingId()) {
      if (!d.password) {
        e['password'] = 'La contraseña es obligatoria.';
      } else if (d.password.length < 8) {
        e['password'] = 'La contraseña debe tener al menos 8 caracteres.';
      } else if (!PWD_REGEX.test(d.password)) {
        e['password'] = 'Debe incluir mayúscula, minúscula y número.';
      }
    } else if (d.password && d.password.length < 8) {
      e['password'] = 'La nueva contraseña debe tener al menos 8 caracteres.';
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