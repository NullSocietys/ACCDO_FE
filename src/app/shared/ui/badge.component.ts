import { Component, input } from '@angular/core';

/**
 * Status chips — fixed semantic map:
 * green → activo / positivo · red → cancelado · gray → pasado/inactivo · blue → próximo
 */
export type BadgeTone = 'success' | 'danger' | 'muted' | 'info' | 'warn' | 'gold';

@Component({
  selector: 'app-badge',
  styleUrl: './badge.component.css',
  templateUrl: './badge.component.html',
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('muted');
  readonly dot = input(true);
}

export function statusTone(status: string): BadgeTone {
  const map: Record<string, BadgeTone> = {
    activo: 'success',
    proximo: 'info',
    finalizado: 'muted',
    cancelado: 'danger',
    pendiente: 'warn',
    confirmada: 'success',
    confirmado: 'success',
    verificado: 'success',
    verificados: 'success',
    rechazada: 'danger',
    rechazado: 'danger',
    borrador: 'muted',
    inactivo: 'muted',
  };
  return map[status.toLowerCase()] ?? 'muted';
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    activo: 'Activo',
    proximo: 'Próximo',
    finalizado: 'Finalizado',
    cancelado: 'Cancelado',
    pendiente: 'Pendiente',
    confirmada: 'Confirmada',
    confirmado: 'Confirmado',
    verificado: 'Verificado',
    rechazada: 'Rechazada',
    rechazado: 'Rechazado',
    borrador: 'Borrador',
    inactivo: 'Inactivo',
    yape: 'Yape',
    plin: 'Plin',
    transferencia: 'Transferencia',
    efectivo: 'Efectivo',
  };
  return map[status.toLowerCase()] ?? status;
}
