import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);

  show(title: string, options?: { description?: string; tone?: ToastTone; durationMs?: number }): void {
    const id = crypto.randomUUID();
    const toast: ToastItem = {
      id,
      title,
      description: options?.description,
      tone: options?.tone ?? 'info',
    };
    this.toasts.update((list) => [...list, toast]);
    const duration = options?.durationMs ?? 3400;
    window.setTimeout(() => this.dismiss(id), duration);
  }

  success(title: string, description?: string): void {
    this.show(title, { description, tone: 'success' });
  }

  error(title: string, description?: string): void {
    this.show(title, { description, tone: 'error' });
  }

  warning(title: string, description?: string): void {
    this.show(title, { description, tone: 'warning' });
  }

  info(title: string, description?: string): void {
    this.show(title, { description, tone: 'info' });
  }

  dismiss(id: string): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
