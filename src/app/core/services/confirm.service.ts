import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly open = signal(false);
  readonly options = signal<ConfirmOptions>({ title: 'Confirmar' });
  private resolver: ((value: boolean) => void) | null = null;

  ask(options: ConfirmOptions): Promise<boolean> {
    this.options.set(options);
    this.open.set(true);
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  resolve(value: boolean): void {
    this.open.set(false);
    this.resolver?.(value);
    this.resolver = null;
  }
}
