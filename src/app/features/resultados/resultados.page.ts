import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Resultado } from '../../core/models';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/ui/button.component';
import { CardComponent } from '../../shared/ui/card.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { InputComponent } from '../../shared/ui/input.component';
import { ModalComponent } from '../../shared/ui/modal.component';

@Component({
  selector: 'app-resultados-page',
  imports: [
    FormsModule,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    InputComponent,
    ModalComponent,
  ],
  styleUrl: './resultados.page.css',
  templateUrl: './resultados.page.html',
})
export class ResultadosPage {
  readonly store = inject(DataStoreService);
  private readonly toast = inject(ToastService);

  readonly eventoId = signal(this.store.eventos()[0]?.id ?? '');
  readonly modalOpen = signal(false);
  readonly form = signal({
    inscripcionId: '',
    puesto: 1,
    puntaje: 0,
    observaciones: '',
  });

  readonly inscripcionesDelEvento = computed(() =>
    this.store.inscripcionesView().filter((i) => i.eventoId === this.eventoId()),
  );

  readonly filtered = computed(() =>
    this.store
      .resultadosView()
      .filter((r) => r.eventoId === this.eventoId())
      .sort((a, b) => a.puesto - b.puesto),
  );

  patch(partial: Partial<ReturnType<ResultadosPage['form']>>): void {
    this.form.update((f) => ({ ...f, ...partial }));
  }

  openCreate(): void {
    this.form.set({
      inscripcionId: this.inscripcionesDelEvento()[0]?.id ?? '',
      puesto: 1,
      puntaje: 0,
      observaciones: '',
    });
    this.modalOpen.set(true);
  }

  save(): void {
    const data = this.form();
    if (!data.inscripcionId || data.puntaje <= 0) {
      this.toast.warning('Seleccione una inscripción y un puntaje válido');
      return;
    }
    const resultado: Resultado = {
      id: crypto.randomUUID(),
      inscripcionId: data.inscripcionId,
      puesto: data.puesto,
      puntaje: data.puntaje,
      observaciones: data.observaciones,
      activo: true,
      createdAt: new Date().toISOString(),
    };
    this.store.addResultado(resultado);
    this.modalOpen.set(false);
    this.form.set({
      inscripcionId: '',
      puesto: 1,
      puntaje: 0,
      observaciones: '',
    });
    this.toast.success('Resultado registrado');
  }
}
