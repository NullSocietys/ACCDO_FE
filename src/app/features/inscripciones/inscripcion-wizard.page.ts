import { CurrencyPipe, KeyValuePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PagoMetodo } from '../../core/models';
import { AgrupacionApiService } from '../../core/services/api/agrupacion.api.service';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { descargarComprobantePdf } from '../../shared/pdf/comprobante.pdf';
import { IconComponent } from '../../shared/icons/icon.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { CardComponent } from '../../shared/ui/card.component';
import { InputComponent } from '../../shared/ui/input.component';
import { ComboBuscadorComponent } from '../../shared/ui/combo-buscador/combo-buscador.component';

interface WizardParticipante {
  nombre: string;
  celular: string;
}

interface ClienteItem {
  id: string;
  nombre: string;
  correo: string;
  dni: string;
  telefono: string;
  departamento: string;
  provincia: string;
  distrito: string;
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
  private readonly agrupacionApi = inject(AgrupacionApiService);
  private readonly toast = inject(ToastService);

  readonly Number = Number;
  readonly Boolean = Boolean;

  /** Modalidades reales de la BD (store), con su precio real. */
  readonly categorias = computed(() => this.store.categorias());

  /** Solo cuentas CLIENTE activas: una inscripción siempre nace de un responsable con grupo. */
  readonly clientes = computed<ClienteItem[]>(() =>
    this.store
      .usuarios()
      .filter(
        (u) =>
          u.activo &&
          (u.roles ?? []).includes('CLIENTE') &&
          !(u.roles ?? []).includes('ADMIN'),
      )
      .map((u) => ({
        id: u.id,
        nombre: u.nombre,
        correo: u.correo,
        dni: u.dni ?? '',
        telefono: u.telefono ?? '',
        departamento: u.departamento ?? '',
        provincia: u.provincia ?? '',
        distrito: u.distrito ?? '',
      })),
  );

  readonly step = signal(1);
  readonly success = signal(false);
  readonly saving = signal(false);
  readonly resultCodigo = signal('');
  readonly resultEstado = signal('Pendiente de confirmación');
  readonly resultGrupo = signal('');
  readonly resultModalidad = signal('');

  readonly stepMeta = [
    { n: 1, label: 'Responsable', desc: 'Selecciona la cuenta CLIENTE; el grupo sale de su cuenta.' },
    { n: 2, label: 'Evento y modalidad', desc: 'Elige el evento y la modalidad a inscribir.' },
    { n: 3, label: 'Participantes', desc: 'Registra la nómina que competirá.' },
    { n: 4, label: 'Resumen y pago', desc: 'Revisa y registra el comprobante de pago.' },
  ];

  readonly clienteBusqueda = signal('');
  readonly clienteSeleccionado = signal<ClienteItem | null>(null);
  readonly agrupacionNombre = signal('');
  readonly cargandoGrupo = signal(false);

  readonly step2 = signal({
    eventoId: '',
    categoriaId: '',
    cantidadIntegrantes: 0,
  });

  readonly participantes = signal<WizardParticipante[]>([]);

  readonly pago = signal({
    metodo: 'YAPE' as PagoMetodo,
    numeroOperacion: '',
    comprobanteNombre: '',
  });

  readonly comprobantePreview = signal<string | null>(null);
  readonly comprobanteFile = signal<File | null>(null);

  readonly erroresCliente = signal<Record<string, string>>({});
  readonly errores2 = signal<Record<string, string>>({});
  readonly erroresPago = signal<Record<string, string>>({});
  readonly erroresParticipantes = signal<Record<number, string>>({});
  readonly erroresGlobal = signal<Record<string, string>>({});

  readonly eventosActivos = computed(() =>
    this.store.eventos().filter((e) => e.estado === 'ACTIVO'),
  );

  /** Label legible de un evento: "Nombre - 25 de setiembre de 2026". */
  private labelDeEvento(ev: { nombre: string; fecha: string }): string {
    return `${ev.nombre} - ${this.formatearFecha(ev.fecha)}`;
  }

  readonly eventoLabels = computed(() =>
    this.eventosActivos().map((e) => this.labelDeEvento(e)),
  );

  readonly eventoLabelSeleccionado = computed(() => {
    const ev = this.eventosActivos().find((e) => e.id === this.step2().eventoId);
    return ev ? this.labelDeEvento(ev) : '';
  });

