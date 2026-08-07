import { Component, inject, signal } from '@angular/core';
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

  patch(partial: Partial<Configuracion>): void {
    this.form.update((f) => ({ ...f, ...partial }));
  }

  onLogo(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.patch({ logoUrl: file.name });
  }

  save(): void {
    this.saving.set(true);
    window.setTimeout(() => {
      this.store.saveConfig(this.form());
      this.saving.set(false);
      this.toast.success('Configuración guardada');
    }, 500);
  }
}
