import { Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  styleUrl: './card.component.css',
  host: {
    '[class.interactive]': 'interactive()',
    '[style.--pad]': 'padding()',
  },
  templateUrl: './card.component.html',
})
export class CardComponent {
  readonly title = input<string | null>(null);
  readonly description = input<string | null>(null);
  readonly interactive = input(false);
  readonly padding = input('var(--card-pad)');
}
