import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Sexo } from '../../core/models';
import { CategoriaApiService } from '../../core/services/api/categoria.api.service';
import { EventoApiService } from '../../core/services/api/evento.api.service';
import { InscripcionApiService } from '../../core/services/api/inscripcion.api.service';
import { PagoApiService } from '../../core/services/api/pago.api.service';
import { UsuarioApiService } from '../../core/services/api/usuario.api.service';
import { descargarComprobantePdf } from '../../shared/pdf/comprobante.pdf';
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

interface FormCuenta {
  metodo: 'registro' | 'login';
  nombre: string;
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
  apellidos: string;
  dni: string;
  edad: number | null;
  sexo: Sexo | '';
}

type Errores = Record<string, string>;

@Component({
  selector: 'app-inscripcion-publica-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './inscripcion-publica.page.html',
  styleUrls: ['./inscripcion-publica.page.css'],
})
export class InscripcionPublicaPage implements OnInit {
  private readonly router = inject(Router);
  private readonly usuarioApi = inject(UsuarioApiService);
  private readonly eventoApi = inject(EventoApiService);
  private readonly categoriaApi = inject(CategoriaApiService);
  private readonly inscripcionApi = inject(InscripcionApiService);
  private readonly pagoApi = inject(PagoApiService);

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

  readonly eventos = signal<Array<{ id: string; nombre: string; fecha: string }>>([]);
  readonly categorias = signal<
    Array<{ id: string; nombre: string; precio: number; minIntegrantes: number; maxIntegrantes: number }>
  >([]);

  readonly cuenta = signal<FormCuenta>({
    metodo: 'registro',
    nombre: '',
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
    { nombres: '', apellidos: '', dni: '', edad: null, sexo: '' },
  ]);
  readonly numeroOperacion = signal('');
  readonly comprobanteNombre = signal('');
  readonly comprobantePreview = signal<string | null>(null);
  readonly comprobanteError = signal('');
  readonly resultEstado = signal('Pendiente de confirmación');

  private usuarioId = '';
  readonly nombreUsuario = signal('');

  /** Sincronización "nombre completo/email" → responsable: activa hasta editar manual. */
  private readonly syncNombres = signal(true);
  private readonly syncCorreo = signal(true);

  readonly stepMeta = [
    { n: 1, label: 'Cuenta', desc: 'Crea tu cuenta de delegado o inicia sesión' },
    { n: 2, label: 'Modalidad', desc: 'Elige categoría y nombre del grupo' },
    { n: 3, label: 'Responsable', desc: 'Datos de contacto del delegado' },
    { n: 4, label: 'Participantes', desc: 'Nómina de bailarines' },
    { n: 5, label: 'Pago Yape', desc: 'Simula tu pago y confirma' },
  ];

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

