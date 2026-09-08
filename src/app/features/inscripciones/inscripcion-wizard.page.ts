import { CurrencyPipe, KeyValuePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PagoMetodo } from '../../core/models';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { descargarComprobantePdf } from '../../shared/pdf/comprobante.pdf';
import { IconComponent } from '../../shared/icons/icon.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { CardComponent } from '../../shared/ui/card.component';
import { InputComponent } from '../../shared/ui/input.component';
import { ComboBuscadorComponent } from '../../shared/ui/combo-buscador/combo-buscador.component';
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

interface WizardParticipante {
  nombre: string;
  celular: string;
}

@Component({
  selector: 'app-inscripcion-wizard-page',
  imports: [
    CurrencyPipe,
    KeyValuePipe,
    FormsModule,
    RouterLink,
    IconComponent,
    ButtonComponent,
    CardComponent,
    InputComponent,
    ComboBuscadorComponent,
  ],
  styleUrl: './inscripcion-wizard.page.css',
  templateUrl: './inscripcion-wizard.page.html',
})
export class InscripcionWizardPage {
  private readonly store = inject(DataStoreService);
  private readonly toast = inject(ToastService);

  readonly Number = Number;
  readonly departamentos: string[] = ubigeoDepartamentos.map((d) => d.departamento);

  /** Modalidades reales de la BD (store), con su precio real. */
  readonly categorias = computed(() => this.store.categorias());

  readonly step = signal(1);
  readonly success = signal(false);
  readonly saving = signal(false);
  readonly resultCodigo = signal('');
  readonly resultEstado = signal('Pendiente de confirmación');

  readonly stepMeta = [
    { n: 1, label: 'Grupo', desc: 'Seleccione evento, modalidad y datos del grupo.' },
    { n: 2, label: 'Responsable', desc: 'Datos de contacto del responsable de la inscripción.' },
    { n: 3, label: 'Participantes', desc: 'Agregue la nómina editable de bailarines.' },
    { n: 4, label: 'Pago', desc: 'Resumen, Yape 926 266 295 y comprobante (voucher).' },
  ];

  readonly step1 = signal({
    eventoId: '',
    categoria: '',
    grupo: '',
    cantidadIntegrantes: 0,
  });

  readonly step2 = signal({
    nombres: '',
    apellidos: '',
    dni: '',
    telefono: '',
    correo: '',
    departamento: '',
    provincia: '',
    distrito: '',
  });

  readonly participantes = signal<WizardParticipante[]>([
    { nombre: '', celular: '' },
  ]);

  readonly pago = signal({
    metodo: 'YAPE' as PagoMetodo,
    numeroOperacion: '',
    comprobanteNombre: '',
  });

  readonly comprobantePreview = signal<string | null>(null);
  readonly comprobanteFile = signal<File | null>(null);

  readonly errores1 = signal<Record<string, string>>({});
  readonly errores2 = signal<Record<string, string>>({});
  readonly erroresPago = signal<Record<string, string>>({});
  readonly erroresParticipantes = signal<Record<number, string>>({});
  readonly erroresGlobal = signal<Record<string, string>>({});

  readonly eventosActivos = computed(() =>
    this.store.eventos().filter((e) => e.estado === 'ACTIVO'),
  );

  /** Label legible de un evento: "Nombre · 25 de setiembre de 2026". */
  private labelDeEvento(ev: { nombre: string; fecha: string }): string {
    return `${ev.nombre} - ${this.formatearFecha(ev.fecha)}`;
  }

  readonly eventoLabels = computed(() =>
    this.eventosActivos().map((e) => this.labelDeEvento(e)),
  );

  readonly eventoLabelSeleccionado = computed(() => {
    const ev = this.eventosActivos().find((e) => e.id === this.step1().eventoId);
    return ev ? this.labelDeEvento(ev) : '';
  });

  onEventoLabel(label: string): void {
    const ev = this.eventosActivos().find((e) => this.labelDeEvento(e) === label);
    if (ev) this.patch1({ eventoId: ev.id });
  }

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

  /** Label de modalidad con rango y precio. */
  private labelDeCategoria(cat: { nombre: string; minIntegrantes: number; maxIntegrantes: number; precio: number }): string {
    return `${cat.nombre} (${cat.minIntegrantes}-${cat.maxIntegrantes}) - S/ ${cat.precio}`;
  }

  readonly categoriaLabels = computed(() =>
    this.categorias().map((c) => this.labelDeCategoria(c)),
  );

