import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';
import autoTable, { type CellInput, type RowInput } from 'jspdf-autotable';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { BadgeComponent, statusLabel, statusTone } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { InputComponent } from '../../shared/ui/input.component';
import { LoadMoreComponent } from '../../shared/ui/load-more.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

interface IntegranteRow {
  id: string;
  nombre: string;
  iniciales: string;
  dni: string;
  edad: number;
  sexo: string;
  grupo: string;
  modalidad: string;
  evento: string;
  codigo: string;
  estado: string;
}

interface ReporteModalidad {
  modalidad: string;
  totalParticipantes: number;
  totalGrupos: number;
  confirmados: number;
  pendientes: number;
  varones: number;
  mujeres: number;
  edadPromedio: number;
  participantes: IntegranteRow[];
}

@Component({
  selector: 'app-reportes-page',
  imports: [
    FormsModule,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    InputComponent,
    LoadMoreComponent,
    SkeletonComponent,
  ],
  styleUrl: './reportes.page.css',
  templateUrl: './reportes.page.html',
})
export class ReportesPage {
  readonly store = inject(DataStoreService);
  private readonly toast = inject(ToastService);
  readonly statusTone = statusTone;
  readonly statusLabel = statusLabel;

  readonly search = signal('');
  readonly modalidadFilter = signal('');
  readonly estadoFilter = signal('');
  /** Esqueleto de carga inicial (igual que el dashboard). */
  readonly cargando = signal(true);
  readonly vistaActual = signal<'general' | 'modalidades'>('general');
  readonly exportEstado = signal('CONFIRMADA');
  readonly modalidadExpandida = signal<string | null>(null);
  readonly modalidadPageSize = 5;
  /** Carga fluida: participantes visibles en la sección expandida. */
  readonly modalidadVisible = signal(this.modalidadPageSize);
  readonly seccionesPageSize = 2;
  /** Carga fluida: secciones de modalidad visibles. */
  readonly seccionesVisible = signal(this.seccionesPageSize);

  readonly mastGrupos = computed(() => new Set(this.integrantes().map((r) => r.codigo)).size);
  readonly mastModalidades = computed(() => new Set(this.integrantes().map((r) => r.modalidad)).size);

  readonly modalidades = computed(() => this.store.categorias().map((c) => c.nombre));
  readonly estados = ['PENDIENTE', 'CONFIRMADA', 'RECHAZADA'];

  readonly integrantes = computed((): IntegranteRow[] =>
    this.store
      .participantesView()
      .map((p) => ({
        id: p.id,
        nombre: `${p.nombres} ${p.apellidos}`.trim(),
        iniciales: `${p.nombres.charAt(0)}${p.apellidos.charAt(0)}`.toUpperCase(),
        dni: p.dni,
        edad: p.edad,
        sexo: p.sexo === 'M' ? 'Varón' : 'Mujer',
        grupo: p.nombreGrupo,
        modalidad: p.categoriaNombre,
        evento: p.eventoNombre,
        codigo: p.codigoInscripcion,
        estado: p.estadoInscripcion,
      }))
      .sort(
        (a, b) =>
          a.modalidad.localeCompare(b.modalidad, 'es') ||
          a.grupo.localeCompare(b.grupo, 'es') ||
          a.nombre.localeCompare(b.nombre, 'es'),
      ),
  );

  readonly filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const mod = this.modalidadFilter();
    const est = this.estadoFilter();

