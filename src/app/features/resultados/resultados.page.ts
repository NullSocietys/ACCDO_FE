import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CATEGORIAS, CRITERIOS_CALIFICACION } from '../../core/data/mock-data';
import { Modalidad, Resultado } from '../../core/models';
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

  readonly modalidades = CATEGORIAS;
  readonly criterios = CRITERIOS_CALIFICACION;
  readonly eventoId = signal(this.store.eventos()[0]?.id ?? '');
  readonly modalOpen = signal(false);
  readonly form = signal({
    grupo: '',
    categoria: 'Ballet (Libre)' as Modalidad,
    presentacion: 0,
    coreografia: 0,
    armonia: 0,
    mensaje: 0,
    expresion: 0,
    puesto: 1,
    observaciones: '',
  });

  readonly puntajeTotal = computed(() => {
    const f = this.form();
    return f.presentacion + f.coreografia + f.armonia + f.mensaje + f.expresion;
  });

  readonly filtered = computed(() =>
    this.store
      .resultados()
      .filter((r) => r.eventoId === this.eventoId())
      .sort((a, b) => a.puesto - b.puesto),
  );

  patch(partial: Partial<ReturnType<ResultadosPage['form']>>): void {
    this.form.update((f) => ({ ...f, ...partial }));
  }

  patchCriterio(
    clave: 'presentacion' | 'coreografia' | 'armonia' | 'mensaje' | 'expresion',
    raw: string,
  ): void {
    const n = Math.min(5, Math.max(0, Math.round(Number(raw) || 0)));
    this.patch({ [clave]: n });
  }

  save(): void {
    const data = this.form();
    const puntaje = this.puntajeTotal();
    if (!data.grupo || puntaje <= 0) {
      this.toast.warning('Complete el grupo y los criterios de calificación');
      return;
    }
    const resultado: Resultado = {
      id: crypto.randomUUID(),
      eventoId: this.eventoId(),
      grupo: data.grupo,
      categoria: data.categoria,
      presentacion: data.presentacion,
      coreografia: data.coreografia,
      armonia: data.armonia,
      mensaje: data.mensaje,
      expresion: data.expresion,
      puntaje,
      puesto: data.puesto,
      observaciones: data.observaciones,
    };
    this.store.addResultado(resultado);
    this.modalOpen.set(false);
    this.form.set({
      grupo: '',
      categoria: 'Ballet (Libre)',
      presentacion: 0,
      coreografia: 0,
      armonia: 0,
      mensaje: 0,
      expresion: 0,
      puesto: 1,
      observaciones: '',
    });
    this.toast.success('Resultado registrado');
  }
}