  readonly monto = computed(() => {
    const cat = this.step1().categoria;
    if (!cat) return 0;
    return this.store.categorias().find((c) => c.nombre === cat)?.precio ?? 0;
  });

  readonly eventoNombre = computed(() => {
    const id = this.step1().eventoId;
    return this.store.eventos().find((e) => e.id === id)?.nombre ?? '—';
  });

  readonly provincias = computed(() => {
    const dep = ubigeoDepartamentos.find(
      (d) => d.departamento === this.step2().departamento,
    );
    if (!dep) return [];
    return ubigeoProvincias
      .filter((p) => p.departamento_id === dep.id)
      .map((p) => p.provincia);
  });

  readonly distritos = computed(() => {
    const dep = ubigeoDepartamentos.find(
      (d) => d.departamento === this.step2().departamento,
    );
    const prov = ubigeoProvincias.find(
      (p) => p.provincia === this.step2().provincia && (!dep || p.departamento_id === dep.id),
    );
    if (!prov) return [];
    return ubigeoDistritos
      .filter((d) => d.provincia_id === prov.id)
      .map((d) => d.distrito);
  });

  readonly categoriaSeleccionada = computed(
    () => this.store.categorias().find((c) => c.nombre === this.step1().categoria) ?? null,
  );

  /** Valores de integrantes permitidos por la modalidad (según las bases): exacto o rango. */
  readonly cantidadesPermitidas = computed<number[]>(() => {
    const cat = this.categoriaSeleccionada();
    if (!cat) return [];
    const list: number[] = [];
    for (let n = cat.minIntegrantes; n <= cat.maxIntegrantes; n++) list.push(n);
    return list;
  });

  readonly ayudaIntegrantes = computed(() => {
    const cat = this.categoriaSeleccionada();
    if (!cat) return 'Elija una modalidad para ver la cantidad permitida según las bases.';
    if (cat.minIntegrantes === cat.maxIntegrantes) {
      const unidad = cat.minIntegrantes === 1 ? 'integrante' : 'integrantes';
      return `Esta modalidad permite exactamente ${cat.minIntegrantes} ${unidad} (ni más ni menos).`;
    }
    return `Esta modalidad permite entre ${cat.minIntegrantes} y ${cat.maxIntegrantes} integrantes según las bases.`;
  });

  patch1(partial: Partial<ReturnType<typeof this.step1>>): void {
    this.step1.update((s) => ({ ...s, ...partial }));
    this.errores1.update((e) => this.clearKey(e, Object.keys(partial)[0]));
  }

  patch2(partial: Partial<ReturnType<typeof this.step2>>): void {
    this.step2.update((s) => ({ ...s, ...partial }));
    this.errores2.update((e) => this.clearKey(e, Object.keys(partial)[0]));
  }

  patchPago(partial: Partial<ReturnType<typeof this.pago>>): void {
    this.pago.update((s) => ({ ...s, ...partial }));
    this.erroresPago.update((e) => this.clearKey(e, Object.keys(partial)[0]));
  }

  private clearKey(errores: Record<string, string>, clave?: string): Record<string, string> {
    if (!clave) return errores;
    const nuevo = { ...errores };
    delete nuevo[clave];
    return nuevo;
  }

  onCategoria(cat: string): void {
    const c = this.store.categorias().find((x) => x.nombre === cat);
    if (c && c.minIntegrantes === c.maxIntegrantes) {
      this.patch1({ categoria: cat, cantidadIntegrantes: c.minIntegrantes });
      return;
    }
    this.patch1({ categoria: cat });
  }

  onDepartamento(dep: string): void {
    this.patch2({ departamento: dep, provincia: '', distrito: '' });
  }

  onProvincia(prov: string): void {
    this.patch2({ provincia: prov, distrito: '' });
  }

  addParticipante(): void {
    const max = this.step1().cantidadIntegrantes;
    if (max > 0 && this.participantes().length >= max) {
      this.toast.warning('Ya se alcanzó la cantidad permitida por la modalidad');
      return;
    }
    this.participantes.update((list) => [
      ...list,
      { nombre: '', celular: '' },
    ]);
  }

  /** Al entrar al paso 3, deja exactamente tantas filas como la cantidad elegida. */
  private asegurarFilas(): void {
    const necesario = this.step1().cantidadIntegrantes;
    if (necesario < 1) return;
    this.participantes.update((list) => {
      const faltantes = necesario - list.length;
      if (faltantes <= 0) return list;
      const nuevas = Array.from({ length: faltantes }, (): WizardParticipante => ({
        nombre: '',
        celular: '',
      }));
      return [...list, ...nuevas];
    });
  }

