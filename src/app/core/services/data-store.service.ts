import { Injectable, computed, signal } from '@angular/core';
import {
  CATEGORIAS_DB,
  CHART_INSCRIPCIONES,
  CONFIGURACION,
  DASHBOARD_STATS,
  EVENTOS,
  INSCRIPCIONES,
  PAGOS,
  PARTICIPANTES,
  RESPONSABLES,
  RESULTADOS,
  USUARIOS,
} from '../data/mock-data';
import {
  Categoria,
  Configuracion,
  Evento,
  Inscripcion,
  InscripcionView,
  Pago,
  PagoView,
  Participante,
  ParticipanteView,
  Responsable,
  Resultado,
  ResultadoView,
  Usuario,
} from '../models';

@Injectable({ providedIn: 'root' })
export class DataStoreService {
  readonly usuarios = signal<Usuario[]>([...USUARIOS]);
  readonly eventos = signal<Evento[]>([...EVENTOS]);
  readonly categorias = signal<Categoria[]>([...CATEGORIAS_DB]);
  readonly responsables = signal<Responsable[]>([...RESPONSABLES]);
  readonly inscripciones = signal<Inscripcion[]>([...INSCRIPCIONES]);
  readonly participantes = signal<Participante[]>([...PARTICIPANTES]);
  readonly pagos = signal<Pago[]>([...PAGOS]);
  readonly resultados = signal<Resultado[]>([...RESULTADOS]);
  readonly configuracion = signal<Configuracion>({ ...CONFIGURACION });
  readonly stats = DASHBOARD_STATS;
  readonly chart = CHART_INSCRIPCIONES;

  readonly inscripcionesView = computed((): InscripcionView[] =>
    this.inscripciones()
      .filter((i) => i.activo)
      .map((i) => this.toInscripcionView(i)),
  );

  readonly pagosView = computed((): PagoView[] =>
    this.pagos()
      .filter((p) => p.activo)
      .map((p) => this.toPagoView(p)),
  );

  readonly participantesView = computed((): ParticipanteView[] =>
    this.participantes()
      .filter((p) => p.activo)
      .map((p) => this.toParticipanteView(p))
      .filter((p): p is ParticipanteView => p !== null),
  );

  readonly resultadosView = computed((): ResultadoView[] =>
    this.resultados()
      .filter((r) => r.activo)
      .map((r) => this.toResultadoView(r))
      .filter((r): r is ResultadoView => r !== null),
  );

  categoriaById(id: string): Categoria | undefined {
    return this.categorias().find((c) => c.id === id);
  }

  eventoById(id: string): Evento | undefined {
    return this.eventos().find((e) => e.id === id);
  }

  responsableById(id: string): Responsable | undefined {
    return this.responsables().find((r) => r.id === id);
  }

  responsableNombre(r: Responsable): string {
    return `${r.nombres} ${r.apellidos}`.trim();
  }

  toInscripcionView(i: Inscripcion): InscripcionView {
    const evento = this.eventoById(i.eventoId);
    const cat = this.categoriaById(i.categoriaId);
    const res = this.responsableById(i.responsableId);
    return {
      ...i,
      eventoNombre: evento?.nombre ?? '—',
      categoriaNombre: cat?.nombre ?? '—',
      categoriaPrecio: cat?.precio ?? i.total,
      responsableNombre: res ? this.responsableNombre(res) : '—',
      responsableDni: res?.dni ?? '',
      responsableTelefono: res?.telefono ?? '',
      responsableCorreo: res?.correo ?? '',
    };
  }

  toPagoView(p: Pago): PagoView {
    const ins = this.inscripciones().find((i) => i.id === p.inscripcionId);
    const view = ins ? this.toInscripcionView(ins) : null;
    return {
      ...p,
      codigo: view?.codigo ?? '—',
      nombreGrupo: view?.nombreGrupo ?? '—',
      responsableNombre: view?.responsableNombre ?? '—',
    };
  }

  toParticipanteView(p: Participante): ParticipanteView | null {
    const ins = this.inscripciones().find((i) => i.id === p.inscripcionId);
    if (!ins || !ins.activo) return null;
    const view = this.toInscripcionView(ins);
    return {
      ...p,
      nombreGrupo: view.nombreGrupo,
      categoriaNombre: view.categoriaNombre,
      eventoNombre: view.eventoNombre,
      responsableNombre: view.responsableNombre,
      codigoInscripcion: view.codigo,
      estadoInscripcion: view.estado,
    };
  }

  toResultadoView(r: Resultado): ResultadoView | null {
    const ins = this.inscripciones().find((i) => i.id === r.inscripcionId);
    if (!ins) return null;
    const view = this.toInscripcionView(ins);
    return {
      ...r,
      nombreGrupo: view.nombreGrupo,
      categoriaNombre: view.categoriaNombre,
      eventoId: view.eventoId,
      eventoNombre: view.eventoNombre,
      codigoInscripcion: view.codigo,
    };
  }

  addEvento(evento: Evento): void {
    this.eventos.update((list) => [evento, ...list]);
  }

  updateEvento(evento: Evento): void {
    this.eventos.update((list) => list.map((e) => (e.id === evento.id ? evento : e)));
  }

  removeEvento(id: string): void {
    this.eventos.update((list) =>
      list.map((e) => (e.id === id ? { ...e, activo: false, estado: 'CANCELADO' as const } : e)),
    );
  }

  addResponsable(responsable: Responsable): void {
    this.responsables.update((list) => [responsable, ...list]);
  }

  addInscripcion(
    inscripcion: Inscripcion,
    participantes: Participante[],
    pago: Pago,
    responsable?: Responsable,
  ): void {
    if (responsable) {
      this.addResponsable(responsable);
    }
    this.inscripciones.update((list) => [inscripcion, ...list]);
    this.participantes.update((list) => [...participantes, ...list]);
    this.pagos.update((list) => [pago, ...list]);
  }

  removeInscripcion(id: string): void {
    this.inscripciones.update((list) =>
      list.map((i) => (i.id === id ? { ...i, activo: false } : i)),
    );
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
