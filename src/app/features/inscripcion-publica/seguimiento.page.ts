import { Component, inject, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { InscripcionApiService } from '../../core/services/api/inscripcion.api.service';
import { PagoApiService } from '../../core/services/api/pago.api.service';
import { ParticipanteApiService } from '../../core/services/api/participante.api.service';
import { SiteHeaderComponent } from '../../shared/ui/site-header/site-header.component';

interface SeguimientoPago {
  monto: number;
  metodoPago: string;
  numeroOperacion: string;
  estado: string;
  observaciones?: string | null;
  createdAt: string;
}

interface SeguimientoData {
  codigo: string;
  nombreGrupo: string;
  estado: string;
  total: number;
  fecha: string;
  observaciones?: string | null;
  participantes: Array<{ nombres: string; celular: string }>;
  pagos: SeguimientoPago[];
}

@Component({
  selector: 'app-seguimiento-page',
  standalone: true,
  imports: [FormsModule, RouterLink, SiteHeaderComponent],
  templateUrl: './seguimiento.page.html',
  styleUrls: ['./seguimiento.page.css'],
})
export class SeguimientoPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly inscripcionApi = inject(InscripcionApiService);
  private readonly pagoApi = inject(PagoApiService);
  private readonly participanteApi = inject(ParticipanteApiService);

  readonly codigoInput = signal('');
  readonly buscaCodigo = signal('');
  readonly loading = signal(false);
  readonly notFound = signal(false);
  readonly data = signal<SeguimientoData | null>(null);
  /** True si se llegó desde el header de la portada (muestra "Volver al inicio"). */
  readonly desdeHeader = signal(false);

  private poll: ReturnType<typeof setInterval> | null = null;
  /** Número de reintentos de polling ya hechos (tope para no consultar por siempre). */
  private pollsHechos = 0;
  private static readonly MAX_POLLS = 60; // 60 × 10s = 10 minutos

  constructor() {
    this.route.queryParamMap.subscribe((q) => {
      this.desdeHeader.set(q.get('origen') === 'header');
    });
    this.route.paramMap.subscribe((params) => {
      const codigo = params.get('codigo');
      if (codigo) {
        this.codigoInput.set(codigo);
        this.consultar(codigo);
        return;
      }
      const guardado = sessionStorage.getItem('chicote-registro-codigo');
      if (guardado) {
        this.codigoInput.set(guardado);
        this.consultar(guardado);
      }
    });
  }

  ngOnDestroy(): void {
    this.detenerPolling();
  }

  consultar(codigo?: string): void {
    const valor = (codigo ?? this.codigoInput()).trim().toUpperCase();
    if (!valor) return;
    this.detenerPolling();
    this.buscaCodigo.set(valor);
    this.loading.set(true);
    this.notFound.set(false);
    this.pollsHechos = 0;

    this.inscripcionApi.obtenerPorCodigo(valor).subscribe({
      next: (inscripcion) => {
        if (sessionStorage.getItem('chicote-registro-codigo') === inscripcion.codigo) {
          sessionStorage.setItem(
            'chicote-registro-estado',
            inscripcion.estado === 'CONFIRMADA'
              ? 'Confirmada'
              : inscripcion.estado === 'RECHAZADA'
                ? 'Rechazada'
                : 'Pendiente de confirmación',
          );
        }
        this.pagoApi.listarPorInscripcion(inscripcion.id).subscribe({
          next: (pagos) => {
            this.data.set({
              codigo: inscripcion.codigo,
              nombreGrupo: inscripcion.nombreGrupo,
              estado: inscripcion.estado,
              total: inscripcion.total,
              fecha: inscripcion.createdAt,
              observaciones: inscripcion.observaciones,
              participantes: [],
              pagos: pagos.map((p) => ({
                monto: p.monto,
                metodoPago: p.metodoPago,
                numeroOperacion: p.numeroOperacion,
                estado: p.estado,
                observaciones: p.observaciones,
                createdAt: p.createdAt,
              })),
            });
            this.loading.set(false);
            this.cargarParticipantes(valor);
            this.iniciarPollingSiPendiente();
          },
          error: () => {
            this.loading.set(false);
            this.data.set(null);
            this.notFound.set(true);
          },
        });
      },
      error: () => {
        this.loading.set(false);
        this.data.set(null);
        this.notFound.set(true);
      },
    });
  }

  /** La nómina viaja por el endpoint público de participantes por código. */
  private cargarParticipantes(codigo: string): void {
    this.participanteApi.listarPorCodigo(codigo).subscribe({
      next: (participantes) => {
        this.data.update((d) =>
          d
            ? {
                ...d,
                participantes: participantes.map((p) => ({
                  nombres: p.nombres,
                  celular: p.celular ?? '—',
                })),
              }
            : d,
        );
      },
      error: () => {
        /* la nómina es complementaria: si falla no rompe el seguimiento */
      },
    });
  }

  private iniciarPollingSiPendiente(): void {
    const d = this.data();
    if (!d || d.estado !== 'PENDIENTE') return;
    if (this.pollsHechos >= SeguimientoPage.MAX_POLLS) return;
    this.poll = setInterval(() => {
      this.pollsHechos++;
      if (this.pollsHechos > SeguimientoPage.MAX_POLLS) {
        this.detenerPolling();
        return;
      }
      this.inscripcionApi.obtenerPorCodigo(this.buscaCodigo()).subscribe({
        next: (inscripcion) => {
          if (inscripcion.estado !== this.data()?.estado) {
            this.consultar(this.buscaCodigo());
          }
        },
      });
    }, 10000);
  }

  private detenerPolling(): void {
    if (this.poll) {
      clearInterval(this.poll);
      this.poll = null;
    }
  }

  buscar(): void {
    this.consultar();
  }

  /** Motivo humano del rechazo (observaciones de pagos o de la inscripción). */
  motivoRechazo(): string {
    const d = this.data();
    if (!d) return '';
    const dePago = d.pagos.find(
      (p) => p.estado === 'RECHAZADO' && (p.observaciones ?? '').trim(),
    );
    if (dePago) return dePago.observaciones!.trim();
    return (d.observaciones ?? '').trim();
  }
}
