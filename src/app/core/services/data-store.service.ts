import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { DASHBOARD_STATS } from '../data/mock-data';
import {
  ActualizarRequest,
  Categoria,
  CategoriaPayload,
  ChartBar,
  Evento,
  EventoPayload,
  Inscripcion,
  InscripcionRequest,
  InscripcionView,
  LoginRequest,
  Pago,
  PagoRequest,
  PagoView,
  Participante,
  ParticipanteRequest,
  ParticipanteView,
  RegistroRequest,
  Responsable,
  ResponsableRequest,
  Resultado,
  ResultadoRequest,
  ResultadoView,
  Usuario,
} from '../models';
import { CategoriaApiService } from './api/categoria.api.service';
import { EventoApiService } from './api/evento.api.service';
import { InscripcionApiService } from './api/inscripcion.api.service';
import { PagoApiService } from './api/pago.api.service';
import { ParticipanteApiService } from './api/participante.api.service';
import { ResponsableApiService } from './api/responsable.api.service';
import { ResultadoApiService } from './api/resultado.api.service';
import { UsuarioApiService } from './api/usuario.api.service';

/**
 * Orquestador de datos del frontend.
 * Carga el catálogo desde el backend al inicio y expone mutaciones
 * que llaman a los endpoints y actualizan las signals en memoria.
 */
@Injectable({ providedIn: 'root' })
export class DataStoreService {
  private readonly usuarioApi = inject(UsuarioApiService);
  private readonly categoriaApi = inject(CategoriaApiService);
  private readonly eventoApi = inject(EventoApiService);
  private readonly inscripcionApi = inject(InscripcionApiService);
  private readonly participanteApi = inject(ParticipanteApiService);
  private readonly responsableApi = inject(ResponsableApiService);
  private readonly pagoApi = inject(PagoApiService);
  private readonly resultadoApi = inject(ResultadoApiService);

  readonly cargando = signal(true);