  celularParticipante(event: Event, index: number): void {
    const el = event.target as HTMLInputElement;
    const limpio = el.value.replace(/\D/g, '').slice(0, 9);
    if (limpio !== el.value) el.value = limpio;
    this.updateParticipante(index, { celular: limpio });
  }

  updateParticipante(index: number, partial: Partial<WizardParticipante>): void {
    this.participantes.update((list) =>
      list.map((p, i) => (i === index ? { ...p, ...partial } : p)),
    );
    this.erroresParticipantes.update((e) => {
      const nuevo = { ...e };
      delete nuevo[index];
      return nuevo;
    });
  }

  removeParticipante(index: number): void {
    this.participantes.update((list) => list.filter((_, i) => i !== index));
    this.erroresParticipantes.set({});
    this.erroresGlobal.set({});
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const tipo = file.type;
    const esImagen = tipo.startsWith('image/');
    if (!esImagen && tipo !== 'application/pdf') {
      this.erroresPago.set({
        ...this.erroresPago(),
        comprobante: 'Solo se aceptan fotos (JPG/PNG) o PDF.',
      });
      input.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      this.erroresPago.set({
        ...this.erroresPago(),
        comprobante: 'El archivo supera los 8 MB.',
      });
      input.value = '';
      return;
    }
    this.erroresPago.update((e) => {
      const nuevo = { ...e };
      delete nuevo['comprobante'];
      return nuevo;
    });
    this.comprobanteFile.set(file);
    this.patchPago({ comprobanteNombre: file.name });
    if (esImagen) {
      const reader = new FileReader();
      reader.onload = () => this.comprobantePreview.set(String(reader.result));
      reader.readAsDataURL(file);
    } else {
      this.comprobantePreview.set(null);
    }
    input.value = '';
  }

  prev(): void {
    this.step.update((s) => Math.max(1, s - 1));
  }

  next(): void {
    if (!this.validateStep(this.step())) return;
    const siguiente = Math.min(4, this.step() + 1);
    if (siguiente === 3) this.asegurarFilas();
    this.step.set(siguiente);
  }

  validateStep(n: number): boolean {
    if (n === 1) {
      const s = this.step1();
      const e: Record<string, string> = {};
      if (!s.eventoId) e['eventoId'] = 'Selecciona un evento.';
      if (!s.categoria) e['categoria'] = 'Selecciona una modalidad.';
      if (!s.grupo.trim()) e['grupo'] = 'El nombre del grupo es obligatorio.';
      else if (s.grupo.trim().length < 2) e['grupo'] = 'Mínimo 2 caracteres.';
      if (!s.cantidadIntegrantes || s.cantidadIntegrantes < 1) {
        e['cantidadIntegrantes'] = 'Selecciona la cantidad de integrantes.';
      } else {
        const cat = this.store.categorias().find((c) => c.nombre === s.categoria);
        if (cat && s.cantidadIntegrantes < cat.minIntegrantes) {
          e['cantidadIntegrantes'] = `Esta modalidad requiere entre ${cat.minIntegrantes} y ${cat.maxIntegrantes} integrantes.`;
        } else if (cat && s.cantidadIntegrantes > cat.maxIntegrantes) {
          e['cantidadIntegrantes'] = `Esta modalidad requiere entre ${cat.minIntegrantes} y ${cat.maxIntegrantes} integrantes.`;
        }
      }
      this.errores1.set(e);
      return Object.keys(e).length === 0;
    }
    if (n === 2) {
      const s = this.step2();
      const e: Record<string, string> = {};
      if (!s.nombres.trim()) e['nombres'] = 'Los nombres son obligatorios.';
      if (!s.apellidos.trim()) e['apellidos'] = 'Los apellidos son obligatorios.';
      if (!s.dni) e['dni'] = 'El DNI es obligatorio.';
      else if (!/^\d{8}$/.test(s.dni)) e['dni'] = 'El DNI debe tener 8 dígitos.';
      if (!s.telefono) e['telefono'] = 'El teléfono es obligatorio.';
      else if (!/^9\d{8}$/.test(s.telefono)) e['telefono'] = 'Debe tener 9 dígitos y empezar con 9.';
      if (!s.correo.trim()) e['correo'] = 'El correo es obligatorio.';
      else if (!/^\S+@\S+\.\S+$/.test(s.correo.trim())) e['correo'] = 'Correo no válido.';
      this.errores2.set(e);
      return Object.keys(e).length === 0;
    }
    if (n === 3) {
      const list = this.participantes();
      const porFila: Record<number, string> = {};
      list.forEach((p, i) => {
        if (!p.nombre.trim() || p.nombre.trim().length < 2) {
          porFila[i] = 'El nombre es obligatorio (mínimo 2 caracteres).';
        } else if (!/^9\d{8}$/.test(p.celular)) {
          porFila[i] = 'Celular: 9 dígitos y debe empezar con 9.';
        }
      });
      this.erroresParticipantes.set(porFila);

      const global: Record<string, string> = {};
      const declarado = this.step1().cantidadIntegrantes;
      if (declarado && list.length !== declarado) {
        global['integrantes'] =
          `La cantidad de integrantes (${
            declarado
          }) debe coincidir con los participantes agregados (${list.length}).`;
      }
      this.erroresGlobal.set(global);

      return Object.keys(porFila).length === 0 && Object.keys(global).length === 0;
    }
    if (n === 4) {
      const e: Record<string, string> = {};
      if (this.pago().metodo !== 'EFECTIVO' && !this.pago().numeroOperacion.trim()) {
        e['numeroOperacion'] = 'Ingresa el número de operación.';
      }
      if (!this.pago().comprobanteNombre) {
        e['comprobante'] =
          'Debes subir la foto del voucher (Yape) para registrar la inscripción.';
      }
      this.erroresPago.set(e);
      return Object.keys(e).length === 0;
    }
    return true;
  }

