import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-toast-host',
  imports: [IconComponent],
  styleUrl: './toast-host.component.css',
  templateUrl: './toast-host.component.html',
})
export class ToastHostComponent {
  readonly toastService = inject(ToastService);
}
