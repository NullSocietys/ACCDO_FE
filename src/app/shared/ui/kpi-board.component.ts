import { Component, computed, input } from '@angular/core';
import { IconComponent } from '../icons/icon.component';
import { KpiItem } from './kpi-board.types';

@Component({
  selector: 'app-kpi-board',
  imports: [IconComponent],
  styleUrl: './kpi-board.component.css',
  templateUrl: './kpi-board.component.html',
})
export class KpiBoardComponent {
  readonly items = input.required<KpiItem[]>();
  readonly label = input('Indicadores');
  /** Preferred column count on wide screens (2–5). */
  readonly columns = input<2 | 3 | 4 | 5>(4);

  readonly boardClass = computed(() => `kpi-board kpi-board--cols-${this.columns()}`);
}