  async submit(): Promise<void> {
    if (!this.validateStep(4)) {
      this.toast.warning('Revisa los campos marcados antes de registrar');
      return;
    }
    const pagoForm = this.pago();
    this.saving.set(true);
    try {
      const s1 = this.step1();
      const s2 = this.step2();
      const categoria = this.store.categorias().find((c) => c.nombre === s1.categoria);
      if (!categoria) {
        this.toast.error('La modalidad seleccionada no existe en el sistema');
        this.saving.set(false);
        return;
      }
      const usuarioId = this.store.usuarios()[0]?.id ?? null;
      if (!usuarioId) {
        this.toast.error('No hay un usuario delegado registrado');
        this.saving.set(false);
        return;
      }

      const inscripcion = await this.store.crearInscripcion(
        {
          usuarioId,
          eventoId: s1.eventoId,
          categoriaId: categoria.id,
          nombreGrupo: s1.grupo,
          observaciones: '',
          responsable: {
            nombres: s2.nombres,
            apellidos: s2.apellidos,
            dni: s2.dni,
            telefono: s2.telefono,
            correo: s2.correo,
            departamento: s2.departamento,
            provincia: s2.provincia,
            distrito: s2.distrito,
          },
          participantes: this.participantes().map((p) => ({
            nombres: p.nombre.trim(),
            celular: p.celular.trim(),
          })),
        },
        {
          monto: this.monto(),
          metodoPago: this.pago().metodo,
          numeroOperacion: this.pago().numeroOperacion,
        },
        this.comprobanteFile(),
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
      this.toast.success('Inscripción registrada', inscripcion.codigo);
    } catch (err) {
      this.saving.set(false);
      this.toast.error('No se pudo registrar la inscripción', (err as Error).message);
    }
  }

  async downloadComprobante(): Promise<void> {
    if (!this.resultCodigo()) return;
    const s1 = this.step1();
    const s2 = this.step2();
    await descargarComprobantePdf({
      codigo: this.resultCodigo(),
      estado: this.resultEstado(),
      grupo: s1.grupo,
      modalidad: s1.categoria,
      evento: this.eventoNombre(),
      responsable: `${s2.nombres} ${s2.apellidos}`,
      dniResponsable: s2.dni,
      telefono: s2.telefono,
      correo: s2.correo || '—',
      metodoPago: this.pago().metodo,
      numeroOperacion: this.pago().numeroOperacion || '—',
      monto: `S/ ${this.monto().toFixed(2)}`,
      integrantes: this.participantes().map((p) => ({
        nombres: p.nombre.trim(),
        celular: p.celular.trim(),
      })),
    });
    this.toast.success('Comprobante descargado', `${this.resultCodigo()}.pdf`);
  }
}
