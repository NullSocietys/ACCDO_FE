import { CurrencyPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ARTICULOS_BASES, CRITERIOS_CALIFICACION, MODALIDADES, PREMIOS } from '../../core/data/bases';
import { IconComponent } from '../../shared/icons/icon.component';
import { KpiBoardComponent } from '../../shared/ui/kpi-board.component';
import { KpiItem } from '../../shared/ui/kpi-board.types';

@Component({
  selector: 'app-bases-page',
  imports: [CurrencyPipe, IconComponent, KpiBoardComponent],
  styleUrl: './bases.page.css',
  templateUrl: './bases.page.html',
})
export class BasesPage {
  readonly articulos = ARTICULOS_BASES;
  readonly modalidades = MODALIDADES;
  readonly criterios = CRITERIOS_CALIFICACION;
  readonly premios = PREMIOS;
  readonly activeId = signal(ARTICULOS_BASES[0]?.id ?? '01');

  readonly active = computed(
    () => this.articulos.find((a) => a.id === this.activeId()) ?? this.articulos[0],
  );

  readonly kpis: KpiItem[] = [
    {
      label: 'Fecha del concurso',
      value: '16 ago',
      hint: 'Domingo · Semifinal y Final',
      icon: 'calendar',
      tone: 'gold',
    },
    {
      label: 'Lugar',
      value: 'Coliseo Imperial',
      hint: 'Cañete · 10:00 am',
      icon: 'mapPin',
      tone: 'info',
    },
    {
      label: 'Sorteo',
      value: '14 ago',
      hint: '09:00 pm · Facebook',
      icon: 'clock',
      tone: 'warn',
    },
    {
      label: 'Inscripciones / Yape',
      value: '926 266 295',
      hint: 'Martha Bravo · Coordinadora',
      icon: 'phone',
      tone: 'ink',
      money: true,
    },
  ];

  select(id: string): void {
    this.activeId.set(id);
    const el = document.getElementById(`art-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
