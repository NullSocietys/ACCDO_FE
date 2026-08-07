import { Component, input, output } from '@angular/core';
import { IconComponent } from '../icons/icon.component';
import { ButtonComponent } from './button.component';

@Component({
  selector: 'app-empty-state',
  imports: [IconComponent, ButtonComponent],
  styleUrl: './empty-state.component.css',
  templateUrl: './empty-state.component.html',
})
export class EmptyStateComponent {
  readonly icon = input('inbox');
  readonly title = input('Sin resultados');
  readonly description = input('No hay información para mostrar todavía.');
  readonly actionLabel = input<string | null>(null);
  readonly actionIcon = input<string | null>('plus');
  readonly actioned = output<void>();
}
