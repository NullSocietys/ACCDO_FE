import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataStoreService } from '../../core/services/data-store.service';
import { IconComponent } from '../../shared/icons/icon.component';
import { BadgeComponent, statusLabel, statusTone } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { CardComponent } from '../../shared/ui/card.component';
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

@Component({
  selector: 'app-dashboard-page',
  imports: [
    DatePipe,
    RouterLink,
    IconComponent,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
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
      .map((c) => ({
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

  get latestInscripciones() {
    return this.store.inscripciones().slice(0, 5);
  }

  get upcomingEventos() {
    return this.store
      .eventos()
      .filter((e) => e.estado === 'activo' || e.estado === 'proximo')
      .slice(0, 4);
  }

  constructor() {
    window.setTimeout(() => this.loading.set(false), 500);
  }
}
