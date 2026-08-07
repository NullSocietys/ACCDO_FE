import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataStoreService } from '../../core/services/data-store.service';
import { BadgeComponent, statusLabel, statusTone } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { KpiBoardComponent } from '../../shared/ui/kpi-board.component';
import { KpiItem, KpiTone } from '../../shared/ui/kpi-board.types';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

const TONE_MAP: Record<string, KpiTone> = {
  gold: 'gold',
  dark: 'ink',
  success: 'ok',
  warning: 'warn',
  info: 'info',
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

@Component({
  selector: 'app-dashboard-page',
  imports: [
    CurrencyPipe,
    RouterLink,
    BadgeComponent,
    ButtonComponent,
    SkeletonComponent,
    KpiBoardComponent,
  ],
  styleUrl: './dashboard.page.css',
  templateUrl: './dashboard.page.html',
})
export class DashboardPage {
  readonly store = inject(DataStoreService);
  readonly loading = signal(true);
  readonly statusTone = statusTone;
  readonly statusLabel = statusLabel;

  readonly overview = computed(() => {
    const ins = this.store.inscripciones().filter((i) => i.estado !== 'rechazada');
    const pagos = this.store.pagos();
    const pendientes = pagos.filter((p) => p.estado === 'pendiente').length;
    const verificados = pagos.filter((p) => p.estado === 'verificado');
    const ingresos = verificados.reduce((sum, p) => sum + p.monto, 0);
    const activos = this.store.eventos().filter((e) => e.estado === 'activo').length;
    return {
      grupos: ins.length,
      pendientes,
      verificados: verificados.length,
      ingresos,
      activos,
    };
  });

  readonly featured = computed(() => {
    const activos = this.store.eventos().filter((e) => e.estado === 'activo');
    return activos[0] ?? null;
  });

  readonly kpis = computed((): KpiItem[] =>
    this.store.stats.map((stat) => ({
      label: stat.label,
      value: stat.value,
      hint: stat.change,
      icon: stat.icon,
      tone: TONE_MAP[stat.tone] ?? 'ink',
      money: stat.label.toLowerCase().includes('ingreso'),
    })),
  );

  readonly chartTotal = computed(() => this.store.chart.reduce((sum, c) => sum + c.value, 0));

  readonly chartRows = computed(() => {
    const total = this.chartTotal() || 1;
    const max = Math.max(...this.store.chart.map((c) => c.value), 1);
    return [...this.store.chart]
      .sort((a, b) => b.value - a.value)
      .map((c, i) => ({
        index: String(i + 1).padStart(2, '0'),
        label: c.label,
        value: c.value,
        pct: Math.round((c.value / total) * 100),
        width: Math.round((c.value / max) * 100),
        isPeak: c.value === max,
      }));
  });

  readonly peakCategory = computed(() => this.chartRows()[0] ?? null);

  readonly chartAria = computed(() => {
    const peak = this.peakCategory();
    return `Inscripciones por modalidad. Total ${this.chartTotal()} grupos. Líder: ${peak?.label ?? '—'} con ${peak?.value ?? 0}.`;
  });

  readonly latestInscripciones = computed(() => this.store.inscripciones().slice(0, 5));

  readonly upcomingEventos = computed(() =>
    this.store
      .eventos()
      .filter((e) => e.estado === 'activo' || e.estado === 'proximo')
      .slice(0, 4),
  );

  dayOf(fecha: string): string {
    return String(Number(fecha.slice(8, 10)));
  }

  monthOf(fecha: string): string {
    return MESES[Number(fecha.slice(5, 7)) - 1] ?? '';
  }

  rowIndex(localIndex: number): string {
    return String(localIndex + 1).padStart(2, '0');
  }

  constructor() {
    window.setTimeout(() => this.loading.set(false), 500);
  }
}
