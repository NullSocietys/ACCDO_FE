import { CurrencyPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ARTICULOS_BASES, CRITERIOS_CALIFICACION, MODALIDADES, PREMIOS } from '../../core/data/bases';
import { IconComponent } from '../../shared/icons/icon.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

@Component({
  selector: 'app-bases-page',
  imports: [CurrencyPipe, IconComponent, SkeletonComponent],
  styleUrl: './bases.page.css',
  templateUrl: './bases.page.html',
})
export class BasesPage {
  readonly articulos = ARTICULOS_BASES;
  readonly modalidades = MODALIDADES;
  readonly criterios = CRITERIOS_CALIFICACION;
  readonly premios = PREMIOS;
  readonly activeId = signal(ARTICULOS_BASES[0]?.id ?? '01');
  /** Esqueleto de carga inicial (igual que el dashboard). */
  readonly cargando = signal(true);

  constructor() {
    window.setTimeout(() => this.cargando.set(false), 500);
  }

  readonly active = computed(
    () => this.articulos.find((a) => a.id === this.activeId()) ?? this.articulos[0],
  );

  select(id: string): void {
    this.activeId.set(id);
    const el = document.getElementById(`art-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
