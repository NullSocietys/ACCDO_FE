import { Component, input, output } from '@angular/core';
import { IconComponent } from '../icons/icon.component';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'outline'
  | 'outline-dark'
  | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

@Component({
  selector: 'app-button',
  imports: [IconComponent],
  styleUrl: './button.component.css',
  templateUrl: './button.component.html',
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly icon = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);
  readonly clicked = output<MouseEvent>();
}
