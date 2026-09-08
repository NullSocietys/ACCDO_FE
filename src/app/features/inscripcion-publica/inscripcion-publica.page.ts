import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';

import { CategoriaApiService } from '../../core/services/api/categoria.api.service';
import { EventoApiService } from '../../core/services/api/evento.api.service';
import { InscripcionApiService } from '../../core/services/api/inscripcion.api.service';
import { PagoApiService } from '../../core/services/api/pago.api.service';
import { UsuarioApiService } from '../../core/services/api/usuario.api.service';
import { ComboBuscadorComponent } from '../../shared/ui/combo-buscador/combo-buscador.component';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { descargarComprobantePdf } from '../../shared/pdf/comprobante.pdf';
import type { Responsable } from '../../core/models';
import departamentoData from '../../core/ubigeo-json/1_ubigeo_departamentos.json';
import provinciaData from '../../core/ubigeo-json/2_ubigeo_provincias.json';
import distritoData from '../../core/ubigeo-json/3_ubigeo_distritos.json';

interface UbigeoDepartamento {
  id: number;
  departamento: string;
  ubigeo: string;
}

interface UbigeoProvincia {
  id: number;
  provincia: string;
  ubigeo: string;
  departamento_id: number;
}

interface UbigeoDistrito {
  id: number;
  distrito: string;
  ubigeo: string;
  provincia_id: number;
  departamento_id: number;
}

const ubigeoDepartamentos = (
  departamentoData as { ubigeo_departamentos: UbigeoDepartamento[] }
).ubigeo_departamentos;
const ubigeoProvincias = (
  provinciaData as { ubigeo_provincias: UbigeoProvincia[] }
).ubigeo_provincias;
const ubigeoDistritos = (
  distritoData as { ubigeo_distritos: UbigeoDistrito[] }
).ubigeo_distritos;

const RESPONSABLE_CACHE_KEY = 'chicote.responsablePrefill';

interface FormCuenta {
  metodo: 'registro' | 'login';
  /** Solo credenciales. Los datos de contacto viven en FormResponsable
   *  (nombres, apellidos, dni, teléfono, ubigeo, correo) y se piden UNA vez. */
  correo: string;
  password: string;
  confirmar: string;
}

interface FormGrupo {
  eventoId: string;
  categoriaId: string;
  nombreGrupo: string;
}

interface FormResponsable {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  correo: string;
  departamento: string;
  provincia: string;
  distrito: string;
}

interface FormParticipante {
  nombres: string;
  celular: string;
}

type Errores = Record<string, string>;