    return this.integrantes().filter((r) => {
      const matchMod = !mod || r.modalidad === mod;
      const matchEst = !est || r.estado === est;
      const matchQ =
        !q ||
        r.nombre.toLowerCase().includes(q) ||
        r.dni.includes(q) ||
        r.grupo.toLowerCase().includes(q) ||
        r.codigo.toLowerCase().includes(q) ||
        r.modalidad.toLowerCase().includes(q);
      return matchMod && matchEst && matchQ;
    });
  });

  readonly paged = computed(() => this.filtered().slice(0, this.visible()));

  readonly hasMore = computed(() => this.visible() < this.filtered().length);

  readonly remaining = computed(() => Math.max(0, this.filtered().length - this.visible()));

  loadMore(): void {
    this.visible.update((v) => Math.min(v + this.pageSize, this.filtered().length));
  }

  readonly seccionesPaged = computed(() =>
    this.reportesModalidad().slice(0, this.seccionesVisible()),
  );

  readonly seccionesHasMore = computed(
    () => this.seccionesVisible() < this.reportesModalidad().length,
  );

  readonly seccionesRemaining = computed(() =>
    Math.max(0, this.reportesModalidad().length - this.seccionesVisible()),
  );

  loadMoreSecciones(): void {
    this.seccionesVisible.update((v) =>
      Math.min(v + this.seccionesPageSize, this.reportesModalidad().length),
    );
  }

  readonly expanded = computed((): ReporteModalidad | null => {
    const mod = this.modalidadExpandida();
    return mod ? this.reportesModalidad().find((r) => r.modalidad === mod) ?? null : null;
  });

  readonly expandedPaged = computed((): IntegranteRow[] => {
    const r = this.expanded();
    if (!r) return [];
    return r.participantes.slice(0, this.modalidadVisible());
  });

  readonly expandedHasMore = computed(() => {
    const r = this.expanded();
    return !!r && this.modalidadVisible() < r.participantes.length;
  });

  readonly expandedRemaining = computed(() => {
    const r = this.expanded();
    return r ? Math.max(0, r.participantes.length - this.modalidadVisible()) : 0;
  });

  loadMoreModalidad(): void {
    const r = this.expanded();
    if (!r) return;
    this.modalidadVisible.update((v) =>
      Math.min(v + this.modalidadPageSize, r.participantes.length),
    );
  }

  readonly reportesModalidad = computed((): ReporteModalidad[] => {
    const all = this.integrantes();
    const modalidadesUnicas = [...new Set(all.map((r) => r.modalidad))].sort((a, b) =>
      a.localeCompare(b, 'es'),
    );

    return modalidadesUnicas.map((modalidad) => {
      const participantes = all.filter((r) => r.modalidad === modalidad);
      const grupos = new Set(participantes.map((r) => r.codigo)).size;
      const confirmados = participantes.filter((r) => r.estado === 'CONFIRMADA').length;
      const pendientes = participantes.filter((r) => r.estado === 'PENDIENTE').length;
      const varones = participantes.filter((r) => r.sexo === 'Varón').length;
      const mujeres = participantes.length - varones;
      const edadPromedio =
        participantes.reduce((sum, r) => sum + r.edad, 0) / participantes.length || 0;

      return {
        modalidad,
        totalParticipantes: participantes.length,
        totalGrupos: grupos,
        confirmados,
        pendientes,
        varones,
        mujeres,
        edadPromedio: Math.round(edadPromedio),
        participantes: participantes.sort((a, b) =>
          a.grupo.localeCompare(b.grupo, 'es') || a.nombre.localeCompare(b.nombre, 'es'),
        ),
      };
    });
  });

  readonly pageSize = 10;
  /** Carga fluida: cuántos integrantes del listado general se muestran. */
  readonly visible = signal(this.pageSize);

  constructor() {
    window.setTimeout(() => this.cargando.set(false), 500);
    effect(() => {
      this.search();
      this.modalidadFilter();
      this.estadoFilter();
      untracked(() => this.visible.set(this.pageSize));
    });
  }

  limpiarFiltros(): void {
    this.search.set('');
    this.modalidadFilter.set('');
    this.estadoFilter.set('');
  }

  cambiarVista(vista: 'general' | 'modalidades'): void {
    this.vistaActual.set(vista);
    if (vista === 'general') {
      this.modalidadExpandida.set(null);
    }
    this.modalidadVisible.set(this.modalidadPageSize);
    this.seccionesVisible.set(this.seccionesPageSize);
  }

  toggleModalidad(modalidad: string): void {
    this.modalidadExpandida.set(this.modalidadExpandida() === modalidad ? null : modalidad);
    this.modalidadVisible.set(this.modalidadPageSize);
  }

  exportarPdfPorModalidad(reporte: ReporteModalidad): void {
    const filas = reporte.participantes.filter((r) => this.porExportEstado(r));
    if (filas.length === 0) return;
    const estado = this.exportEstado()
      ? ` · Estado: ${this.statusLabel(this.exportEstado())}`
      : '';
    void this.exportarPdfTitulo(
      'Reporte por modalidad',
      filas,
      `${this.notaModalidad(reporte.modalidad)}${estado}`,
    );
  }

  readonly modalidadPdf = signal('');

  exportarPdfModalidad(): void {
    const mod = this.modalidadPdf();
    if (!mod) return;
    const rows = this.integrantes().filter(
      (r) => r.modalidad === mod && this.porExportEstado(r),
    );
    if (rows.length === 0) return;
    const estado = this.exportEstado()
      ? ` · Estado: ${this.statusLabel(this.exportEstado())}`
      : '';
    void this.exportarPdfTitulo('Reporte por modalidad', rows, `${this.notaModalidad(mod)}${estado}`);
  }

  private porExportEstado(r: IntegranteRow): boolean {
    return !this.exportEstado() || r.estado === this.exportEstado();
  }

  private notaModalidad(mod: string): string {
    return `Modalidad: ${mod}`;
  }

  exportarPdf(): void {
    const rows = this.filtered().filter((r) => this.porExportEstado(r));
    if (rows.length === 0) return;

    const titulo = 'Reporte general de integrantes';

    const partes: string[] = [];
    if (this.modalidadFilter()) partes.push(this.notaModalidad(this.modalidadFilter()));
    if (this.estadoFilter()) partes.push(`Estado: ${this.statusLabel(this.estadoFilter())}`);
    if (this.search()) partes.push(`Búsqueda: ${this.search()}`);
    if (this.exportEstado()) partes.push(`Estado: ${this.statusLabel(this.exportEstado())}`);
    const nota = partes.join(' · ');

    void this.exportarPdfTitulo(titulo, rows, nota, true);
  }

  private async exportarPdfTitulo(
    titulo: string,
    rows: IntegranteRow[],
    nota: string,
    agruparPorModalidad = false,
  ): Promise<void> {
    const hoy = new Date().toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const grupos = new Set(rows.map((r) => r.codigo)).size;
    const modalidades = new Set(rows.map((r) => r.modalidad)).size;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;

    // Logo con proporción real del PNG (960×955): sin aplastar.
    let logoW = 17.6;
    let logoH = logoW;
    try {
      const logoUrl = new URL('logo/LogoV1.png', document.baseURI).href;
      const blob = await fetch(logoUrl).then((r) => r.blob());
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      const img = await new Promise<HTMLImageElement>((resolve) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => resolve(im);
        im.src = dataUrl;
      });
      const ratio = img.naturalHeight / img.naturalWidth || 1;
      logoH = logoW * ratio;
      if (logoH > 20) {
        logoH = 20;
        logoW = logoH / ratio;
      }
      doc.addImage(dataUrl, 'PNG', margin, margin - 3, logoW, logoH);
    } catch {
      /* sin logo */
    }
    const titleX = margin + logoW + 3.5;

    // Línea 1: marca a la izquierda, fecha a la derecha (sin colisión).
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(28, 25, 23);
    doc.text('Chicote de Oro', titleX, margin + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 113, 108);
    doc.text(`Generado el ${hoy}`, pageW - margin, margin + 3, { align: 'right' });

    // Línea 2: título del reporte.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(68, 64, 60);
    doc.text(titulo, titleX, margin + 8.5);

    // Línea 3: resumen de integrantes, grupos, modalidades y filtros aplicados.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(120, 113, 108);
    const sub = `${rows.length} integrantes · ${grupos} grupos · ${modalidades} modalidades${nota ? ' · ' + nota : ''}`;
    doc.text(doc.splitTextToSize(sub, pageW - margin - titleX), titleX, margin + 13);

    // Línea dorada bajo el encabezado.
    doc.setDrawColor(176, 141, 60);
    doc.setLineWidth(1);
    doc.line(margin, margin + 17, pageW - margin, margin + 17);

    const head = agruparPorModalidad
      ? ['#', 'Integrante', 'DNI', 'Edad', 'Sexo', 'Grupo', 'Código', 'Estado']
      : ['#', 'Integrante', 'DNI', 'Edad', 'Sexo', 'Grupo', 'Modalidad', 'Código', 'Estado'];

    const body = this.filasPdf(rows, agruparPorModalidad);

    autoTable(doc, {
      startY: margin + 21,
      head: [head],
      body,
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: 2.2,
        textColor: [28, 25, 23],
        lineColor: [214, 211, 209],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [28, 25, 23],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 2.6,
      },
      alternateRowStyles: { fillColor: [250, 250, 249] },
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 10, halign: 'center' },
        4: { cellWidth: 13, halign: 'center' },
      },
      didDrawPage: (data) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 113, 108);
        doc.text(
          `Documento generado desde el panel de administración · Chicote de Oro — Página ${data.pageNumber}`,
          pageW / 2,
          pageH - 6,
          { align: 'center' },
        );
      },
    });

    const slug = titulo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    doc.save(`chicote-de-oro-${slug}.pdf`);
    this.toast.success('PDF descargado');
  }

  private filasPdf(rows: IntegranteRow[], agruparPorModalidad: boolean): RowInput[] {
    const body: RowInput[] = [];
    let n = 0;

    if (agruparPorModalidad) {
      const porModalidad = new Map<string, IntegranteRow[]>();
      for (const r of rows) {
        const lista = porModalidad.get(r.modalidad) ?? [];
        lista.push(r);
        porModalidad.set(r.modalidad, lista);
      }

      for (const mod of [...porModalidad.keys()].sort((a, b) => a.localeCompare(b, 'es'))) {
        const lista = porModalidad.get(mod)!;
        const gruposMod = new Set(lista.map((r) => r.codigo)).size;
        body.push([
          {
            content: `${mod} — ${lista.length} integrantes · ${gruposMod} grupos`,
            colSpan: 8,
            styles: {
              fillColor: [176, 141, 60],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 8.5,
            },
          } satisfies CellInput,
        ]);
        for (const r of lista) {
          n += 1;
          body.push(this.filaPdf(n, r, false));
        }
      }
    } else {
      for (const r of rows) {
        n += 1;
        body.push(this.filaPdf(n, r, true));
      }
    }
    return body;
  }

  private filaPdf(index: number, r: IntegranteRow, conModalidad: boolean): RowInput {
    const fila: CellInput[] = [index, r.nombre, r.dni, r.edad, r.sexo, r.grupo];
    if (conModalidad) fila.push(r.modalidad);
    fila.push(r.codigo, this.statusLabel(r.estado));
    return fila;
  }
}