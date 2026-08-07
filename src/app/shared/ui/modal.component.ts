import { Component, input, output } from '@angular/core';
import { ButtonComponent } from './button.component';

@Component({
  selector: 'app-modal',
  imports: [ButtonComponent],
  styleUrl: './modal.component.css',
  templateUrl: './modal.component.html',
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('Modal');
  /** Micro-label above the title (Swiss folio mark). */
  readonly label = input('Panel');
  readonly description = input<string | null>(null);
  readonly size = input<'md' | 'lg' | 'xl'>('md');
  readonly showFooter = input(true);
  readonly closeOnBackdrop = input(true);
  readonly closed = output<void>();

  readonly titleId = `modal-title-${Math.random().toString(36).slice(2, 8)}`;

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget && this.closeOnBackdrop()) {
      this.closed.emit();
    }
  }
}
