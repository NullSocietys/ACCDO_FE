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
import { ComboBuscadorComponent } from '../../shared/ui/combo-buscador/combo-buscador.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
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
    ComboBuscadorComponent,
    ModalComponent,
    PaginationComponent,
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

    // Al cambiar de evento, reinicia la paginación del resto.
    effect(() => {
      this.eventoId();
      this.restoPage.set(1);
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

  /** Labels legibles para el combo con buscador. */
  readonly inscripcionLabels = computed(() =>
    this.inscripcionesDelEvento().map(
      (i) => `${i.nombreGrupo} · ${i.categoriaNombre} (${i.codigo})`,
    ),
  );

  readonly inscripcionLabelSeleccionada = computed(() => {
    const id = this.form().inscripcionId;
    const ins = this.inscripcionesDelEvento().find((i) => i.id === id);
    return ins ? `${ins.nombreGrupo} · ${ins.categoriaNombre} (${ins.codigo})` : '';
  });

  onInscripcionLabel(label: string): void {
    const ins = this.inscripcionesDelEvento().find(
      (i) => `${i.nombreGrupo} · ${i.categoriaNombre} (${i.codigo})` === label,
    );
    if (ins) this.patch({ inscripcionId: ins.id });
  }

  readonly filtered = computed(() =>
    this.store
      .resultadosView()
      .filter((r) => r.eventoId === this.eventoId())
      .sort((a, b) => a.puesto - b.puesto),
  );

  /** Podio: campeón (1.º), segundo y tercer lugar. */
  readonly podio = computed(() => this.filtered().slice(0, 3));

  /** Resto de la tabla: desde el 4.º puesto, paginado. */
  readonly pageSize = 5;
  readonly restoPage = signal(1);

  readonly resto = computed(() => this.filtered().slice(3));

  readonly pagedResto = computed(() => {
    const start = (this.restoPage() - 1) * this.pageSize;
    return this.resto().slice(start, start + this.pageSize);
  });

  /** Rango en puestos absolutos (p. ej. 4–8 de 12). */
  readonly restoRangeLabel = computed(() => {
    const total = this.resto().length;
    if (total === 0) return '';
    const from = 3 + (this.restoPage() - 1) * this.pageSize + 1;
    const to = Math.min(3 + this.restoPage() * this.pageSize, 3 + total);
    return `${from}–${to} de ${3 + total}`;
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
