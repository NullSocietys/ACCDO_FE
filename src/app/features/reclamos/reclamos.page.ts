import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { EventoApiService } from '../../core/services/api/evento.api.service';
import { ReclamoApiService } from '../../core/services/api/reclamo.api.service';
import { SiteHeaderComponent } from '../../shared/ui/site-header/site-header.component';

interface EventoOption {
  id: string;
  nombre: string;
  fecha: string;
}

const emptyForm = () => ({
  eventoId: '',
  nombreGrupo: '',
  encargadoNombres: '',
  encargadoApellidos: '',
  encargadoDni: '',
  telefono: '',
  correo: '',
  mensaje: '',
});

@Component({
  selector: 'app-reclamos-page',
  imports: [FormsModule, RouterLink, SiteHeaderComponent],
  templateUrl: './reclamos.page.html',
  styleUrl: './reclamos.page.css',
})
export class ReclamosPage {
  private readonly reclamoApi = inject(ReclamoApiService);
  private readonly eventoApi = inject(EventoApiService);
  private readonly route = inject(ActivatedRoute);

  /** Datos precargables desde el wizard de inscripción (?grupo=…). */
  private readonly prefill = (() => {
    const q = this.route.snapshot.queryParamMap;
    return {
      eventoId: q.get('eventoId') ?? '',
      grupo: q.get('grupo') ?? '',
      nombres: q.get('nombres') ?? '',
      apellidos: q.get('apellidos') ?? '',
      dni: q.get('dni') ?? '',
      telefono: q.get('telefono') ?? '',
      correo: q.get('correo') ?? '',
    };
  })();

  readonly eventos = signal<EventoOption[]>([]);
  readonly loadingEventos = signal(true);
  readonly form = signal(emptyForm());
  readonly errores = signal<Record<string, string>>({});
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly errorMsg = signal('');

  constructor() {
    // Prellenado inmediato de campos que no dependen del catálogo.
    const p = this.prefill;
    const patchInicial: Partial<ReturnType<typeof emptyForm>> = {};
    if (p.grupo.trim().length >= 2) patchInicial.nombreGrupo = p.grupo.trim().slice(0, 150);
    if (p.nombres.trim().length >= 2) patchInicial.encargadoNombres = p.nombres.trim().slice(0, 100);
    if (p.apellidos.trim().length >= 2) patchInicial.encargadoApellidos = p.apellidos.trim().slice(0, 100);
    if (/^\d{8}$/.test(p.dni.trim())) patchInicial.encargadoDni = p.dni.trim();
    if (p.telefono.trim()) patchInicial.telefono = p.telefono.trim().slice(0, 20);
    if (p.correo.trim()) patchInicial.correo = p.correo.trim().slice(0, 150);
    if (Object.keys(patchInicial).length) this.patch(patchInicial);

    this.eventoApi.listar().subscribe({
      next: (lista) => {
        const activos = lista
          .filter((e) => e.estado === 'ACTIVO' && e.activo)
          .map((e) => ({ id: e.id, nombre: e.nombre, fecha: e.fecha }));
        this.eventos.set(activos);
        // El evento precargado solo aplica si existe entre los activos.
        const pre = this.prefill.eventoId;
        if (pre && activos.some((e) => e.id === pre)) {
          this.patch({ eventoId: pre });
        } else if (activos.length === 1) {
          this.patch({ eventoId: activos[0].id });
        }
        this.loadingEventos.set(false);
      },
      error: () => {
        this.loadingEventos.set(false);
        this.errorMsg.set('No se pudieron cargar los eventos. Intenta de nuevo más tarde.');
      },
    });
  }

  patch(partial: Partial<ReturnType<typeof emptyForm>>): void {
    this.form.update((f) => ({ ...f, ...partial }));
    const keys = Object.keys(partial);
    if (keys.length) {
      this.errores.update((e) => {
        const next = { ...e };
        for (const k of keys) delete next[k];
        return next;
      });
    }
  }

  private validar(): boolean {
    const f = this.form();
    const err: Record<string, string> = {};

    if (!f.eventoId) err['eventoId'] = 'Selecciona el evento';
    if (f.nombreGrupo.trim().length < 2) err['nombreGrupo'] = 'Mínimo 2 caracteres';
    if (f.encargadoNombres.trim().length < 2) err['encargadoNombres'] = 'Mínimo 2 caracteres';
    if (f.encargadoApellidos.trim().length < 2) err['encargadoApellidos'] = 'Mínimo 2 caracteres';
    if (!/^\d{8}$/.test(f.encargadoDni.trim())) err['encargadoDni'] = 'DNI de 8 dígitos';
    if (f.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo.trim())) {
      err['correo'] = 'Correo no válido';
    }
    if (f.mensaje.trim().length > 1000) err['mensaje'] = 'Máximo 1000 caracteres';

    this.errores.set(err);
    return Object.keys(err).length === 0;
  }

  submit(): void {
    if (this.submitting() || this.submitted()) return;
    this.errorMsg.set('');
    if (!this.validar()) return;

    const f = this.form();
    this.submitting.set(true);

    this.reclamoApi
      .crear({
        eventoId: f.eventoId,
        nombreGrupo: f.nombreGrupo.trim(),
        encargadoNombres: f.encargadoNombres.trim(),
        encargadoApellidos: f.encargadoApellidos.trim(),
        encargadoDni: f.encargadoDni.trim(),
        telefono: f.telefono.trim() || undefined,
        correo: f.correo.trim() || undefined,
        mensaje: f.mensaje.trim() || undefined,
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => this.submitted.set(true),
        error: (err: Error) => {
          this.errorMsg.set(err?.message || 'No se pudo enviar el reclamo');
        },
      });
  }

  nuevoReclamo(): void {
    this.form.set(emptyForm());
    this.errores.set({});
    this.errorMsg.set('');
    this.submitted.set(false);
    const ev = this.eventos();
    if (ev.length === 1) this.patch({ eventoId: ev[0].id });
  }
}
