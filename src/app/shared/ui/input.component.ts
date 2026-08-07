import { Component, input, output } from '@angular/core';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-input',
  imports: [IconComponent],
  styleUrl: './input.component.css',
  templateUrl: './input.component.html',
})
export class InputComponent {
  readonly controlId = input<string>('');
  readonly name = input<string | null>(null);
  readonly type = input<'text' | 'email' | 'tel' | 'number' | 'date' | 'time' | 'password' | 'file'>('text');
  readonly placeholder = input('');
  readonly value = input('');
  readonly icon = input<string | null>(null);
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly multiline = input(false);
  readonly rows = input(4);
  readonly valueChange = output<string>();
}
