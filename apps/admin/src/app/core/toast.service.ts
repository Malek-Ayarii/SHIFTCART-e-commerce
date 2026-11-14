import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
}

/** Messages courts (rollback, confirmation d'action) annoncés via une région aria-live. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private readonly items = signal<Toast[]>([]);
  readonly toasts = this.items.asReadonly();

  show(text: string, kind: ToastKind = 'info', durationMs = 5000): number {
    const id = ++this.seq;
    this.items.update((list) => [...list.slice(-3), { id, text, kind }]);
    if (durationMs > 0) setTimeout(() => this.dismiss(id), durationMs);
    return id;
  }

  error(text: string): number {
    return this.show(text, 'error', 7000);
  }

  success(text: string): number {
    return this.show(text, 'success');
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((t) => t.id !== id));
  }
}
