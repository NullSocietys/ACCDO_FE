import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CATEGORIAS } from '../../core/data/mock-data';
import { DataStoreService } from '../../core/services/data-store.service';
import { BadgeComponent, statusLabel, statusTone } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { IconComponent } from '../../shared/icons/icon.component';
import { InputComponent } from '../../shared/ui/input.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

interface BailarinRow {
  id: string;
  nombre: string;
  celular: string;
  responsable: string;
  agrupacion: string;
  modalidad: string;
  codigo: string;
  estado: string;
}

@Component({
  selector: 'app-participantes-page',
  imports: [
    FormsModule,
    RouterLink,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    IconComponent,
    InputComponent,
    PaginationComponent,
    SkeletonComponent,
  ],
  styleUrl: './participantes.page.css',
  templateUrl: './participantes.page.html',
})
export class ParticipantesPage {
  readonly store = inject(DataStoreService);
  readonly statusTone = statusTone;
  readonly statusLabel = statusLabel;
  readonly modalidades = CATEGORIAS;

  readonly search = signal('');
  readonly modalidadFilter = signal('');
  readonly grupoFilter = signal('');
  readonly pageSize = 10;
  readonly page = signal(1);
  /** Esqueleto de carga inicial (igual que el dashboard). */
  readonly cargando = signal(true);

  /** Bailarines de la nómina: cada fila es un participante que bailará. */
  readonly bailarines = computed((): BailarinRow[] =>
    this.store.participantesView().map((p) => ({
      id: p.id,
      nombre: p.nombres,
      celular: p.celular ?? '—',
      responsable: p.responsableNombre,
      agrupacion: p.nombreGrupo,
      modalidad: p.categoriaNombre,
      codigo: p.codigoInscripcion,
      estado: p.estadoInscripcion,
    })),
  );

  readonly grupos = computed(() =>
    [...new Set(this.bailarines().map((b) => b.agrupacion))].sort((a, b) =>
      a.localeCompare(b, 'es'),
    ),
  );

  readonly filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const mod = this.modalidadFilter();
    const grupo = this.grupoFilter();

    return this.bailarines().filter((b) => {
      const matchMod = !mod || b.modalidad === mod;
      const matchGrupo = !grupo || b.agrupacion === grupo;
      const matchQ =
        !q ||
        b.nombre.toLowerCase().includes(q) ||
        b.celular.includes(q) ||
        b.responsable.toLowerCase().includes(q) ||
        b.agrupacion.toLowerCase().includes(q) ||
        b.modalidad.toLowerCase().includes(q) ||
        b.codigo.toLowerCase().includes(q);
      return matchMod && matchGrupo && matchQ;
    });
  });

  readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  /** true cuando la página actual tiene exactamente pageSize filas.
   *  Página llena → la card usa flex:1 y llena el alto disponible.
   *  Página parcial → la card mide lo justo (altura natural).
   */
  readonly isFullPage = computed(() => this.paged().length >= this.pageSize);

  readonly totalBailarines = computed(() => this.bailarines().length);

  readonly totalGrupos = computed(
    () => new Set(this.bailarines().map((b) => b.codigo)).size,
  );

  readonly uniqueModalidades = computed(
    () => new Set(this.bailarines().map((b) => b.modalidad)).size,
  );

  constructor() {
    window.setTimeout(() => this.cargando.set(false), 500);
    effect(() => {
      this.search();
      this.modalidadFilter();
      this.grupoFilter();
      untracked(() => this.page.set(1));
    });
  }

  limpiarFiltros(): void {
    this.search.set('');
    this.modalidadFilter.set('');
    this.grupoFilter.set('');
  }
}
