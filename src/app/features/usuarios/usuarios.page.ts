import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Usuario } from '../../core/models';
import { environment } from '../../../environments/environment';
import { ConfirmService } from '../../core/services/confirm.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { BadgeComponent } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { InputComponent } from '../../shared/ui/input.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import departamentoData from '../../core/ubigeo-json/1_ubigeo_departamentos.json';
import provinciaData from '../../core/ubigeo-json/2_ubigeo_provincias.json';
import distritoData from '../../core/ubigeo-json/3_ubigeo_distritos.json';

interface UbigeoDepartamento {
  id: number;
  departamento: string;
}

interface UbigeoProvincia {
  id: number;
  provincia: string;
  departamento_id: number;
}

interface UbigeoDistrito {
  id: number;
  distrito: string;
  provincia_id: number;
}

const ubigeoDepartamentos = (
  departamentoData as { ubigeo_departamentos: UbigeoDepartamento[] }
).ubigeo_departamentos;
const ubigeoProvincias = (
  provinciaData as { ubigeo_provincias: UbigeoProvincia[] }
).ubigeo_provincias;
const ubigeoDistritos = (
  distritoData as { ubigeo_distritos: UbigeoDistrito[] }
).ubigeo_distritos;

const emptyForm = () => ({
  nombre: '',
  correo: '',
  password: '',
  rol: 'CLIENTE',
  dni: '',
  telefono: '',
  departamento: '',
  provincia: '',
  distrito: '',
});

const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

type EstadoFiltro = 'activos' | 'inactivos';

const PAGE_SIZE = 6;

@Component({
  selector: 'app-usuarios-page',
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
  styleUrl: './usuarios.page.css',
  templateUrl: './usuarios.page.html',
})
export class UsuariosPage {
  readonly store = inject(DataStoreService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly http = inject(HttpClient);

  readonly busqueda = signal('');
  readonly estadoFiltro = signal<EstadoFiltro>('activos');
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
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

  readonly overview = computed(() => ({
    total: this.store.usuarios().length + this.store.usuariosInactivos().length,
    activos: this.store.usuarios().length,
    inactivos: this.store.usuariosInactivos().length,
  }));

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.page.set(1);
  }

  /* ============================================================
     UBIGEO EN CASCADA (departamento -> provincia -> distrito)
     ============================================================ */

  readonly departamentos: string[] = ubigeoDepartamentos.map((d) => d.departamento);

  readonly provincias = computed(() => {
    const dep = ubigeoDepartamentos.find((d) => d.departamento === this.form().departamento);
    if (!dep) return [];
    return ubigeoProvincias
      .filter((p) => p.departamento_id === dep.id)
      .map((p) => p.provincia);
  });

  readonly distritos = computed(() => {
    const dep = ubigeoDepartamentos.find((d) => d.departamento === this.form().departamento);
    const prov = ubigeoProvincias.find(
      (p) => p.provincia === this.form().provincia && (!dep || p.departamento_id === dep.id),
    );
    if (!prov) return [];
    return ubigeoDistritos
      .filter((d) => d.provincia_id === prov.id)
      .map((d) => d.distrito);
  });

  onDepartamento(dep: string): void {
    this.patch({ departamento: dep, provincia: '', distrito: '' });
  }

  onProvincia(prov: string): void {
    this.patch({ provincia: prov, distrito: '' });
  }

  /** Solo dígitos para DNI/celular. */
  soloDigitos(v: string, max = 9): string {
    return v.replace(/\D/g, '').slice(0, max);
  }