@Component({
  selector: 'app-inscripcion-publica-page',
  standalone: true,
  imports: [FormsModule, RouterLink, ComboBuscadorComponent],
  templateUrl: './inscripcion-publica.page.html',
  styleUrls: ['./inscripcion-publica.page.css'],
})
export class InscripcionPublicaPage implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthSessionService);
  private readonly eventoApi = inject(EventoApiService);
  private readonly categoriaApi = inject(CategoriaApiService);
  private readonly inscripcionApi = inject(InscripcionApiService);
  private readonly pagoApi = inject(PagoApiService);
  private readonly usuarioApi = inject(UsuarioApiService);

  private readonly emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly passRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  private readonly dniRe = /^\d{8}$/;
  private readonly telRe = /^9\d{8}$/;

  readonly departamentos: string[] = ubigeoDepartamentos.map((d) => d.departamento);

  readonly step = signal(1);
  readonly loadingCatalog = signal(true);
  readonly saving = signal(false);
  readonly success = signal(false);
  readonly resultCodigo = signal('');
  readonly errorMsg = signal('');
  /** Paso en el que el usuario intentó continuar y la validación falló. */
  readonly intento = signal(0);
  readonly mostrarPassword = signal(false);
  readonly mostrarConfirmar = signal(false);
  readonly sesionActiva = signal(false);

  readonly eventos = signal<Array<{ id: string; nombre: string; fecha: string }>>([]);
  readonly categorias = signal<
    Array<{ id: string; nombre: string; precio: number; minIntegrantes: number; maxIntegrantes: number }>
  >([]);

  /** Labels del selector de evento, con fecha legible. */
  readonly eventoLabels = computed(() =>
    this.eventos().map((e) => `${e.nombre} · ${this.formatearFecha(e.fecha)}`),
  );

  readonly eventoLabelSeleccionado = computed(() => {
    const ev = this.eventos().find((e) => e.id === this.grupo().eventoId);
    return ev ? `${ev.nombre} · ${this.formatearFecha(ev.fecha)}` : '';
  });

  /** "2026-09-25" -> "25 de setiembre de 2026". */
  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const partes = fecha.slice(0, 10).split('-').map(Number);
    if (partes.length !== 3 || partes.some(isNaN)) return fecha;
    return new Intl.DateTimeFormat('es-PE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(partes[0], partes[1] - 1, partes[2]));
  }

  onEventoLabel(label: string): void {
    const ev = this.eventos().find(
      (e) => `${e.nombre} · ${this.formatearFecha(e.fecha)}` === label,
    );
    if (ev) this.patchGrupo({ eventoId: ev.id });
  }

  readonly cuenta = signal<FormCuenta>({
    metodo: 'registro',
    correo: '',
    password: '',
    confirmar: '',
  });

  readonly grupo = signal<FormGrupo>({ eventoId: '', categoriaId: '', nombreGrupo: '' });
  readonly responsable = signal<FormResponsable>({
    nombres: '',
    apellidos: '',
    dni: '',
    telefono: '',
    correo: '',
    departamento: '',
    provincia: '',
    distrito: '',
  });
  readonly participantes = signal<FormParticipante[]>([
    { nombres: '', celular: '' },
  ]);
  readonly numeroOperacion = signal('');
  readonly comprobanteNombre = signal('');
  readonly comprobantePreview = signal<string | null>(null);
  readonly comprobanteFile = signal<File | null>(null);
  readonly comprobanteError = signal('');
  readonly resultEstado = signal('Pendiente de confirmación');
  /** true si el registro de la cuenta ocurrió dentro de este wizard. */
  readonly cuentaRecienCreada = signal(false);

  private usuarioId = '';
  readonly nombreUsuario = signal('');

  /** Nombre completo de la cuenta del formulario (nombres + apellidos). */
  private get nombreCuenta(): string {
    const r = this.responsable();
    return [r.nombres.trim(), r.apellidos.trim()].filter(Boolean).join(' ');
  }

  /** Persistencia del wizard: sobrevive recargas de página. */
  private static readonly WIZARD_KEY = 'chicote-wizard-estado';

  /** Sincronización correo → responsable: activa hasta editar manual. */
  private readonly syncCorreo = signal(true);

  readonly stepMeta = computed(() => [
    { n: 1, label: 'Tus datos', desc: this.sesionActiva()
      ? 'Sesión activa — puedes continuar'
      : 'Crea tu cuenta o entra: una sola vez' },
    { n: 2, label: 'Modalidad', desc: 'Elige categoría y nombre del grupo' },
    { n: 3, label: 'Participantes', desc: 'Nómina de bailarines' },
    { n: 4, label: 'Pago Yape', desc: 'Registra tu pago y adjunta el voucher' },
  ]);

  readonly eventoNombre = computed(() => {
    const id = this.grupo().eventoId;
    return this.eventos().find((e) => e.id === id)?.nombre ?? '';
  });

  readonly categoriaSeleccionada = computed(
    () => this.categorias().find((c) => c.id === this.grupo().categoriaId) ?? null,
  );

  readonly monto = computed(() => this.categoriaSeleccionada()?.precio ?? 0);

  readonly minIntegrantes = computed(() => this.categoriaSeleccionada()?.minIntegrantes ?? 1);
  readonly maxIntegrantes = computed(() => this.categoriaSeleccionada()?.maxIntegrantes ?? 1);

  readonly provincias = computed(() => {
    const dep = ubigeoDepartamentos.find(
      (d) => d.departamento === this.responsable().departamento,
    );
    if (!dep) return [];
    return ubigeoProvincias
      .filter((p) => p.departamento_id === dep.id)
      .map((p) => p.provincia);
  });

  readonly distritos = computed(() => {
    const r = this.responsable();
    const dep = ubigeoDepartamentos.find((d) => d.departamento === r.departamento);
    const prov = ubigeoProvincias.find(
      (p) => p.provincia === r.provincia && (!dep || p.departamento_id === dep.id),
    );
    if (!prov) return [];
    return ubigeoDistritos
      .filter((d) => d.provincia_id === prov.id)
      .map((d) => d.distrito);
  });

  /* ============================================================
     VALIDACIONES POR CAMPO (se muestran al intentar continuar)
     ============================================================ */

  /** Datos de contacto (paso 1): nombres, apellidos, dni, teléfono, ubigeo. */
  readonly datosErrores = computed<Errores>(() => {
    const e: Errores = {};
    if (this.intento() !== 1) return e;
    const r = this.responsable();
    if (r.nombres.trim().length < 2) e['nombres'] = 'Ingresa tus nombres (mínimo 2 caracteres).';
    if (r.apellidos.trim().length < 2) e['apellidos'] = 'Ingresa tus apellidos (mínimo 2 caracteres).';
    if (!this.dniRe.test(r.dni)) e['dni'] = 'El DNI debe tener 8 dígitos.';
    if (!r.telefono.trim()) {
      e['telefono'] = 'El teléfono es obligatorio (9 dígitos, empieza con 9).';
    } else if (!this.telRe.test(r.telefono)) {
      e['telefono'] = 'Debe tener 9 dígitos y empezar con 9.';
    }
    if (!r.departamento) e['departamento'] = 'Selecciona tu departamento.';
    if (!r.provincia) e['provincia'] = 'Selecciona tu provincia.';
    if (!r.distrito) e['distrito'] = 'Selecciona tu distrito.';
    return e;
  });

  /** Credenciales de la cuenta (paso 1). */
  readonly credencialesErrores = computed<Errores>(() => {
    const e: Errores = {};
    if (this.intento() !== 1 || this.sesionActiva()) return e;
    const c = this.cuenta();
    if (!c.correo.trim()) {
      e['correo'] = 'El correo es obligatorio.';
    } else if (!this.emailRe.test(c.correo.trim())) {
      e['correo'] = 'El correo no tiene un formato válido.';
    }
    if (c.metodo === 'registro') {
      if (!c.password) {
        e['password'] = 'La contraseña es obligatoria.';
      } else if (!this.passRe.test(c.password)) {
        e['password'] = 'Mínimo 8 caracteres con mayúscula, minúscula y número.';
      }
      if (!c.confirmar) {
        e['confirmar'] = 'Repite la contraseña.';
      } else if (c.password !== c.confirmar) {
        e['confirmar'] = 'Las contraseñas no coinciden.';
      }
    } else if (!c.password) {
      e['password'] = 'Ingresa tu contraseña.';
    }
    return e;
  });

  readonly fuerzaPassword = computed<'debil' | 'media' | 'fuerte' | ''>(() => {
    const p = this.cuenta().password;
    if (!p) return '';
    let puntos = 0;
    if (p.length >= 8) puntos++;
    if (p.length >= 12) puntos++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) puntos++;
    if (/\d/.test(p)) puntos++;
    if (/[^a-zA-Z0-9]/.test(p)) puntos++;
    if (puntos <= 1) return 'debil';
    if (puntos <= 3) return 'media';
    return 'fuerte';
  });

  readonly grupoErrores = computed<Errores>(() => {
    const e: Errores = {};
    if (this.intento() !== 2) return e;
    const g = this.grupo();
    if (!g.eventoId) e['evento'] = 'No hay un evento activo para inscribirse.';
    if (!g.categoriaId) e['categoria'] = 'Selecciona una modalidad.';
    if (g.nombreGrupo.trim().length < 2) {
      e['nombreGrupo'] = 'Ingresa el nombre del grupo (mínimo 2 caracteres).';
    }
    return e;
  });

  readonly participanteErrores = computed<Errores[]>(() => {
    const list = this.participantes();
    return list.map((p) => {
      const e: Errores = {};
      if (this.intento() !== 3) return e;
      if (p.nombres.trim().length < 2) e['nombres'] = 'Obligatorio (mínimo 2 caracteres).';
      if (!p.celular.trim()) {
        e['celular'] = 'El celular es obligatorio (9 dígitos, empieza con 9).';
      } else if (!this.telRe.test(p.celular)) {
        e['celular'] = 'Debe tener 9 dígitos y empezar con 9.';
      }
      return e;
    });
  });

  readonly participantesCountError = computed(() => {
    if (this.intento() !== 3) return '';
    const min = this.minIntegrantes();
    const max = this.maxIntegrantes();
    const n = this.participantes().length;
    if (n < min || n > max) {
      if (min === max) {
        return `Esta modalidad requiere exactamente ${min} ${min === 1 ? 'integrante' : 'integrantes'} (tienes ${n}).`;
      }
      return `Esta modalidad requiere entre ${min} y ${max} integrantes (tienes ${n}).`;
    }
    return '';
  });

  readonly pagoErrores = computed<Errores>(() => {
    const e: Errores = {};
    if (this.intento() !== 4) return e;
    if (!this.numeroOperacion().trim()) {
      e['numeroOperacion'] = 'Ingresa el número de operación de tu Yape.';
    } else if (!/^\d{3,20}$/.test(this.numeroOperacion().trim())) {
      e['numeroOperacion'] = 'El número de operación debe ser numérico (mínimo 3 dígitos).';
    }
    if (!this.comprobanteNombre()) {
      e['comprobante'] = 'Debes subir la foto del voucher (Yape) para confirmar.';
    }
    return e;
  });

  /* ============================================================
     CATÁLOGO
     ============================================================ */

  ngOnInit(): void {
    const codigo = sessionStorage.getItem('chicote-registro-codigo');
    if (codigo) {
      this.resultCodigo.set(codigo);
      this.resultEstado.set(
        sessionStorage.getItem('chicote-registro-estado') ?? 'Pendiente de confirmación',
      );
      this.nombreUsuario.set(sessionStorage.getItem('chicote-registro-nombre') ?? '');
      this.success.set(true);
      return;
    }
    void this.bootstrapSesion();
    this.cargarCatalogo();
  }

  private limpiarWizard(): void {
    sessionStorage.removeItem(InscripcionPublicaPage.WIZARD_KEY);
  }

  nuevaInscripcion(): void {
    sessionStorage.removeItem('chicote-registro-codigo');
    sessionStorage.removeItem('chicote-registro-nombre');
    sessionStorage.removeItem('chicote-registro-estado');
    this.limpiarWizard();
    this.success.set(false);
    this.resultCodigo.set('');
    this.resultEstado.set('Pendiente de confirmación');
    this.nombreUsuario.set('');
    this.cuentaRecienCreada.set(false);
    // Nueva propuesta: se reutiliza el responsable (cuenta), el resto arranca limpio.
    this.grupo.set({ eventoId: '', categoriaId: '', nombreGrupo: '' });
    this.participantes.set([{ nombres: '', celular: '' }]);
    this.numeroOperacion.set('');
    this.comprobanteNombre.set('');
    this.comprobantePreview.set(null);
    this.comprobanteFile.set(null);
    this.comprobanteError.set('');
    this.errorMsg.set('');
    this.intento.set(0);
    this.step.set(2);
    this.cargarCatalogo();
  }

  private async bootstrapSesion(): Promise<void> {
    const u = this.auth.usuario();
    if (!this.auth.isAuthenticated() || !u || this.auth.isAdmin()) {
      this.sesionActiva.set(false);
      return;
    }

    this.sesionActiva.set(true);
    this.usuarioId = u.id;
    this.nombreUsuario.set(u.nombre);
    this.cuenta.update((c) => ({
      ...c,
      metodo: 'login',
      correo: u.correo,
      password: '',
      confirmar: '',
    }));

    // 1) Base: nombre/correo de la cuenta
    this.responsable.set({
      ...this.responsable(),
      ...this.splitNombreCompleto(u.nombre),
      correo: u.correo || this.responsable().correo,
    });

    // 2) Caché local (última inscripción en este dispositivo)
    const cached = this.readResponsableCache();
    if (cached) {
      this.mergeResponsable(cached);
    }

    // 3) Backend: última ficha de responsable del usuario
    try {
      const remoto = await firstValueFrom(this.inscripcionApi.miUltimoResponsable());
      this.mergeResponsable(remoto);
      this.writeResponsableCache(this.responsable());
    } catch {
      if (cached) this.writeResponsableCache(this.responsable());
    }
    this.syncCorreo.set(false);

    // Solo salta el paso 1 si el usuario restauró un wizard avanzado;
    // si no, se queda en el paso 1 para confirmar/completar sus datos.
    if (this.step() <= 1 && this.datosCompletos()) {
      this.step.set(2);
    }
  }

  /** ¿El responsable ya tiene todos los datos obligatorios? */
  readonly datosCompletos = computed(() => {
    const r = this.responsable();
    return (
      r.nombres.trim().length >= 2 &&
      r.apellidos.trim().length >= 2 &&
      this.dniRe.test(r.dni) &&
      this.telRe.test(r.telefono.trim()) &&
      !!r.departamento &&
      !!r.provincia &&
      !!r.distrito
    );
  });

  /** ¿Se debe mostrar el bloque "Tus datos de contacto" en el paso 1? */
  readonly mostrarDatosContacto = computed(() => {
    if (this.cuenta().metodo === 'registro') return true;
    // En login: solo si aún faltan datos (o hay errores por corregir).
    return this.sesionActiva() && (!this.datosCompletos() || this.intento() === 1);
  });

  private splitNombreCompleto(nombre: string): Pick<FormResponsable, 'nombres' | 'apellidos'> {
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return { nombres: '', apellidos: '' };
    if (partes.length === 1) return { nombres: partes[0], apellidos: '' };
    if (partes.length === 2) return { nombres: partes[0], apellidos: partes[1] };
    return {
      nombres: partes.slice(0, -2).join(' '),
      apellidos: partes.slice(-2).join(' '),
    };
  }

  /** Completa o reemplaza campos con datos conocidos (no borra lo ya válido sin motivo). */
  private mergeResponsable(src: Partial<FormResponsable> | Responsable): void {
    this.responsable.update((r) => ({
      nombres: (src.nombres ?? '').trim() || r.nombres,
      apellidos: (src.apellidos ?? '').trim() || r.apellidos,
      dni: (src.dni ?? '').trim() || r.dni,
      telefono: (src.telefono ?? '').trim() || r.telefono,
      correo: (src.correo ?? '').trim() || r.correo,
      departamento: (src.departamento ?? '').trim() || r.departamento,
      provincia: (src.provincia ?? '').trim() || r.provincia,
      distrito: (src.distrito ?? '').trim() || r.distrito,
    }));
  }

  private applyResponsable(remoto: Responsable | FormResponsable): void {
    this.mergeResponsable(remoto);
    this.syncCorreo.set(false);
  }

  private readResponsableCache(): FormResponsable | null {
    // Solo aplica con sesión activa: un visitante anónimo nunca ve
    // datos "autocompletados" de otra sesión pasada.
    if (!this.auth.isAuthenticated() || !this.auth.usuario()) return null;
    try {
      const raw = localStorage.getItem(RESPONSABLE_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as FormResponsable & { usuarioId?: string };
      const uid = this.auth.usuario()?.id;
      if (!uid || (parsed.usuarioId && parsed.usuarioId !== uid)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private writeResponsableCache(r: FormResponsable | Responsable): void {
    try {
      localStorage.setItem(
        RESPONSABLE_CACHE_KEY,
        JSON.stringify({
          usuarioId: this.auth.usuario()?.id ?? this.usuarioId,
          nombres: r.nombres,
          apellidos: r.apellidos,
          dni: r.dni,
          telefono: r.telefono,
          correo: r.correo,
          departamento: r.departamento,
          provincia: r.provincia,
          distrito: r.distrito,
        }),
      );
    } catch {
      /* ignore */
    }
  }

  cerrarSesionWizard(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.sesionActiva.set(false);
        this.usuarioId = '';
        this.step.set(1);
        this.limpiarWizard();
      },
    });
  }

  private cargarCatalogo(): void {
    this.loadingCatalog.set(true);
    // Catálogo en paralelo: eventos y categorías son independientes.
    forkJoin({
      eventos: this.eventoApi.listar(),
      categorias: this.categoriaApi.listar(true),
    }).subscribe({
      next: ({ eventos, categorias }) => {
        this.eventos.set(
          eventos
            .filter((e) => e.estado === 'ACTIVO')
            .map((e) => ({ id: e.id, nombre: e.nombre, fecha: e.fecha })),
        );
        this.categorias.set(categorias);
        this.loadingCatalog.set(false);
        // Un solo evento activo = se selecciona solo (cero fricción).
        const ev = this.eventos()[0];
        if (ev && this.eventos().length === 1) this.patchGrupo({ eventoId: ev.id });
      },
      error: () => this.loadingCatalog.set(false),
    });
  }

  /* ============================================================
     PATCHES
     ============================================================ */

  patchCuenta(partial: Partial<ReturnType<typeof this.cuenta>>): void {
    this.cuenta.update((c) => ({ ...c, ...partial }));
    // En registro el correo de contacto ES el correo de la cuenta.
    if (partial.correo !== undefined && this.cuenta().metodo === 'registro' && this.syncCorreo()) {
      this.responsable.update((r) => ({ ...r, correo: partial.correo as string }));
    }
  }

  patchGrupo(partial: Partial<ReturnType<typeof this.grupo>>): void {
    this.grupo.update((g) => ({ ...g, ...partial }));
  }

  patchResponsable(partial: Partial<ReturnType<typeof this.responsable>>): void {
    this.responsable.update((r) => ({ ...r, ...partial }));
    if ('correo' in partial) this.syncCorreo.set(false);
  }

  onCategoria(id: string): void {
    this.patchGrupo({ categoriaId: id });
    const cat = this.categorias().find((c) => c.id === id);
    if (cat) {
      const { minIntegrantes: min, maxIntegrantes: max } = cat;
      const actual = this.participantes().length;
      if (actual < min) {
        // Agrega los que faltan para el mínimo de la categoría.
        const extra = Array.from({ length: min - actual }, () => ({
          nombres: '',
          celular: '',
        }));
        this.participantes.update((list) => [...list, ...extra]);
      } else if (actual > max) {
        // Al bajar de categoría, recorta los que sobran del máximo.
        this.participantes.update((list) => list.slice(0, max));
      }
    }
  }

  onDepartamento(dep: string): void {
    this.patchResponsable({ departamento: dep, provincia: '', distrito: '' });
  }

  onProvincia(prov: string): void {
    this.patchResponsable({ provincia: prov, distrito: '' });
  }

  /* ============================================================
     MODAL: elegir cantidad de participantes según la modalidad
     ============================================================ */

  readonly modalCantidadAbierto = signal(false);
  readonly cantidadElegida = signal(1);

  abrirModalCantidad(): void {
    const min = this.minIntegrantes();
    this.cantidadElegida.set(Math.min(this.maxIntegrantes(), Math.max(this.participantes().length, min)));
    this.modalCantidadAbierto.set(true);
  }

  cerrarModalCantidad(): void {
    this.modalCantidadAbierto.set(false);
  }

  cambiarCantidad(delta: number): void {
    this.cantidadElegida.update((v) =>
      Math.min(this.maxIntegrantes(), Math.max(this.minIntegrantes(), v + delta)),
    );
  }

  /** Regenera la nómina con la cantidad elegida (conserva lo ya escrito). */
  aplicarCantidad(): void {
    const n = this.cantidadElegida();
    const actuales = this.participantes();
    if (n > actuales.length) {
      const extra = Array.from({ length: n - actuales.length }, () => ({
        nombres: '',
        celular: '',
      }));
      this.participantes.set([...actuales, ...extra]);
    } else {
      this.participantes.set(actuales.slice(0, n));
    }
    this.intento.set(0);
    this.modalCantidadAbierto.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscModal(): void {
    if (this.modalCantidadAbierto()) this.cerrarModalCantidad();
  }

  /* ============================================================
     MODAL: confirmar salto de la nómina de participantes
     ============================================================ */

  readonly modalSaltarAbierto = signal(false);

  abrirModalSaltar(): void {
    this.modalSaltarAbierto.set(true);
  }

  cerrarModalSaltar(): void {
    this.modalSaltarAbierto.set(false);
  }

  /** Confirma el salto: avanza al pago sin nómina (la org la completa). */
  confirmarSalto(): void {
    this.modalSaltarAbierto.set(false);
    this.errorMsg.set('');
    this.intento.set(0);
    this.step.set(4);
  }

  updateParticipante(index: number, partial: Partial<FormParticipante>): void {
    this.participantes.update((list) =>
      list.map((p, i) => (i === index ? { ...p, ...partial } : p)),
    );
  }

  removeParticipante(index: number): void {
    this.participantes.update((list) => list.filter((_, i) => i !== index));
  }

  /* ============================================================
     CONTRASEÑA: generar + mostrar/ocultar
     ============================================================ */

  generarPassword(): void {
    const min = 'abcdefghijkmnopqrstuvwxyz';
    const may = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const num = '23456789';
    const sim = '!@#$%&*_-+';
    const rnd = (pool: string) => pool[Math.floor(Math.random() * pool.length)];
    const pwd =
      rnd(may) +
      rnd(min) +
      rnd(num) +
      Array.from({ length: 11 }, () => rnd(min + may + num + sim)).join('');
    const mezclada = pwd.split('').sort(() => Math.random() - 0.5).join('');
    this.patchCuenta({ password: mezclada, confirmar: mezclada });
    this.mostrarPassword.set(true);
    this.mostrarConfirmar.set(true);
  }

  togglePassword(): void {
    this.mostrarPassword.update((v) => !v);
  }

  toggleConfirmar(): void {
    this.mostrarConfirmar.update((v) => !v);
  }

  /* ============================================================
     NAVEGACIÓN ENTRE PASOS
     ============================================================ */

  prev(): void {
    this.errorMsg.set('');
    this.intento.set(0);
    // El paso 1 es siempre el mínimo: ahí viven cuenta + datos de contacto.
    this.step.update((s) => Math.max(1, s - 1));
  }

  async next(): Promise<void> {
    this.errorMsg.set('');
    const n = this.step();
    this.intento.set(n);

    if (n === 1) {
      if (!this.sesionActiva()) {
        // 1ª fase: credenciales (registro o login).
        if (Object.keys(this.credencialesErrores()).length > 0) return;
        if (!(await this.resolverCuenta())) return;
      }
      // 2ª fase: datos de contacto (ya prellenados tras autenticar).
      if (Object.keys(this.datosErrores()).length > 0) return;
      // Los datos de contacto viven en la cuenta: se sincronizan una vez.
      await this.guardarContactoEnCuenta();
    } else if (n === 2) {
      if (Object.keys(this.grupoErrores()).length > 0) return;
      // Prevalidación temprana: duplicados de grupo/DNI ANTES del pago.
      if (!(await this.prevalidarAntesDePago())) return;
    } else if (n === 3) {
      const tieneErrores = this.participanteErrores().some(
        (er) => Object.keys(er).length > 0,
      );
      if (this.participantesCountError() || tieneErrores) return;
    }

    this.intento.set(0);
    this.step.update((s) => Math.min(4, s + 1));

    // Al entrar a participantes: si la modalidad permite rango, preguntar cuántos son.
    if (this.step() === 3 && this.minIntegrantes() !== this.maxIntegrantes()) {
      queueMicrotask(() => this.abrirModalCantidad());
    }
  }

  /** Guarda el contacto actual en la cuenta (BD). Falla silenciosamente:
   *  la inscripción usa el responsable del formulario de todas formas. */
  private async guardarContactoEnCuenta(): Promise<void> {
    if (!this.sesionActiva() || !this.cuentaRecienSincronizada()) return;
    const r = this.responsable();
    try {
      await firstValueFrom(
        this.usuarioApi.actualizarMiContacto({
          nombre: [r.nombres.trim(), r.apellidos.trim()].filter(Boolean).join(' '),
          dni: r.dni || undefined,
          telefono: r.telefono.trim() || undefined,
          departamento: r.departamento || undefined,
          provincia: r.provincia || undefined,
          distrito: r.distrito || undefined,
        }),
      );
    } catch {
      /* no bloquea el flujo: el responsable del formulario ya es válido */
    }
    this.sincronizacionHecha();
  }

  /** true solo la primera vez tras autenticar/actualizar datos. */
  private contactoSincronizado = false;

  private cuentaRecienSincronizada(): boolean {
    return !this.contactoSincronizado;
  }

  private sincronizacionHecha(): void {
    this.contactoSincronizado = true;
  }

  /** La nómina está completa: toda fila válida y cantidad dentro del rango. */
  readonly nominaCompleta = computed(() => {
    const lista = this.participantes();
    if (lista.length === 0) return false;
    const enRango =
      lista.length >= this.minIntegrantes() && lista.length <= this.maxIntegrantes();
    const todasValidas = lista.every(
      (p) => p.nombres.trim().length >= 2 && this.telRe.test(p.celular.trim()),
    );
    return enRango && todasValidas;
  });

  /**
   * Llama al endpoint de prevalidación del backend con los datos actuales.
   * Se ejecuta al pasar del paso 2 al 3: detecta duplicados de grupo/DNI
   * ANTES del pago. La nómina se envía solo si está completa; si no, se
   * omite (participantes opcionales en el backend).
   */
  private async prevalidarAntesDePago(): Promise<boolean> {
    const g = this.grupo();
    const r = this.responsable();
    const cat = this.categoriaSeleccionada();
    if (!cat) return true;
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.inscripcionApi.prevalidar({
          usuarioId: this.usuarioId || undefined,
          eventoId: g.eventoId,
          categoriaId: cat.id,
          nombreGrupo: g.nombreGrupo.trim(),
          observaciones: '',
          responsable: {
            nombres: r.nombres.trim(),
            apellidos: r.apellidos.trim(),
            dni: r.dni,
            telefono: r.telefono.trim(),
            correo: r.correo.trim(),
            departamento: r.departamento,
            provincia: r.provincia,
            distrito: r.distrito,
          },
          participantes: this.nominaCompleta()
            ? this.participantes().map((p) => ({
                nombres: p.nombres.trim(),
                celular: p.celular.trim(),
              }))
            : undefined,
        }),
      );
      return true;
    } catch (err) {
      this.errorMsg.set((err as Error).message || 'No pudimos validar tus datos. Intenta de nuevo.');
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  private async resolverCuenta(): Promise<boolean> {
    const c = this.cuenta();
    this.saving.set(true);
    try {
      const r = this.responsable();
      if (c.metodo === 'registro') {
        await firstValueFrom(
          this.auth.register({
            nombre: [r.nombres.trim(), r.apellidos.trim()].filter(Boolean).join(' '),
            correo: c.correo.trim(),
            password: c.password,
            // Contacto: se guarda EN la cuenta para no volver a pedirlo nunca.
            dni: r.dni || undefined,
            telefono: r.telefono.trim() || undefined,
            departamento: r.departamento || undefined,
            provincia: r.provincia || undefined,
            distrito: r.distrito || undefined,
          }),
        );
        this.cuentaRecienCreada.set(true);
      } else {
        await firstValueFrom(
          this.auth.loginPublic({ correo: c.correo.trim(), password: c.password }),
        );
      }
      const u = this.auth.usuario();
      if (!u?.id) throw new Error('No se pudo obtener tu cuenta.');
      this.usuarioId = u.id;
      this.nombreUsuario.set(u.nombre);
      this.sesionActiva.set(true);
      if (c.metodo === 'login') {
        // Login: precargar lo que falte desde la cuenta (BD) y la última inscripción.
        this.responsable.update((resp) => ({
          ...resp,
          ...this.splitNombreCompleto(u.nombre || ''),
          dni: resp.dni || (u.dni ?? ''),
          telefono: resp.telefono || (u.telefono ?? ''),
          departamento: resp.departamento || (u.departamento ?? ''),
          provincia: resp.provincia || (u.provincia ?? ''),
          distrito: resp.distrito || (u.distrito ?? ''),
          correo: u.correo || resp.correo,
        }));
      } else {
        // Registro: el correo de contacto es el de la cuenta recién creada.
        this.responsable.update((resp) => ({
          ...resp,
          correo: u.correo || resp.correo,
        }));
      }
      this.saving.set(false);
      try {
        const cached = this.readResponsableCache();
        if (cached) this.mergeResponsable(cached);
        const remoto = await firstValueFrom(this.inscripcionApi.miUltimoResponsable());
        this.mergeResponsable(remoto);
        this.writeResponsableCache(this.responsable());
      } catch {
        this.writeResponsableCache(this.responsable());
      }
      this.syncCorreo.set(false);
      return true;
    } catch (err) {
      this.saving.set(false);
      const msg = (err as Error).message ?? '';
      if (msg.toLowerCase().includes('ya existe un usuario')) {
        this.errorMsg.set(
          'Ese correo ya está registrado. Usa la pestaña "Ya tengo cuenta" para ingresar.',
        );
      } else {
        this.errorMsg.set(msg || 'No se pudo validar tu cuenta. Intenta de nuevo.');
      }
      return false;
    }
  }

  async confirmar(): Promise<void> {
    this.intento.set(4);
    if (Object.keys(this.pagoErrores()).length > 0) return;
    const voucher = this.comprobanteFile();
    if (!voucher) {
      this.comprobanteError.set('Debes subir la foto del voucher (Yape) para confirmar.');
      return;
    }
    if (!this.usuarioId) {
      this.errorMsg.set('Necesitas una sesión activa para completar la inscripción.');
      return;
    }
    this.errorMsg.set('');
    this.saving.set(true);
    let inscripcionIdRegistrada = '';
    try {
      const g = this.grupo();
      const r = this.responsable();
      const categoria = this.categoriaSeleccionada();
      if (!categoria) throw new Error('Selecciona una modalidad.');

      const inscripcion = await new Promise<{ id: string; codigo: string; estado?: string }>(
        (resolve, reject) =>
          this.inscripcionApi
            .crear({
            usuarioId: this.usuarioId,
            eventoId: g.eventoId,
            categoriaId: categoria.id,
            nombreGrupo: g.nombreGrupo.trim(),
            observaciones: '',
            responsable: {
              nombres: r.nombres.trim(),
              apellidos: r.apellidos.trim(),
              dni: r.dni,
              telefono: r.telefono.trim(),
              correo: r.correo.trim(),
              departamento: r.departamento,
              provincia: r.provincia,
              distrito: r.distrito,
            },
            participantes: this.nominaCompleta()
              ? this.participantes().map((p) => ({
                  nombres: p.nombres.trim(),
                  celular: p.celular.trim(),
                }))
              : undefined,
          })
          .subscribe({ next: resolve, error: reject }),
      );

      // La inscripción ya existe: si algo falla después, NO dejamos que el
      // usuario reintente (duplicaría) ni que la pierda.
      inscripcionIdRegistrada = inscripcion.id;
      this.resultCodigo.set(inscripcion.codigo);
      sessionStorage.setItem('chicote-registro-codigo', inscripcion.codigo);
      sessionStorage.setItem('chicote-registro-nombre', this.nombreUsuario() || this.nombreCuenta);
      this.limpiarWizard();

      this.writeResponsableCache(r);

      const pago = await new Promise<{ id: string }>((resolve, reject) =>
        this.pagoApi
          .registrar({
            inscripcionId: inscripcion.id,
            monto: this.monto(),
            metodoPago: 'YAPE',
            numeroOperacion: this.numeroOperacion().trim(),
          })
          .subscribe({ next: resolve, error: reject }),
      );

      await new Promise<void>((resolve, reject) =>
        this.pagoApi.adjuntarComprobante(pago.id, voucher).subscribe({
          next: () => resolve(),
          error: reject,
        }),
      );

      this.resultEstado.set(
        inscripcion.estado === 'CONFIRMADA'
          ? 'Confirmada'
          : inscripcion.estado === 'RECHAZADA'
            ? 'Rechazada'
            : 'Pendiente de confirmación',
      );
      sessionStorage.setItem('chicote-registro-estado', this.resultEstado());
      this.saving.set(false);
      this.success.set(true);
    } catch (err) {
      this.saving.set(false);
      const msg = (err as Error).message || '';
      if (inscripcionIdRegistrada) {
        // Pago/voucher falló pero la inscripción YA existe.
        this.success.set(true);
        this.resultEstado.set('Pendiente de confirmación');
        sessionStorage.setItem('chicote-registro-estado', 'Pendiente de confirmación');
        this.errorMsg.set(
          'Tu inscripción quedó registrada, pero no pudimos guardar el voucher. ' +
            'Vuelve a intentarlo desde "Consultar mi inscripción" o escríbenos por WhatsApp.',
        );
        return;
      }
      this.errorMsg.set(msg || 'No se pudo completar la inscripción.');
    }
  }

  irSeguimiento(): void {
    this.router.navigate(['/seguimiento', this.resultCodigo()]);
  }

  readonly copiado = signal(false);
  private copiadoTimeout: ReturnType<typeof setTimeout> | null = null;

  async copiarCodigo(): Promise<void> {
    const texto = this.resultCodigo();
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    this.copiado.set(true);
    if (this.copiadoTimeout) clearTimeout(this.copiadoTimeout);
    this.copiadoTimeout = setTimeout(() => this.copiado.set(false), 2000);
  }

  estadoPill(): string {
    const e = this.resultEstado();
    if (e === 'Confirmada') return 'is-confirmada';
    if (e === 'Rechazada') return 'is-rechazada';
    return 'is-pendiente';
  }

  readonly yapeNumero = '926 266 295';
  readonly yapeCopiado = signal(false);
  private yapeCopiadoTimeout: ReturnType<typeof setTimeout> | null = null;

  async copiarYape(): Promise<void> {
    await this.copiarTexto(this.yapeNumero.replace(/\s/g, ''));
    this.yapeCopiado.set(true);
    if (this.yapeCopiadoTimeout) clearTimeout(this.yapeCopiadoTimeout);
    this.yapeCopiadoTimeout = setTimeout(() => this.yapeCopiado.set(false), 2000);
  }

  /** Envía el código de inscripción por WhatsApp al propio usuario. */
  enviarCodigoWhatsApp(): void {
    const codigo = this.resultCodigo();
    if (!codigo) return;
    const telefono = this.responsable().telefono.replace(/\D/g, '');
    const texto = encodeURIComponent(
      `Hola! Mi inscripción al Chicote de Oro quedó registrada. Código: ${codigo}`,
    );
    const destino = telefono ? `51${telefono}` : '';
    window.open(
      destino
        ? `https://wa.me/${destino}?text=${texto}`
        : `https://wa.me/51926266295?text=${texto}`,
      '_blank',
      'noopener',
    );
  }

  private async copiarTexto(texto: string): Promise<void> {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  async downloadComprobante(): Promise<void> {
    if (!this.resultCodigo()) return;
    const g = this.grupo();
    const r = this.responsable();
    await descargarComprobantePdf({
      codigo: this.resultCodigo(),
      estado: this.resultEstado(),
      grupo: g.nombreGrupo,
      modalidad: this.categoriaSeleccionada()?.nombre ?? '—',
      evento: this.eventoNombre(),
      responsable: `${r.nombres} ${r.apellidos}`,
      dniResponsable: r.dni,
      telefono: r.telefono,
      correo: r.correo || '—',
      metodoPago: 'YAPE',
      numeroOperacion: this.numeroOperacion() || '—',
      monto: `S/ ${this.monto().toFixed(2)}`,
      integrantes: this.participantes().map((p) => ({
        nombres: p.nombres.trim(),
        celular: p.celular.trim(),
      })),
    });
  }

  protected readonly Number = Number;
  protected readonly onDniInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
  };

  protected readonly onCelularInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 9);
  };
  protected readonly onLettersInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const limpio = input.value.replace(/[^\p{L}\s']/gu, '');
    if (limpio !== input.value) input.value = limpio;
  };

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const esImagen = file.type.startsWith('image/');
    if (!esImagen && file.type !== 'application/pdf') {
      this.comprobanteError.set('Solo se aceptan fotos (JPG/PNG) o PDF.');
      this.comprobanteFile.set(null);
      input.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      this.comprobanteError.set('El archivo supera los 8 MB.');
      this.comprobanteFile.set(null);
      input.value = '';
      return;
    }
    this.comprobanteError.set('');
    this.comprobanteNombre.set(file.name);
    this.comprobanteFile.set(file);
    if (esImagen) {
      const reader = new FileReader();
      reader.onload = () => this.comprobantePreview.set(String(reader.result));
      reader.readAsDataURL(file);
    } else {
      this.comprobantePreview.set(null);
    }
    input.value = '';
  }

  /** Aviso del navegador si el usuario cierra/recarga mientras se guarda. */
  @HostListener('window:beforeunload', ['$event'])
  avisarSalida(e: BeforeUnloadEvent): void {
    if (this.saving()) {
      e.preventDefault();
      e.returnValue = '';
    }
  }
}