  onEventoLabel(label: string): void {
    const ev = this.eventosActivos().find((e) => this.labelDeEvento(e) === label);
    if (ev) this.patch2({ eventoId: ev.id, categoriaId: '', cantidadIntegrantes: 0 });
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
  private labelDeCategoria(cat: {
    nombre: string;
    minIntegrantes: number;
    maxIntegrantes: number;
    precio: number;
  }): string {
    return `${cat.nombre} (${cat.minIntegrantes}-${cat.maxIntegrantes}) - S/ ${cat.precio}`;
  }

  readonly categoriaLabels = computed(() =>
    this.categorias().map((c) => this.labelDeCategoria(c)),
  );

  readonly categoriaLabelSeleccionado = computed(() => {
    const cat = this.categorias().find((c) => c.id === this.step2().categoriaId);
    return cat ? this.labelDeCategoria(cat) : '';
  });

  readonly categoriaSeleccionada = computed(
    () => this.categorias().find((c) => c.id === this.step2().categoriaId) ?? null,
  );

  /** El monto SIEMPRE sale de la modalidad: nunca se escribe a mano. */
  readonly monto = computed(() => this.categoriaSeleccionada()?.precio ?? 0);

  readonly eventoNombre = computed(() => {
    const id = this.step2().eventoId;
    return this.store.eventos().find((e) => e.id === id)?.nombre ?? '—';
  });

  /** Valores de integrantes permitidos por la modalidad (según las bases). */
  readonly cantidadesPermitidas = computed<number[]>(() => {
    const cat = this.categoriaSeleccionada();
    if (!cat) return [];
    const list: number[] = [];
    for (let n = cat.minIntegrantes; n <= cat.maxIntegrantes; n++) list.push(n);
    return list;
  });

  readonly ayudaIntegrantes = computed(() => {
    const cat = this.categoriaSeleccionada();
    if (!cat) return 'Opcional: puedes declarar la cantidad prevista o agregar la nómina en el siguiente paso.';
    if (cat.minIntegrantes === cat.maxIntegrantes) {
      const unidad = cat.minIntegrantes === 1 ? 'integrante' : 'integrantes';
      return `Esta modalidad permite exactamente ${cat.minIntegrantes} ${unidad}.`;
    }
    return `Esta modalidad permite máximo ${cat.maxIntegrantes} (mínimo ${cat.minIntegrantes}) según las bases.`;
  });

  readonly clientesFiltrados = computed(() => {
    const q = this.clienteBusqueda().trim().toLowerCase();
    if (!q) return this.clientes();
    return this.clientes().filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.correo.toLowerCase().includes(q) ||
        c.dni.includes(q),
    );
  });

  async seleccionarCliente(cliente: ClienteItem): Promise<void> {
    this.clienteSeleccionado.set(cliente);
    this.erroresCliente.set({});
    this.agrupacionNombre.set('');
    this.cargandoGrupo.set(true);
    try {
      const agrupacion = await firstValueFrom(
        this.agrupacionApi.obtenerDeUsuario(cliente.id),
      );
      this.agrupacionNombre.set(agrupacion?.nombre ?? '');
    } catch {
      this.agrupacionNombre.set('');
    } finally {
      this.cargandoGrupo.set(false);
    }
  }

  private clearKey(errores: Record<string, string>, clave?: string): Record<string, string> {
    if (!clave) return errores;
    const nuevo = { ...errores };
    delete nuevo[clave];
    return nuevo;
  }

  patch2(partial: Partial<ReturnType<typeof this.step2>>): void {
    this.step2.update((s) => ({ ...s, ...partial }));
    this.errores2.update((e) => this.clearKey(e, Object.keys(partial)[0]));
  }

  patchPago(partial: Partial<ReturnType<typeof this.pago>>): void {
    this.pago.update((s) => ({ ...s, ...partial }));
    this.erroresPago.update((e) => this.clearKey(e, Object.keys(partial)[0]));
  }

  onCategoria(label: string): void {
    // El combo emite el label completo ("Pareja Libre (2-2) - S/ 80").
    // Buscamos la categoría cuyo label coincida para obtener el id real.
    const c = this.categorias().find((x) => this.labelDeCategoria(x) === label);
    if (!c) return;
    this.patch2({ categoriaId: c.id, cantidadIntegrantes: 0 });
    // La nómina arranca vacía: el admin agrega solo los participantes que desee.
    this.participantes.set([]);
  }