  readonly cuentaErrores = computed<Errores>(() => {
    const e: Errores = {};
    if (this.intento() !== 1) return e;
    const c = this.cuenta();
    if (c.metodo === 'registro' && c.nombre.trim().length < 2) {
      e['nombre'] = 'Ingresa tu nombre completo (mínimo 2 caracteres).';
    }
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

  readonly responsableErrores = computed<Errores>(() => {
    const e: Errores = {};
    if (this.intento() !== 3) return e;
    const r = this.responsable();
    if (r.nombres.trim().length < 2) e['nombres'] = 'Obligatorio (mínimo 2 caracteres).';
    if (r.apellidos.trim().length < 2) e['apellidos'] = 'Obligatorio (mínimo 2 caracteres).';
    if (!this.dniRe.test(r.dni)) e['dni'] = 'El DNI debe tener 8 dígitos.';
    if (!r.telefono.trim()) {
      e['telefono'] = 'El teléfono es obligatorio (9 dígitos, empieza con 9).';
    } else if (!this.telRe.test(r.telefono)) {
      e['telefono'] = 'Debe tener 9 dígitos y empezar con 9.';
    }
    if (!r.correo.trim()) {
      e['correoRes'] = 'El correo es obligatorio.';
    } else if (!this.emailRe.test(r.correo.trim())) {
      e['correoRes'] = 'El correo no tiene un formato válido.';
    }
    if (!r.departamento) e['departamento'] = 'Selecciona tu departamento.';
    if (!r.provincia) e['provincia'] = 'Selecciona tu provincia.';
    if (!r.distrito) e['distrito'] = 'Selecciona tu distrito.';
    return e;
  });

  readonly participanteErrores = computed<Errores[]>(() => {
    const list = this.participantes();
    const errores: Errores[] = list.map((p) => {
      const e: Errores = {};
      if (this.intento() !== 4) return e;
      if (p.nombres.trim().length < 2) e['nombres'] = 'Obligatorio (mínimo 2 caracteres).';
      if (p.apellidos.trim().length < 2) e['apellidos'] = 'Obligatorio (mínimo 2 caracteres).';
      if (!this.dniRe.test(p.dni)) e['dni'] = 'El DNI debe tener 8 dígitos.';
      if (!p.edad || p.edad < 3 || p.edad > 120) e['edad'] = 'Entre 3 y 120 años.';
      if (!p.sexo) e['sexo'] = 'Selecciona el sexo.';
      return e;
    });
    if (this.intento() === 4) {
      const porDni = new Map<string, number[]>();
      list.forEach((p, i) => {
        if (!p.dni) return;
        const filas = porDni.get(p.dni) ?? [];
        filas.push(i);
        porDni.set(p.dni, filas);
      });
      for (const [, filas] of porDni) {
        if (filas.length > 1) {
          filas.forEach((i) => {
            errores[i] = { ...errores[i], dni: 'DNI repetido en este grupo.' };
          });
        }
      }
    }
    return errores;
  });

  readonly participantesCountError = computed(() => {
    if (this.intento() !== 4) return '';
    const min = this.minIntegrantes();
    const max = this.maxIntegrantes();
    const n = this.participantes().length;
    if (n < min || n > max) {
      return `Esta modalidad requiere entre ${min} y ${max} integrantes (tienes ${n}).`;
    }
    return '';
  });

  readonly pagoErrores = computed<Errores>(() => {
    const e: Errores = {};
    if (this.intento() !== 5) return e;
    if (!this.numeroOperacion().trim()) {
      e['numeroOperacion'] = 'Ingresa el número de operación de tu Yape.';
    } else if (!/^\d{5,20}$/.test(this.numeroOperacion().trim())) {
      e['numeroOperacion'] = 'El número de operación debe ser numérico (5 a 20 dígitos).';
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
    this.cargarCatalogo();
  }

  nuevaInscripcion(): void {
    sessionStorage.removeItem('chicote-registro-codigo');
    sessionStorage.removeItem('chicote-registro-nombre');
    sessionStorage.removeItem('chicote-registro-estado');
    this.success.set(false);
    this.resultCodigo.set('');
    this.resultEstado.set('Pendiente de confirmación');
    this.nombreUsuario.set('');
    this.step.set(1);
    this.cargarCatalogo();
  }

  private cargarCatalogo(): void {
    this.loadingCatalog.set(true);
    this.eventoApi.listar().subscribe({
      next: (eventos) => {
        this.eventos.set(
          eventos
            .filter((e) => e.estado === 'ACTIVO')
            .map((e) => ({ id: e.id, nombre: e.nombre, fecha: e.fecha })),
        );
        this.categoriaApi.listar(true).subscribe({
          next: (categorias) => {
            this.categorias.set(categorias);
            this.loadingCatalog.set(false);
            const ev = this.eventos()[0];
            if (ev) this.patchGrupo({ eventoId: ev.id });
          },
          error: () => this.loadingCatalog.set(false),
        });
      },
      error: () => this.loadingCatalog.set(false),
    });
  }

  /* ============================================================
     PATCHES
     ============================================================ */

  patchCuenta(partial: Partial<ReturnType<typeof this.cuenta>>): void {
    this.cuenta.update((c) => ({ ...c, ...partial }));
    if (partial.correo !== undefined && this.syncCorreo()) {
      this.responsable.update((r) => ({ ...r, correo: partial.correo as string }));
    }
    if (partial.nombre !== undefined && this.syncNombres()) {
      const partes = (partial.nombre as string).trim().split(/\s+/).filter(Boolean);
      if (partes.length >= 2) {
        const nombres = partes.slice(0, -2).join(' ') || partes[0];
        const apellidos = partes.slice(-2).join(' ');
        this.responsable.update((r) => ({ ...r, nombres, apellidos }));
      }
    }
  }

  patchGrupo(partial: Partial<ReturnType<typeof this.grupo>>): void {
    this.grupo.update((g) => ({ ...g, ...partial }));
  }

  patchResponsable(partial: Partial<ReturnType<typeof this.responsable>>): void {
    this.responsable.update((r) => ({ ...r, ...partial }));
    if ('nombres' in partial || 'apellidos' in partial) this.syncNombres.set(false);
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
          apellidos: '',
          dni: '',
          edad: null as number | null,
          sexo: '' as Sexo | '',
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

  addParticipante(): void {
    this.participantes.update((list) => [
      ...list,
      { nombres: '', apellidos: '', dni: '', edad: null, sexo: '' },
    ]);
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
    this.step.update((s) => Math.max(1, s - 1));
  }

  async next(): Promise<void> {
    this.errorMsg.set('');
    const n = this.step();
    this.intento.set(n);

    if (n === 1) {
      if (Object.keys(this.cuentaErrores()).length > 0) return;
      if (!(await this.resolverCuenta())) return;
    } else if (n === 2) {
      if (Object.keys(this.grupoErrores()).length > 0) return;
    } else if (n === 3) {
      if (Object.keys(this.responsableErrores()).length > 0) return;
    } else if (n === 4) {
      const tieneErrores = this.participanteErrores().some(
        (er) => Object.keys(er).length > 0,
      );
      if (this.participantesCountError() || tieneErrores) return;
    }

    this.intento.set(0);
    this.step.update((s) => Math.min(5, s + 1));
  }

  private async resolverCuenta(): Promise<boolean> {
    const c = this.cuenta();
    this.saving.set(true);
    try {
      const req =
        c.metodo === 'registro'
          ? this.usuarioApi.registrar({
              nombre: c.nombre.trim(),
              correo: c.correo.trim(),
              password: c.password,
            })
          : this.usuarioApi.login({ correo: c.correo.trim(), password: c.password });
      const usuario = await new Promise<{ id: string; nombre: string }>((resolve, reject) =>
        req.subscribe({ next: resolve, error: reject }),
      );
      if (!usuario.id) throw new Error('No se pudo obtener tu cuenta.');
      this.usuarioId = usuario.id;
      this.nombreUsuario.set(usuario.nombre || c.nombre.trim());
      this.saving.set(false);
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
    this.intento.set(5);
    if (Object.keys(this.pagoErrores()).length > 0) return;
    this.errorMsg.set('');
    this.saving.set(true);
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
            participantes: this.participantes().map((p) => ({
              nombres: p.nombres.trim(),
              apellidos: p.apellidos.trim(),
              dni: p.dni,
              edad: p.edad ?? 0,
              sexo: p.sexo as Sexo,
            })),
          })
          .subscribe({ next: resolve, error: reject }),
      );

      await new Promise<void>((resolve, reject) =>
        this.pagoApi
          .registrar({
            inscripcionId: inscripcion.id,
            monto: this.monto(),
            metodoPago: 'YAPE',
            numeroOperacion: this.numeroOperacion().trim(),
            comprobante: this.comprobanteNombre() || undefined,
          })
          .subscribe({ next: () => resolve(), error: reject }),
      );

      this.resultCodigo.set(inscripcion.codigo);
      this.resultEstado.set(
        inscripcion.estado === 'CONFIRMADA'
          ? 'Confirmada'
          : inscripcion.estado === 'RECHAZADA'
            ? 'Rechazada'
            : 'Pendiente de confirmación',
      );
      this.saving.set(false);
      this.success.set(true);
      sessionStorage.setItem('chicote-registro-codigo', inscripcion.codigo);
      sessionStorage.setItem('chicote-registro-nombre', this.cuenta().nombre);
      sessionStorage.setItem('chicote-registro-estado', this.resultEstado());
    } catch (err) {
      this.saving.set(false);
      this.errorMsg.set((err as Error).message || 'No se pudo completar la inscripción.');
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
        nombres: `${p.nombres} ${p.apellidos}`,
        dni: p.dni,
        edad: p.edad != null ? `${p.edad}` : '—',
        sexo: p.sexo,
      })),
    });
  }

  protected readonly Number = Number;
  protected readonly onDniInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
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
      input.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      this.comprobanteError.set('El archivo supera los 8 MB.');
      input.value = '';
      return;
    }
    this.comprobanteError.set('');
    this.comprobanteNombre.set(file.name);
    if (esImagen) {
      const reader = new FileReader();
      reader.onload = () => this.comprobantePreview.set(String(reader.result));
      reader.readAsDataURL(file);
    } else {
      this.comprobantePreview.set(null);
    }
    input.value = '';
  }
}