  readonly usuarios = signal<Usuario[]>([]);
  readonly usuariosInactivos = signal<Usuario[]>([]);
  readonly eventos = signal<Evento[]>([]);
  readonly eventosInactivos = signal<Evento[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly responsables = signal<Responsable[]>([]);
  readonly inscripciones = signal<Inscripcion[]>([]);
  readonly participantes = signal<Participante[]>([]);
  readonly pagos = signal<Pago[]>([]);
  readonly resultados = signal<Resultado[]>([]);
  readonly stats = DASHBOARD_STATS;

  /** Inscripciones por modalidad, calculado en vivo desde categorías e inscripciones reales. */
  readonly chart = computed<ChartBar[]>(() =>
    this.categorias().map((c) => ({
      label: c.nombre.replace('UNIPERSONAL ', '').replace(' MACHOS Y CAPORALITAS', '').replace(' (LIBRE)', ''),
      value: this.inscripciones().filter(
        (i) => i.categoriaId === c.id && i.activo && i.estado !== 'RECHAZADA',
      ).length,
    })),
  );

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

  constructor() {
    void this.loadAll();
  }

  /** Carga completa del catálogo: maestros + dependencias de cada inscripción. */
  async loadAll(): Promise<void> {
    this.cargando.set(true);
    try {
      const [usuarios, usuariosInactivos, eventos, eventosInactivos, categorias, responsables, inscripciones] =
        await Promise.all([
          firstValueFrom(this.usuarioApi.listar()),
          firstValueFrom(this.usuarioApi.listarInactivos()),
          firstValueFrom(this.eventoApi.listar()),
          firstValueFrom(this.eventoApi.listarInactivos()),
          firstValueFrom(this.categoriaApi.listar()),
          firstValueFrom(this.responsableApi.listar()),
          firstValueFrom(this.inscripcionApi.listar()),
        ]);
      this.usuarios.set(usuarios);
      this.usuariosInactivos.set(usuariosInactivos);
      this.eventos.set(eventos);
      this.eventosInactivos.set(eventosInactivos);
      this.categorias.set(categorias);
      this.responsables.set(responsables);
      this.inscripciones.set(inscripciones);
      await this.cargarHijos(inscripciones.map((i) => i.id));
    } catch (err) {
      console.error('No se pudo cargar el catálogo del backend:', err);
      throw err;
    } finally {
      this.cargando.set(false);
    }
  }

  /** Carga participantes, pagos y resultados de cada inscripción (endpoints por inscripción). */
  private async cargarHijos(inscripcionIds: string[]): Promise<void> {
    const [participantes, pagos, resultados] = await Promise.all([
      this.agruparPorInscripcion(inscripcionIds, (id) =>
        firstValueFrom(this.participanteApi.listar(id)),
      ),
      this.agruparPorInscripcion(inscripcionIds, (id) => firstValueFrom(this.pagoApi.listarPorInscripcion(id))),
      this.agruparPorInscripcion(inscripcionIds, (id) =>
        firstValueFrom(this.resultadoApi.listarPorInscripcion(id)),
      ),
    ]);
    this.participantes.set(participantes.flat());
    this.pagos.set(pagos.flat());
    this.resultados.set(resultados.flat());
  }

  private async agruparPorInscripcion<T>(
    ids: string[],
    fn: (id: string) => Promise<T[]>,
  ): Promise<T[][]> {
    const resultados = await Promise.all(ids.map((id) => fn(id).catch(() => [] as T[])));
    return resultados;
  }

  // ============================================================
  // USUARIOS / AUTH
  // ============================================================

  async registrar(datos: RegistroRequest): Promise<Usuario> {
    const usuario = await firstValueFrom(this.usuarioApi.registrar(datos));
    this.usuarios.update((list) => [usuario, ...list]);
    return usuario;
  }

  async obtenerUsuario(id: string): Promise<Usuario> {
    return firstValueFrom(this.usuarioApi.obtener(id));
  }

  async login(datos: LoginRequest): Promise<Usuario> {
    return firstValueFrom(this.usuarioApi.login(datos));
  }

  async actualizarUsuario(id: string, datos: ActualizarRequest): Promise<Usuario> {
    const usuario = await firstValueFrom(this.usuarioApi.actualizar(id, datos));
    this.usuarios.update((list) => list.map((u) => (u.id === id ? usuario : u)));
    this.usuariosInactivos.update((list) => list.map((u) => (u.id === id ? usuario : u)));
    return usuario;
  }

  async eliminarLogicoUsuario(id: string): Promise<Usuario> {
    const usuario = await firstValueFrom(this.usuarioApi.eliminarLogico(id));
    this.usuarios.update((list) => list.filter((u) => u.id !== id));
    this.usuariosInactivos.update((list) => [usuario, ...list]);
    return usuario;
  }

  async restaurarUsuario(id: string): Promise<Usuario> {
    const usuario = await firstValueFrom(this.usuarioApi.restaurar(id));
    this.usuariosInactivos.update((list) => list.filter((u) => u.id !== id));
    this.usuarios.update((list) => [usuario, ...list]);
    return usuario;
  }

  async eliminarFisicoUsuario(id: string, inactivo = false): Promise<void> {
    await firstValueFrom(this.usuarioApi.eliminarFisico(id));
    if (inactivo) {
      this.usuariosInactivos.update((list) => list.filter((u) => u.id !== id));
    } else {
      this.usuarios.update((list) => list.filter((u) => u.id !== id));
    }
  }

  // ============================================================
  // CATEGORIAS
  // ============================================================

  async addCategoria(payload: CategoriaPayload): Promise<Categoria> {
    const categoria = await firstValueFrom(this.categoriaApi.crear(payload));
    this.categorias.update((list) => [...list, categoria]);
    return categoria;
  }

  async updateCategoria(id: string, payload: CategoriaPayload): Promise<Categoria> {
    const categoria = await firstValueFrom(this.categoriaApi.actualizar(id, payload));
    this.categorias.update((list) => list.map((c) => (c.id === id ? categoria : c)));
    return categoria;
  }

  async removeCategoria(id: string): Promise<void> {
    await firstValueFrom(this.categoriaApi.eliminarLogico(id));
    this.categorias.update((list) => list.map((c) => (c.id === id ? { ...c, activo: false } : c)));
  }

  async restaurarCategoria(id: string): Promise<Categoria> {
    const categoria = await firstValueFrom(this.categoriaApi.restaurar(id));
    this.categorias.update((list) => list.map((c) => (c.id === id ? categoria : c)));
    return categoria;
  }

  async eliminarFisicoCategoria(id: string): Promise<void> {
    await firstValueFrom(this.categoriaApi.eliminarFisico(id));
    this.categorias.update((list) => list.filter((c) => c.id !== id));
  }

  // ============================================================
  // EVENTOS
  // ============================================================

  async addEvento(payload: EventoPayload): Promise<Evento> {
    const evento = await firstValueFrom(this.eventoApi.crear(payload));
    this.eventos.update((list) => [evento, ...list]);
    return evento;
  }

  async updateEvento(id: string, payload: EventoPayload): Promise<Evento> {
    const evento = await firstValueFrom(this.eventoApi.actualizar(id, payload));
    this.eventos.update((list) => list.map((e) => (e.id === id ? evento : e)));
    return evento;
  }

  async removeEvento(id: string): Promise<void> {
    const evento = await firstValueFrom(this.eventoApi.eliminarLogico(id));
    // Sale de la lista activa y entra al archivo inactivo (patrón usuarios).
    this.eventos.update((list) => list.filter((e) => e.id !== id));
    this.eventosInactivos.update((list) => [{ ...evento, activo: false }, ...list]);
  }

  async cambiarEstadoEvento(id: string, estado: string): Promise<Evento> {
    const evento = await firstValueFrom(this.eventoApi.cambiarEstado(id, estado));
    this.eventos.update((list) => list.map((e) => (e.id === id ? evento : e)));
    return evento;
  }

  async restaurarEvento(id: string): Promise<Evento> {
    const evento = await firstValueFrom(this.eventoApi.restaurar(id));
    this.eventosInactivos.update((list) => list.filter((e) => e.id !== id));
    this.eventos.update((list) => [evento, ...list]);
    return evento;
  }

  async eliminarFisicoEvento(id: string): Promise<void> {
    await firstValueFrom(this.eventoApi.eliminarFisico(id));
    this.eventos.update((list) => list.filter((e) => e.id !== id));
    this.eventosInactivos.update((list) => list.filter((e) => e.id !== id));
  }

  // ============================================================
  // INSCRIPCIONES
  // ============================================================

  /** Crea la inscripción con responsable y participantes, y opcionalmente el pago + voucher. */
  async crearInscripcion(
    req: InscripcionRequest,
    pago?: Omit<PagoRequest, 'inscripcionId'>,
    voucher?: File | null,
  ): Promise<Inscripcion> {
    const inscripcion = await firstValueFrom(this.inscripcionApi.crear(req));
    this.inscripciones.update((list) => [...list, inscripcion]);

    try {
      const responsable = await firstValueFrom(
        this.responsableApi.obtener(inscripcion.responsableId),
      );
      this.responsables.update((list) =>
        list.some((r) => r.id === responsable.id)
          ? list.map((r) => (r.id === responsable.id ? responsable : r))
          : [...list, responsable],
      );
    } catch {
      /* el responsable se vuelve a cargar en la próxima sincronización */
    }

    const [participantes, pagos] = await Promise.all([
      firstValueFrom(this.participanteApi.listar(inscripcion.id)),
      firstValueFrom(this.pagoApi.listarPorInscripcion(inscripcion.id)),
    ]);
    if (participantes) this.participantes.update((list) => [...list, ...participantes]);
    if (pagos) this.pagos.update((list) => [...list, ...pagos]);

    if (pago) {
      const { comprobante: _omit, ...pagoSinArchivo } = pago;
      const registrado = await this.registrarPago({
        ...pagoSinArchivo,
        inscripcionId: inscripcion.id,
      });
      if (voucher) {
        await this.adjuntarComprobante(registrado.id, voucher);
      }
    }
    return inscripcion;
  }

  async cambiarEstadoInscripcion(id: string, estado: string): Promise<Inscripcion> {
    const inscripcion = await firstValueFrom(this.inscripcionApi.cambiarEstado(id, estado));
    this.inscripciones.update((list) => list.map((i) => (i.id === id ? inscripcion : i)));
    return inscripcion;
  }

  async removeInscripcion(id: string): Promise<void> {
    await firstValueFrom(this.inscripcionApi.eliminarLogico(id));
    this.inscripciones.update((list) => list.map((i) => (i.id === id ? { ...i, activo: false } : i)));
  }

  async restaurarInscripcion(id: string): Promise<Inscripcion> {
    const inscripcion = await firstValueFrom(this.inscripcionApi.restaurar(id));
    this.inscripciones.update((list) => list.map((i) => (i.id === id ? inscripcion : i)));
    return inscripcion;
  }

  async eliminarFisicoInscripcion(id: string): Promise<void> {
    await firstValueFrom(this.inscripcionApi.eliminarFisico(id));
    this.inscripciones.update((list) => list.filter((i) => i.id !== id));
  }

  // ============================================================
  // PARTICIPANTES
  // ============================================================

  async addParticipante(inscripcionId: string, p: ParticipanteRequest): Promise<Participante> {
    const participante = await firstValueFrom(this.participanteApi.agregar(inscripcionId, p));
    this.participantes.update((list) => [...list, participante]);
    return participante;
  }

  async removeParticipante(inscripcionId: string, participanteId: string): Promise<void> {
    await firstValueFrom(this.participanteApi.eliminar(inscripcionId, participanteId));
    this.participantes.update((list) =>
      list.map((p) => (p.id === participanteId ? { ...p, activo: false } : p)),
    );
  }

  async restaurarParticipante(inscripcionId: string, participanteId: string): Promise<Participante> {
    const participante = await firstValueFrom(
      this.participanteApi.restaurar(inscripcionId, participanteId),
    );
    this.participantes.update((list) => list.map((p) => (p.id === participanteId ? participante : p)));
    return participante;
  }

  async eliminarFisicoParticipante(inscripcionId: string, participanteId: string): Promise<void> {
    await firstValueFrom(this.participanteApi.eliminarFisico(inscripcionId, participanteId));
    this.participantes.update((list) => list.filter((p) => p.id !== participanteId));
  }

  // ============================================================
  // RESPONSABLES
  // ============================================================

  async addResponsable(req: ResponsableRequest): Promise<Responsable> {
    const responsable = await firstValueFrom(this.responsableApi.crear(req));
    this.responsables.update((list) => [...list, responsable]);
    return responsable;
  }

  async updateResponsable(id: string, req: ResponsableRequest): Promise<Responsable> {
    const responsable = await firstValueFrom(this.responsableApi.actualizar(id, req));
    this.responsables.update((list) => list.map((r) => (r.id === id ? responsable : r)));
    return responsable;
  }

  async removeResponsable(id: string): Promise<void> {
    await firstValueFrom(this.responsableApi.eliminarLogico(id));
    this.responsables.update((list) => list.map((r) => (r.id === id ? { ...r, activo: false } : r)));
  }

  async restaurarResponsable(id: string): Promise<Responsable> {
    const responsable = await firstValueFrom(this.responsableApi.restaurar(id));
    this.responsables.update((list) => list.map((r) => (r.id === id ? responsable : r)));
    return responsable;
  }

  async eliminarFisicoResponsable(id: string): Promise<void> {
    await firstValueFrom(this.responsableApi.eliminarFisico(id));
    this.responsables.update((list) => list.filter((r) => r.id !== id));
  }

  // ============================================================
  // PAGOS
  // ============================================================

  async registrarPago(req: PagoRequest): Promise<Pago> {
    const pago = await firstValueFrom(this.pagoApi.registrar(req));
    this.pagos.update((list) => [...list, pago]);
    return pago;
  }

  async adjuntarComprobante(pagoId: string, archivo: File): Promise<Pago> {
    const pago = await firstValueFrom(this.pagoApi.adjuntarComprobante(pagoId, archivo));
    this.pagos.update((list) => list.map((p) => (p.id === pagoId ? pago : p)));
    return pago;
  }

  async confirmarPago(id: string): Promise<Pago> {
    const pago = await firstValueFrom(this.pagoApi.confirmar(id));
    this.pagos.update((list) => list.map((p) => (p.id === id ? pago : p)));
    // Si el pago cubre el total, el backend marca la inscripción CONFIRMADA.
    this.inscripciones.update((list) =>
      list.map((i) =>
        i.id === pago.inscripcionId && (i.estado === 'PENDIENTE' || i.estado === 'RECHAZADA')
          ? { ...i, estado: 'CONFIRMADA' as const }
          : i,
      ),
    );
    return pago;
  }

  async rechazarPago(id: string, motivo: string): Promise<Pago> {
    const pago = await firstValueFrom(this.pagoApi.rechazar(id, motivo));
    this.pagos.update((list) => list.map((p) => (p.id === id ? pago : p)));
    // El backend rechaza también la inscripción asociada.
    this.inscripciones.update((list) =>
      list.map((i) =>
        i.id === pago.inscripcionId ? { ...i, estado: 'RECHAZADA' as const } : i,
      ),
    );
    return pago;
  }

  async removePago(id: string): Promise<void> {
    await firstValueFrom(this.pagoApi.eliminarLogico(id));
    this.pagos.update((list) => list.map((p) => (p.id === id ? { ...p, activo: false } : p)));
  }

  async restaurarPago(id: string): Promise<Pago> {
    const pago = await firstValueFrom(this.pagoApi.restaurar(id));
    this.pagos.update((list) => list.map((p) => (p.id === id ? pago : p)));
    return pago;
  }

  async eliminarFisicoPago(id: string): Promise<void> {
    await firstValueFrom(this.pagoApi.eliminarFisico(id));
    this.pagos.update((list) => list.filter((p) => p.id !== id));
  }

  // ============================================================
  // RESULTADOS
  // ============================================================

  async addResultado(req: ResultadoRequest): Promise<Resultado> {
    const resultado = await firstValueFrom(this.resultadoApi.registrar(req));
    this.resultados.update((list) => [...list, resultado]);
    return resultado;
  }

  async updateResultado(id: string, req: ResultadoRequest): Promise<Resultado> {
    const resultado = await firstValueFrom(this.resultadoApi.actualizar(id, req));
    this.resultados.update((list) => list.map((r) => (r.id === id ? resultado : r)));
    return resultado;
  }

  async removeResultado(id: string): Promise<void> {
    await firstValueFrom(this.resultadoApi.eliminar(id));
    this.resultados.update((list) => list.map((r) => (r.id === id ? { ...r, activo: false } : r)));
  }

  async restaurarResultado(id: string): Promise<Resultado> {
    const resultado = await firstValueFrom(this.resultadoApi.restaurar(id));
    this.resultados.update((list) => list.map((r) => (r.id === id ? resultado : r)));
    return resultado;
  }

  async eliminarFisicoResultado(id: string): Promise<void> {
    await firstValueFrom(this.resultadoApi.eliminarFisico(id));
    this.resultados.update((list) => list.filter((r) => r.id !== id));
  }

  // ============================================================
  // LOOKUPS Y VISTAS
  // ============================================================

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
      responsableDepartamento: res?.departamento ?? '',
      responsableProvincia: res?.provincia ?? '',
      responsableDistrito: res?.distrito ?? '',
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
      responsableTelefono: view?.responsableTelefono ?? '',
      modalidad: view?.categoriaNombre ?? '—',
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
      categoriaId: view.categoriaId,
      categoriaNombre: view.categoriaNombre,
      eventoId: view.eventoId,
      eventoNombre: view.eventoNombre,
      codigoInscripcion: view.codigo,
    };
  }
}