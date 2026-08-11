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
import { LoadMoreComponent } from '../../shared/ui/load-more.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

@Component({
  selector: 'app-resultados-page',
  imports: [
    FormsModule,
    IconComponent,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    InputComponent,
    LoadMoreComponent,
    ModalComponent,
    SkeletonComponent,
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
  /** Esqueleto de carga inicial (igual que el dashboard). */
  readonly cargando = signal(true);

  constructor() {
    window.setTimeout(() => this.cargando.set(false), 500);
    // Si el catálogo aún no terminó de cargar al abrir la página,
    // adopta el primer evento en cuanto esté disponible (sin pisar la selección del usuario).
    effect(() => {
      const primero = this.store.eventos()[0];
      if (primero && !this.eventoId()) {
        this.eventoId.set(primero.id);
      }
    });

    // Al cambiar de evento, reinicia el resto de la tabla (carga fluida).
    effect(() => {
      this.eventoId();
      this.restoVisible.set(this.pageSize);
    });
  }

  readonly form = signal({
    inscripcionId: '',
    puesto: 1,
    puntaje: 0,
    observaciones: '',
  });

  readonly errores = signal<Record<string, string>>({});

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

  /** Resto de la tabla: todo desde el 4.º puesto, con carga fluida (de a 3: 4.º–6.º, luego 7.º–9.º, …). */
  readonly pageSize = 3;
  /** Carga fluida: cuántos puestos del resto se muestran hasta el momento. */
  readonly restoVisible = signal(this.pageSize);

  readonly resto = computed(() => this.filtered().slice(3));

  readonly pagedResto = computed(() => this.resto().slice(0, this.restoVisible()));

  readonly restoHasMore = computed(() => this.restoVisible() < this.resto().length);

  readonly restoRemaining = computed(() => Math.max(0, this.resto().length - this.restoVisible()));

  loadMoreResto(): void {
    this.restoVisible.update((v) => Math.min(v + this.pageSize, this.resto().length));
  }

  /** Rango en puestos absolutos (4–6 al inicio, 4–9 tras cargar más, …). */
  readonly restoRangeLabel = computed(() => {
    const total = this.resto().length;
    if (total === 0) return '';
    const to = Math.min(3 + this.restoVisible(), 3 + total);
    return `4–${to} de ${3 + total}`;
  });

  patch(partial: Partial<ReturnType<ResultadosPage['form']>>): void {
    this.form.update((f) => ({ ...f, ...partial }));
    this.errores.update((e) => {
      const clave = Object.keys(partial)[0];
      if (!clave) return e;
      const nuevo = { ...e };
      delete nuevo[clave];
      return nuevo;
    });
  }

  openCreate(): void {
    this.form.set({
      inscripcionId: this.inscripcionesDelEvento()[0]?.id ?? '',
      puesto: 1,
      puntaje: 0,
      observaciones: '',
    });
    this.errores.set({});
    this.modalOpen.set(true);
  }

  private validar(): boolean {
    const d = this.form();
    const e: Record<string, string> = {};

    if (!d.inscripcionId) {
      e['inscripcionId'] = 'Selecciona una inscripción.';
    }
    if (d.puesto < 1) {
      e['puesto'] = 'El puesto debe ser al menos 1.';
    }
    if (d.puntaje <= 0) {
      e['puntaje'] = 'El puntaje debe ser mayor a 0.';
    } else if (d.puntaje > 25) {
      e['puntaje'] = 'El puntaje máximo es 25.';
    }
    if (d.observaciones.length > 500) {
      e['observaciones'] = 'Máximo 500 caracteres.';
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