  onPageChange(next: number): void {
    this.page.set(next);
    const folio = document.querySelector('.folio');
    if (!folio) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    folio.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  rowIndex(localIndex: number): string {
    return String((this.page() - 1) * this.pageSize + localIndex + 1).padStart(2, '0');
  }

  iniciales(usuario: Usuario): string {
    return usuario.nombre
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  esAdmin(usuario: Usuario): boolean {
    return usuario.roles?.includes('ADMIN') ?? false;
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
    const rolActual = usuario.roles?.includes('ADMIN') ? 'ADMIN' : 'CLIENTE';
    try {
      const fresco = await this.store.obtenerUsuario(usuario.id);
      this.form.set({
        nombre: fresco.nombre,
        correo: fresco.correo,
        password: '',
        rol: fresco.roles?.includes('ADMIN') ? 'ADMIN' : rolActual,
        dni: (fresco.dni ?? '').trim(),
        telefono: (fresco.telefono ?? '').trim(),
        departamento: (fresco.departamento ?? '').trim(),
        provincia: (fresco.provincia ?? '').trim(),
        distrito: (fresco.distrito ?? '').trim(),
      });
    } catch {
      this.form.set({
        nombre: usuario.nombre,
        correo: usuario.correo,
        password: '',
        rol: rolActual,
        dni: (usuario.dni ?? '').trim(),
        telefono: (usuario.telefono ?? '').trim(),
        departamento: (usuario.departamento ?? '').trim(),
        provincia: (usuario.provincia ?? '').trim(),
        distrito: (usuario.distrito ?? '').trim(),
      });
    }
    this.modalOpen.set(true);
  }

  patch(
    partial: Partial<{
      nombre: string;
      correo: string;
      password: string;
      rol: string;
      dni: string;
      telefono: string;
      departamento: string;
      provincia: string;
      distrito: string;
    }>,
  ): void {
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

    if (d.dni && !/^\d{8}$/.test(d.dni)) {
      e['dni'] = 'El DNI debe tener 8 dígitos.';
    }

    if (d.telefono && !/^9\d{8}$/.test(d.telefono)) {
      e['telefono'] = 'El teléfono debe tener 9 dígitos y empezar con 9.';
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
    /** Contacto: el backend lo usa como responsable de sus inscripciones. */
    const contacto = {
      dni: data.dni.trim() || undefined,
      telefono: data.telefono.trim() || undefined,
      departamento: data.departamento.trim() || undefined,
      provincia: data.provincia.trim() || undefined,
      distrito: data.distrito.trim() || undefined,
    };
    try {
      if (id) {
        await this.store.actualizarUsuario(id, {
          nombre: data.nombre.trim(),
          correo: data.correo.trim(),
          password: data.password || undefined,
          ...contacto,
        });
        await this.cambiarRolSiNecesario(id, data.rol);
        this.toast.success('Usuario actualizado');
      } else {
        const creado = await this.store.registrar({
          nombre: data.nombre.trim(),
          correo: data.correo.trim(),
          password: data.password,
          // Alta administrativa: conserva el flujo existente y crea la
          // agrupación inicial; el responsable podrá verla al ingresar.
          agrupacionNombre: data.nombre.trim(),
          ...contacto,
        });
        await this.cambiarRolSiNecesario(creado.id, data.rol);
        this.toast.success('Usuario creado');
      }
      this.modalOpen.set(false);
    } catch (err) {
      this.toast.error('No se pudo guardar', (err as Error).message);
    }
  }

  /** Aplica el rol elegido solo si difiere del actual (los clientes nacen con CLIENTE). */
  private async cambiarRolSiNecesario(id: string, rol: string): Promise<void> {
    if (!rol || rol === 'CLIENTE') return;
    await firstValueFrom(
      this.http.patch(`${environment.apiUrl}/api/usuarios/${id}/rol`, { rol }),
    );
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
      description:
        `«${usuario.nombre}» se borrará permanentemente junto con sus inscripciones ` +
        `y su agrupación. El nombre del grupo quedará libre para que su encargado real se registre. ` +
        `Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar para siempre',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await this.store.eliminarFisicoUsuario(usuario.id, this.estadoFiltro() === 'inactivos');
      this.toast.success('Usuario eliminado definitivamente');
    } catch (err) {
      this.toast.error('No se pudo eliminar', (err as Error).message);
    }
  }
}
