import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Resultado } from '../../core/models';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { CardComponent } from '../../shared/ui/card.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { InputComponent } from '../../shared/ui/input.component';
import { ModalComponent } from '../../shared/ui/modal.component';

@Component({
  selector: 'app-resultados-page',
  imports: [
    FormsModule,
    IconComponent,
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

  readonly mast = computed(() => {
    const res = this.store.resultadosView();
    const maxPuntaje = res.reduce((max, r) => Math.max(max, r.puntaje), 0);
    const eventos = new Set(res.map((r) => r.eventoId)).size;
    return { total: res.length, maxPuntaje, eventos };
  });

  readonly eventoId = signal('');
  readonly modalOpen = signal(false);

  constructor() {
    // Si el catálogo aún no terminó de cargar al abrir la página,
    // adopta el primer evento en cuanto esté disponible (sin pisar la selección del usuario).
    effect(() => {
      const primero = this.store.eventos()[0];
      if (primero && !this.eventoId()) {
        this.eventoId.set(primero.id);
      }
    });

    // Al cambiar de evento, vuelve a la primera página del resto de la tabla.
    effect(() => {
      this.eventoId();
      this.page.set(1);
    });
  }

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

  /** Podio: campeón (1.º), segundo y tercer lugar. */
  readonly podio = computed(() => this.filtered().slice(0, 3));

  /** Resto de la tabla: todo desde el 4.º puesto, paginado de a 3 (4.º–6.º, 7.º–9.º, …). */
  readonly page = signal(1);
  readonly pageSize = 3;

  readonly resto = computed(() => this.filtered().slice(3));

  readonly restoTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.resto().length / this.pageSize)),
  );

  readonly pagedResto = computed(() => {
    const list = this.resto();
    const p = Math.min(Math.max(1, this.page()), this.restoTotalPages());
    const start = (p - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  readonly restoPageNumbers = computed(() => {
    const total = this.restoTotalPages();
    const current = Math.min(this.page(), total);
    const window = 5;
    let start = Math.max(1, current - Math.floor(window / 2));
    const end = Math.min(total, start + window - 1);
    start = Math.max(1, end - window + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  /** Rango en puestos absolutos (4–6 en la página 1, 7–9 en la 2, …). */
  readonly restoRangeLabel = computed(() => {
    const total = this.resto().length;
    if (total === 0) return '';
    const p = Math.min(this.page(), this.restoTotalPages());
    const from = 3 + (p - 1) * this.pageSize + 1;
    const to = Math.min(3 + p * this.pageSize, 3 + total);
    return `${from}–${to} de ${3 + total}`;
  });

  goToRestoPage(page: number): void {
    const next = Math.min(Math.max(1, page), this.restoTotalPages());
    this.page.set(next);
  }

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

  async save(): Promise<void> {
    const data = this.form();
    if (!data.inscripcionId || data.puntaje <= 0) {
      this.toast.warning('Seleccione una inscripción y un puntaje válido');
      return;
    }
    try {
      await this.store.addResultado({
        inscripcionId: data.inscripcionId,
        puesto: data.puesto,
        puntaje: data.puntaje,
        observaciones: data.observaciones || undefined,
      });
      this.modalOpen.set(false);
      this.form.set({
        inscripcionId: '',
        puesto: 1,
        puntaje: 0,
        observaciones: '',
      });
      this.toast.success('Resultado registrado');
    } catch (err) {
      this.toast.error('No se pudo registrar', (err as Error).message);
    }
  }
}
