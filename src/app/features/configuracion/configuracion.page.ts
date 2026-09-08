import { Component, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Configuracion } from '../../core/models';
import { environment } from '../../../environments/environment';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { CardComponent } from '../../shared/ui/card.component';
import { InputComponent } from '../../shared/ui/input.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

@Component({
  selector: 'app-configuracion-page',
  imports: [IconComponent, ButtonComponent, CardComponent, InputComponent, SkeletonComponent],
  styleUrl: './configuracion.page.css',
  templateUrl: './configuracion.page.html',
})
export class ConfiguracionPage {
  private readonly store = inject(DataStoreService);
  private readonly toast = inject(ToastService);
  private readonly http = inject(HttpClient);

  readonly form = signal<Configuracion>({ ...this.store.configuracion() });
  readonly saving = signal(false);
  readonly subiendoLogo = signal(false);
  readonly errores = signal<Record<string, string>>({});
  /** Esqueleto de carga inicial (igual que el dashboard). */
  readonly cargando = signal(true);

  /** No hay configuración guardada en el servidor (evita mostrar datos falsos). */
  readonly sinConfig = computed(() => !this.store.configuracion().id);

  constructor() {
    window.setTimeout(() => this.cargando.set(false), 500);
    // Sincroniza el formulario cuando llega la configuración real del backend.
    effect(() => {
      const c = this.store.configuracion();
      if (c.id && !this.form().id) {
        this.form.set({ ...c });
      }
    });
  }

  patch(partial: Partial<Configuracion>): void {
    this.form.update((f) => ({ ...f, ...partial }));
    this.errores.update((e) => {
      const clave = Object.keys(partial)[0] as keyof Configuracion;
      if (!clave) return e;
      const nuevo = { ...e };
      delete nuevo[clave];
      return nuevo;
    });
  }

  async onLogo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.subiendoLogo.set(true);
    try {
      const form = new FormData();
      form.append('archivo', file, file.name);
      const res = await firstValueFrom(
        this.http.post<{ url: string }>(`${environment.apiUrl}/api/configuracion/logo`, form),
      );
      this.patch({ logoUrl: res.url });
      this.toast.success('Logo subido', 'Recuerda guardar para aplicar los cambios');
    } catch (err) {
      this.toast.error('No se pudo subir el logo', (err as Error).message);
    } finally {
      this.subiendoLogo.set(false);
      input.value = '';
    }
  }

  private validar(): boolean {
    const d = this.form();
    const e: Record<string, string> = {};

    if (!d.nombreAsociacion?.trim()) {
      e['nombreAsociacion'] = 'El nombre de la asociación es obligatorio.';
    } else if (d.nombreAsociacion.trim().length > 150) {
      e['nombreAsociacion'] = 'Máximo 150 caracteres.';
    }

    if (d.telefono && !/^\d{6,20}$/.test(d.telefono.trim())) {
      e['telefono'] = 'Solo dígitos (6 a 20).';
    }
    if (d.correo && !/^\S+@\S+\.\S+$/.test(d.correo.trim())) {
      e['correo'] = 'Correo no válido.';
    }
    if (d.direccion && d.direccion.trim() && d.direccion.trim().length > 200) {
      e['direccion'] = 'Máximo 200 caracteres.';
    }
    if (d.cuentaBancaria && d.cuentaBancaria.trim() && d.cuentaBancaria.trim().length > 100) {
      e['cuentaBancaria'] = 'Máximo 100 caracteres.';
    }
    if (d.numeroYape && !/^\d{9}$/.test(d.numeroYape.trim())) {
      e['numeroYape'] = 'Debe ser un número de 9 dígitos.';
    }
    if (d.numeroPlin && !/^\d{9}$/.test(d.numeroPlin.trim())) {
      e['numeroPlin'] = 'Debe ser un número de 9 dígitos.';
    }
    if (d.coordinadoraGeneral && d.coordinadoraGeneral.trim() && d.coordinadoraGeneral.trim().length > 100) {
      e['coordinadoraGeneral'] = 'Máximo 100 caracteres.';
    }
    if (d.fechaLimiteInscripcion && !/^\d{4}-\d{2}-\d{2}$/.test(d.fechaLimiteInscripcion)) {
      e['fechaLimiteInscripcion'] = 'Formato de fecha no válido.';
    }
    if (d.fechaSorteo && !/^\d{4}-\d{2}-\d{2}$/.test(d.fechaSorteo)) {
      e['fechaSorteo'] = 'Formato de fecha no válido.';
    }
    if (d.horaSorteo && !/^\d{2}:\d{2}$/.test(d.horaSorteo)) {
      e['horaSorteo'] = 'Formato de hora no válido (HH:mm).';
    }
    if (d.horaInicioConcurso && !/^\d{2}:\d{2}$/.test(d.horaInicioConcurso)) {
      e['horaInicioConcurso'] = 'Formato de hora no válido (HH:mm).';
    }
    if (d.mensajeConfirmacion && d.mensajeConfirmacion.length > 1000) {
      e['mensajeConfirmacion'] = 'Máximo 1000 caracteres.';
    }

    this.errores.set(e);
    return Object.keys(e).length === 0;
  }

  async save(): Promise<void> {
    if (!this.validar()) {
      this.toast.warning('Revisa los campos marcados en el formulario');
      return;
    }
    this.saving.set(true);
    try {
      await this.store.saveConfig(this.form());
      this.toast.success('Configuración guardada');
    } catch (err) {
      this.toast.error('No se pudo guardar', (err as Error).message);
    } finally {
      this.saving.set(false);
    }
  }
}