  /** Al cambiar la cantidad declarada, la nómina queda como esté. */
  onCantidadChange(cantidad: number): void {
    this.patch2({ cantidadIntegrantes: cantidad });
  }

  addParticipante(): void {
    const max = this.categoriaSeleccionada()?.maxIntegrantes ?? 0;
    if (max > 0 && this.participantes().length >= max) {
      this.toast.warning('Ya se alcanzó la cantidad permitida por la modalidad');
      return;
    }
    this.participantes.update((list) => [...list, { nombre: '', celular: '' }]);
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
      this.erroresPago.set({ ...this.erroresPago(), comprobante: 'Solo se aceptan fotos (JPG/PNG) o PDF.' });
      input.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      this.erroresPago.set({ ...this.erroresPago(), comprobante: 'El archivo supera los 8 MB.' });
      input.value = '';
      return;
    }
    this.erroresPago.update((e) => {
      const n = { ...e };
      delete n['comprobante'];
      return n;
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
    this.step.update((s) => Math.min(4, s + 1));
  }

  validateStep(n: number): boolean {
    if (n === 1) {
      const e: Record<string, string> = {};
      if (!this.clienteSeleccionado()) {
        e['cliente'] = 'Selecciona la cuenta CLIENTE responsable.';
      }
      this.erroresCliente.set(e);
      return Object.keys(e).length === 0;
    }
    if (n === 2) {
      const s = this.step2();
      const e: Record<string, string> = {};
      if (!s.eventoId) e['eventoId'] = 'Selecciona un evento.';
      if (!s.categoriaId) e['categoriaId'] = 'Selecciona una modalidad.';
      this.errores2.set(e);
      return Object.keys(e).length === 0;
    }
    if (n === 3) {
      const list = this.participantes();
      const porFila: Record<number, string> = {};
      list.forEach((p, i) => {
        // Fila totalmente vacía = "no añadida": se ignora.
        const vacia = !p.nombre.trim() && !p.celular.trim();
        if (vacia) return;
        if (!p.nombre.trim() || p.nombre.trim().length < 2) {
          porFila[i] = 'El nombre es obligatorio (mínimo 2 caracteres).';
        } else if (!/^9\d{8}$/.test(p.celular)) {
          porFila[i] = 'Celular: 9 dígitos y debe empezar con 9.';
        }
      });
      this.erroresParticipantes.set(porFila);

      // La nómina es opcional: no se exige mínimo. Solo importa que las
      // filas añadidas estén completas y no superen el máximo de la modalidad.
      this.erroresGlobal.set({});

      return Object.keys(porFila).length === 0;
    }
    if (n === 4) {
      const e: Record<string, string> = {};
      if (this.pago().metodo !== 'EFECTIVO' && !this.pago().numeroOperacion.trim()) {
        e['numeroOperacion'] = 'Ingresa el número de operación.';
      }
      if (!this.pago().comprobanteNombre) {
        e['comprobante'] = 'Debes subir el comprobante de pago.';
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
    const cliente = this.clienteSeleccionado();
    const categoria = this.categoriaSeleccionada();
    if (!cliente || !categoria) {
      this.toast.error('Falta seleccionar responsable o modalidad');
      return;
    }
    this.saving.set(true);
    try {
      const inscripcion = await this.store.crearInscripcion(
        {
          usuarioId: cliente.id,
          eventoId: this.step2().eventoId,
          categoriaId: categoria.id,
          cantidadParticipantes: this.participantes().length,
          observaciones: '',
          // Solo las filas completas se envían; las vacías se descartan.
          participantes: this.participantes()
            .filter((p) => p.nombre.trim() || p.celular.trim())
            .map((p) => ({
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
      this.resultGrupo.set(this.agrupacionNombre());
      this.resultModalidad.set(categoria.nombre);
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
    const cliente = this.clienteSeleccionado();
    await descargarComprobantePdf({
      codigo: this.resultCodigo(),
      estado: this.resultEstado(),
      grupo: this.resultGrupo(),
      modalidad: this.resultModalidad(),
      evento: this.eventoNombre(),
      responsable: cliente?.nombre ?? '—',
      dniResponsable: cliente?.dni ?? '—',
      telefono: cliente?.telefono ?? '—',
      correo: cliente?.correo ?? '—',
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
