import { Injectable, signal } from '@angular/core';
import {
  CHART_INSCRIPCIONES,
  CONFIGURACION,
  DASHBOARD_STATS,
  EVENTOS,
  INSCRIPCIONES,
  PAGOS,
  PARTICIPANTES,
  RESULTADOS,
} from '../data/mock-data';
import {
  Configuracion,
  Evento,
  Inscripcion,
  Pago,
  Participante,
  Resultado,
} from '../models';

@Injectable({ providedIn: 'root' })
export class DataStoreService {
  readonly eventos = signal<Evento[]>([...EVENTOS]);
  readonly inscripciones = signal<Inscripcion[]>([...INSCRIPCIONES]);
  readonly participantes = signal<Participante[]>([...PARTICIPANTES]);
  readonly pagos = signal<Pago[]>([...PAGOS]);
  readonly resultados = signal<Resultado[]>([...RESULTADOS]);
  readonly configuracion = signal<Configuracion>({ ...CONFIGURACION });
  readonly stats = DASHBOARD_STATS;
  readonly chart = CHART_INSCRIPCIONES;

  addEvento(evento: Evento): void {
    this.eventos.update((list) => [evento, ...list]);
  }

  updateEvento(evento: Evento): void {
    this.eventos.update((list) => list.map((e) => (e.id === evento.id ? evento : e)));
  }

  removeEvento(id: string): void {
    this.eventos.update((list) => list.filter((e) => e.id !== id));
  }

  addInscripcion(inscripcion: Inscripcion, participantes: Participante[], pago: Pago): void {
    this.inscripciones.update((list) => [inscripcion, ...list]);
    this.participantes.update((list) => [...participantes, ...list]);
    this.pagos.update((list) => [pago, ...list]);
  }

  updatePago(pago: Pago): void {
    this.pagos.update((list) => list.map((p) => (p.id === pago.id ? pago : p)));
  }

  addResultado(resultado: Resultado): void {
    this.resultados.update((list) => [resultado, ...list]);
  }

  saveConfig(config: Configuracion): void {
    this.configuracion.set(config);
  }
}
