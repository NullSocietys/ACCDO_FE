import { Component, computed, effect, inject, signal } from '@angular/core';
import { Configuracion } from '../../core/models';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { CardComponent } from '../../shared/ui/card.component';
import { InputComponent } from '../../shared/ui/input.component';

@Component({
  selector: 'app-configuracion-page',
  imports: [IconComponent, ButtonComponent, CardComponent, InputComponent],
  styleUrl: './configuracion.page.css',
  templateUrl: './configuracion.page.html',
})
export class ConfiguracionPage {
  private readonly store = inject(DataStoreService);
  private readonly toast = inject(ToastService);

  readonly form = signal<Configuracion>({ ...this.store.configuracion() });
  readonly saving = signal(false);

  /** No hay configuración guardada en el servidor (evita mostrar datos falsos). */
  readonly sinConfig = computed(() => !this.store.configuracion().id);

  constructor() {
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
  }

  onLogo(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.patch({ logoUrl: file.name });
  }

  async save(): Promise<void> {
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
