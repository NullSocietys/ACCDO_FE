import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
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
  readonly toggle = input(false);
  readonly lettersOnly = input(false);
  readonly digitsOnly = input(false);
  readonly maxlength = input<number | null>(null);
  readonly valueChange = output<string>();

  readonly mostrado = signal(false);

  private readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('inputRef');

  /** Inputs de fecha/hora: al hacer click en cualquier parte del campo se
   *  abre el calendario/reloj desplegable nativo del navegador. */
  abrirPicker(): void {
    if (this.type() !== 'date' && this.type() !== 'time') return;
    const el = this.inputEl()?.nativeElement as HTMLInputElement & {
      showPicker?: () => void;
    };
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      el.focus();
    }
  }

  onInput(el: HTMLInputElement): void {
    if (this.lettersOnly()) {
      const limpio = el.value.replace(/[^\p{L}\s']/gu, '');
      if (limpio !== el.value) {
        el.value = limpio;
      }
      this.valueChange.emit(limpio);
      return;
    }
    if (this.digitsOnly()) {
      const limpio = el.value.replace(/\D/g, '');
      if (limpio !== el.value) {
        el.value = limpio;
      }
      this.valueChange.emit(limpio);
      return;
    }
    this.valueChange.emit(el.value);
  }
}
