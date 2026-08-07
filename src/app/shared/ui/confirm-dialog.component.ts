import { Component, inject } from '@angular/core';
import { ConfirmService } from '../../core/services/confirm.service';
import { ButtonComponent } from './button.component';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'app-confirm-dialog',
  imports: [ModalComponent, ButtonComponent],
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  readonly confirm = inject(ConfirmService);
}
