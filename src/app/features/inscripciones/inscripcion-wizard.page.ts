import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  DEPARTAMENTOS,
  DISTRITOS,
  PROVINCIAS,
} from '../../core/data/mock-data';
import { PagoMetodo, Sexo } from '../../core/models';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { CardComponent } from '../../shared/ui/card.component';
import { InputComponent } from '../../shared/ui/input.component';

interface WizardParticipante {
  nombre: string;
  apellido: string;
  dni: string;
  edad: number | null;
  sexo: Sexo | '';
}

@Component({
  selector: 'app-inscripcion-wizard-page',
  imports: [
    CurrencyPipe,
    FormsModule,
    RouterLink,
    IconComponent,
    ButtonComponent,
    CardComponent,
    InputComponent,
  ],
  styleUrl: './inscripcion-wizard.page.css',
  templateUrl: './inscripcion-wizard.page.html',
})
export class InscripcionWizardPage {
  private readonly store = inject(DataStoreService);
  private readonly toast = inject(ToastService);

  readonly Number = Number;
  readonly departamentos = DEPARTAMENTOS;

  /** Modalidades reales de la BD (store), con su precio real. */
  readonly categorias = computed(() => this.store.categorias());

  readonly step = signal(1);
  readonly success = signal(false);
  readonly saving = signal(false);
  readonly resultCodigo = signal('');

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
    { nombre: '', apellido: '', dni: '', edad: null, sexo: '' },
  ]);

  readonly pago = signal({
    metodo: 'YAPE' as PagoMetodo,
    numeroOperacion: '',
    comprobanteNombre: '',
  });

  readonly eventosActivos = computed(() =>
    this.store.eventos().filter((e) => e.estado === 'ACTIVO' || e.estado === 'PROXIMO'),
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

  readonly provincias = computed(() => PROVINCIAS[this.step2().departamento] ?? []);
  readonly distritos = computed(
    () => DISTRITOS[this.step2().provincia] ?? DISTRITOS[this.step2().departamento] ?? [],
  );

  patch1(partial: Partial<ReturnType<typeof this.step1>>): void {
    this.step1.update((s) => ({ ...s, ...partial }));
  }

  patch2(partial: Partial<ReturnType<typeof this.step2>>): void {
    this.step2.update((s) => ({ ...s, ...partial }));
  }

  patchPago(partial: Partial<ReturnType<typeof this.pago>>): void {
    this.pago.update((s) => ({ ...s, ...partial }));
  }

  onCategoria(cat: string): void {
    this.patch1({ categoria: cat });
  }

  onDepartamento(dep: string): void {
    this.patch2({ departamento: dep, provincia: '', distrito: '' });
  }

  onProvincia(prov: string): void {
    this.patch2({ provincia: prov, distrito: '' });
  }

  addParticipante(): void {
    this.participantes.update((list) => [
      ...list,
      { nombre: '', apellido: '', dni: '', edad: null, sexo: '' },
    ]);
  }

  updateParticipante(index: number, partial: Partial<WizardParticipante>): void {
    this.participantes.update((list) =>
      list.map((p, i) => (i === index ? { ...p, ...partial } : p)),
    );
  }

  removeParticipante(index: number): void {
    this.participantes.update((list) => list.filter((_, i) => i !== index));
  }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.patchPago({ comprobanteNombre: file.name });
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
      const s = this.step1();
      if (!s.eventoId || !s.categoria || !s.grupo || !s.cantidadIntegrantes) {
        this.toast.warning('Complete los datos del grupo');
        return false;
      }
    }
    if (n === 2) {
      const s = this.step2();
      if (!s.nombres || !s.apellidos || !s.dni || !s.telefono || !s.correo) {
        this.toast.warning('Complete los datos del responsable');
        return false;
      }
    }
    if (n === 3) {
      const list = this.participantes();
      if (
        list.length === 0 ||
        list.some((p) => !p.nombre || !p.apellido || !p.dni || !p.edad || !p.sexo)
      ) {
        this.toast.warning('Complete la nómina de participantes');
        return false;
      }
    }
    return true;
  }

  async submit(): Promise<void> {
    if (!this.validateStep(4)) return;
    const pagoForm = this.pago();
    if (!pagoForm.numeroOperacion && pagoForm.metodo !== 'EFECTIVO') {
      this.toast.warning('Ingrese el número de operación');
      return;
    }
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
            nombres: p.nombre,
            apellidos: p.apellido,
            dni: p.dni,
            edad: p.edad ?? 0,
            sexo: p.sexo as Sexo,
          })),
        },
        {
          monto: this.monto(),
          metodoPago: this.pago().metodo,
          numeroOperacion: this.pago().numeroOperacion,
          comprobante: this.pago().comprobanteNombre || undefined,
        },
      );

      this.resultCodigo.set(inscripcion.codigo);
      this.saving.set(false);
      this.success.set(true);
      this.toast.success('Inscripción registrada', inscripcion.codigo);
    } catch (err) {
      this.saving.set(false);
      this.toast.error('No se pudo registrar la inscripción', (err as Error).message);
    }
  }

  downloadComprobante(): void {
    this.toast.info('Descarga simulada', `Comprobante ${this.resultCodigo()}.pdf`);
  }
}
