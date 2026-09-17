import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';
import autoTable, { type CellInput, type RowInput } from 'jspdf-autotable';
import { DataStoreService } from '../../core/services/data-store.service';
import { ToastService } from '../../core/services/toast.service';
import { BadgeComponent, statusLabel, statusTone } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { IconComponent } from '../../shared/icons/icon.component';
import { InputComponent } from '../../shared/ui/input.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

interface IntegranteRow {
  id: string;
  nombre: string;
  iniciales: string;
  celular: string;
  grupo: string;
  modalidad: string;
  evento: string;
  codigo: string;
  estado: string;
}

interface GrupoReporte {
  codigo: string;
  nombre: string;
  participantes: IntegranteRow[];
}

interface ReporteModalidad {
  modalidad: string;
  totalParticipantes: number;
  totalGrupos: number;
  confirmados: number;
  pendientes: number;
  participantes: IntegranteRow[];
  grupos: GrupoReporte[];
}

@Component({
  selector: 'app-reportes-page',
  imports: [
    FormsModule,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    IconComponent,
    InputComponent,
    PaginationComponent,
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

  /** KPIs del resumen. Los estados pertenecen a la INSCRIPCI�N (el grupo):
   *  una inscripci�n de ballet con 10 integrantes cuenta como 1 confirmada. */
  readonly overview = computed(() => {
    const inscripciones = this.store.inscripcionesView();
    const integrantes = this.integrantes();
    return {
      integrantes: integrantes.length,
      // Agrupaciones (inscripciones) por estado � lo que se paga y confirma.
      confirmadas: inscripciones.filter((i) => i.estado === 'CONFIRMADA').length,
      pendientes: inscripciones.filter((i) => i.estado === 'PENDIENTE').length,
      rechazadas: inscripciones.filter((i) => i.estado === 'RECHAZADA').length,
      // Los Ch entre grupos y modalidades se calculan sobre integrantes activos.
      grupos: new Set(integrantes.map((r) => r.codigo)).size,
      modalidades: new Set(integrantes.map((r) => r.modalidad)).size,
    };
  });

  readonly modalidades = computed(() => this.store.categorias().map((c) => c.nombre));
  readonly estados = ['PENDIENTE', 'CONFIRMADA', 'RECHAZADA'];

  readonly integrantes = computed((): IntegranteRow[] =>
    this.store
      .participantesView()
      .map((p) => {
        const partes = p.nombres.trim().split(/\s+/).filter(Boolean);
        const iniciales =
          partes.length >= 2
            ? `${partes[0].charAt(0)}${partes[1].charAt(0)}`.toUpperCase()
            : (partes[0]?.slice(0, 2) ?? '?').toUpperCase();
        return {
          id: p.id,
          nombre: p.nombres,
          iniciales,
          celular: p.celular ?? '—',
          grupo: p.nombreGrupo,
          modalidad: p.categoriaNombre,
          evento: p.eventoNombre,
          codigo: p.codigoInscripcion,
          estado: p.estadoInscripcion,
        };
      })
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
        r.celular.includes(q) ||
        r.grupo.toLowerCase().includes(q) ||
        r.codigo.toLowerCase().includes(q) ||
        r.modalidad.toLowerCase().includes(q);
      return matchMod && matchEst && matchQ;
    });
  });

  readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  /** true cuando la página actual tiene exactamente pageSize filas.
   *  Página llena → la card usa flex:1 y llena el alto disponible.
   *  Página parcial → la card mide lo justo (altura natural).
   */
  readonly isFullPage = computed(() => this.paged().length >= this.pageSize);

  readonly rangeLabel = computed(() => {
    const total = this.filtered().length;
    if (total === 0) return '0 resultados';
    const from = (this.page() - 1) * this.pageSize + 1;
    const to = Math.min(this.page() * this.pageSize, total);
    return `${from}–${to} de ${total}`;
  });

  readonly seccionesPaged = computed(() => this.reportesModalidad());

  /** Modalidad activa en la vista maestro-detalle. */
  readonly modalidadActiva = signal<string | null>(null);

  /** Selecciona la primera modalidad por defecto. */
  readonly efectoSeleccion = effect(() => {
    const mods = this.reportesModalidad();
    if (mods.length === 0) {
      untracked(() => this.modalidadActiva.set(null));
      return;
    }
    const activa = this.modalidadActiva();
    if (!activa || !mods.some((m) => m.modalidad === activa)) {
      untracked(() => this.modalidadActiva.set(mods[0].modalidad));
    }
  });

  /** Reporte completo de la modalidad activa: todos los grupos y participantes. */
  readonly reporteActivo = computed((): ReporteModalidad | null => {
    const activa = this.modalidadActiva();
    return activa ? this.reportesModalidad().find((r) => r.modalidad === activa) ?? null : null;
  });

  seleccionarModalidad(modalidad: string): void {
    this.modalidadActiva.set(modalidad);
  }

  /** Todos los grupos de la modalidad activa con sus participantes (sin paginar). */
  readonly gruposActivos = computed((): GrupoReporte[] => {
    const r = this.reporteActivo();
    return r?.grupos ?? [];
  });

  readonly reportesModalidad = computed((): ReporteModalidad[] => {
    const all = this.integrantes();
    const modalidadesUnicas = [...new Set(all.map((r) => r.modalidad))].sort((a, b) =>
      a.localeCompare(b, 'es'),
    );

    return modalidadesUnicas.map((modalidad) => {
      const participantes = all.filter((r) => r.modalidad === modalidad);
      const grupos = new Set(participantes.map((r) => r.codigo)).size;
      // El estado pertenece a la INSCRIPCI�N (grupo): se cuentan grupos �nicos
      // con ese estado, no integrantes. Un ballet confirmado de 10 = 1 grupo.
      const codigosConfirmados = new Set(
        participantes.filter((r) => r.estado === 'CONFIRMADA').map((r) => r.codigo),
      ).size;
      const codigosPendientes = new Set(
        participantes.filter((r) => r.estado === 'PENDIENTE').map((r) => r.codigo),
      ).size;
      const confirmados = codigosConfirmados;
      const pendientes = codigosPendientes;

      const gruposMap = new Map<string, IntegranteRow[]>();
      for (const p of participantes) {
        const lista = gruposMap.get(p.codigo) ?? [];
        lista.push(p);
        gruposMap.set(p.codigo, lista);
      }
      const gruposReporte: GrupoReporte[] = [...gruposMap.entries()]
        .map(([codigo, parts]) => ({
          codigo,
          nombre: parts[0]?.grupo ?? codigo,
          participantes: [...parts].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

      return {
        modalidad,
        totalParticipantes: participantes.length,
        totalGrupos: grupos,
        confirmados,
        pendientes,
        participantes: participantes.sort((a, b) =>
          a.grupo.localeCompare(b.grupo, 'es') || a.nombre.localeCompare(b.nombre, 'es'),
        ),
        grupos: gruposReporte,
      };
    });
  });

  readonly pageSize = 10;
  readonly page = signal(1);

  constructor() {
    window.setTimeout(() => this.cargando.set(false), 500);
    effect(() => {
      this.search();
      this.modalidadFilter();
      this.estadoFilter();
      untracked(() => this.page.set(1));
    });
  }

  limpiarFiltros(): void {
    this.search.set('');
    this.modalidadFilter.set('');
    this.estadoFilter.set('');
  }

  cambiarVista(vista: 'general' | 'modalidades'): void {
    this.vistaActual.set(vista);
  }

  exportarPdfPorModalidad(reporte: ReporteModalidad): void {
    const estado = this.exportEstado();
    const filas = reporte.participantes.filter((r) => this.porExportEstado(r));
    if (filas.length === 0) {
      this.avisoSinDatos(estado);
      return;
    }
    const notaEstado = estado ? ` � Estado: ${this.statusLabel(estado)}` : '';
    void this.exportarPdfTitulo(
      'Reporte por modalidad',
      filas,
      `${this.notaModalidad(reporte.modalidad)}${notaEstado}`,
      false,
      true,
    );
  }

  readonly modalidadPdf = signal('');

  exportarPdfModalidad(): void {
    const mod = this.modalidadPdf();
    if (!mod) return;
    const estado = this.exportEstado();
    const rows = this.integrantes().filter(
      (r) => r.modalidad === mod && this.porExportEstado(r),
    );
    if (rows.length === 0) {
      this.avisoSinDatos(estado);
      return;
    }
    const estadoNota = estado ? ` � Estado: ${this.statusLabel(estado)}` : '';
    void this.exportarPdfTitulo('Reporte por modalidad', rows, `${this.notaModalidad(mod)}${estadoNota}`);
  }

  private porExportEstado(r: IntegranteRow): boolean {
    return !this.exportEstado() || r.estado === this.exportEstado();
  }

  /** Aviso cuando el estado elegido no tiene datos para exportar. */
  private avisoSinDatos(estado: string): void {
    const etiqueta = estado ? this.statusLabel(estado).toLowerCase() : 'el estado seleccionado';
    this.toast.info('No hay datos en este estado', `No hay integrantes ${etiqueta} para exportar.`);
  }

  private notaModalidad(mod: string): string {
    return `Modalidad: ${mod}`;
  }

  exportarPdf(): void {
    // Exporta sobre TODOS los integrantes (no sobre el filtro de la tabla),
    // respetando �nicamente el selector de estado del export. As� "Solo
    // confirmados" descarga todos los confirmados, no solo los filtrados en pantalla.
    const estado = this.exportEstado();
    const rows = this.integrantes().filter((r) => this.porExportEstado(r));
    if (rows.length === 0) {
      this.avisoSinDatos(estado);
      return;
    }

    const titulo = 'Reporte general de integrantes';

    const partes: string[] = [];
    if (this.modalidadFilter()) partes.push(this.notaModalidad(this.modalidadFilter()));
    if (this.estadoFilter()) partes.push(`Estado: ${this.statusLabel(this.estadoFilter())}`);
    if (this.search()) partes.push(`B�squeda: ${this.search()}`);
    if (estado) partes.push(`Estado: ${this.statusLabel(estado)}`);
    const nota = partes.join(' � ');

    void this.exportarPdfTitulo(titulo, rows, nota, true);
  }

  private async exportarPdfTitulo(
    titulo: string,
    rows: IntegranteRow[],
    nota: string,
    agruparPorModalidad = false,
    agruparPorGrupo = false,
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
      const logoUrl = new URL('logo/LogoV1.webp', document.baseURI).href;
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

    const head = agruparPorGrupo
      ? ['#', 'Integrante', 'Celular', 'Grupo', 'Código', 'Estado']
      : agruparPorModalidad
        ? ['#', 'Integrante', 'Celular', 'Grupo', 'Código', 'Estado']
        : ['#', 'Integrante', 'Celular', 'Grupo', 'Modalidad', 'Código', 'Estado'];

    const body = this.filasPdf(rows, agruparPorModalidad, agruparPorGrupo);

    autoTable(doc, {
      startY: margin + 21,
      head: [head],
      body,
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: 2.8,
        valign: 'middle',
        textColor: [28, 25, 23],
        lineColor: [214, 211, 209],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [28, 25, 23],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [250, 250, 249] },
      // Anchos fijos: la columna Integrante pierde ~1/4 de su espacio y se
      // redistribuye a Grupo/C�digo/Estado para que las dem�s respiren.
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 52, halign: 'left', valign: 'middle' },
        4: { cellWidth: 26, halign: 'center' },
        5: { cellWidth: 30, halign: 'center', valign: 'middle' },
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

  private filasPdf(
    rows: IntegranteRow[],
    agruparPorModalidad: boolean,
    agruparPorGrupo = false,
  ): RowInput[] {
    const body: RowInput[] = [];
    let n = 0;

    if (agruparPorGrupo) {
      const porGrupo = new Map<string, IntegranteRow[]>();
      for (const r of rows) {
        const lista = porGrupo.get(r.codigo) ?? [];
        lista.push(r);
        porGrupo.set(r.codigo, lista);
      }

      for (const codigo of [...porGrupo.keys()].sort((a, b) => {
        const na = porGrupo.get(a)![0]?.grupo ?? a;
        const nb = porGrupo.get(b)![0]?.grupo ?? b;
        return na.localeCompare(nb, 'es');
      })) {
        const lista = porGrupo.get(codigo)!;
        const nombreGrupo = lista[0]?.grupo ?? codigo;
        body.push([
          {
            content: `${nombreGrupo} — ${lista.length} ${lista.length === 1 ? 'integrante' : 'integrantes'} · código ${codigo}`,
            colSpan: 6,
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
    } else if (agruparPorModalidad) {
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
            colSpan: 6,
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
    const fila: CellInput[] = [index, r.nombre, r.celular, r.grupo];
    if (conModalidad) fila.push(r.modalidad);
    fila.push(r.codigo, this.statusLabel(r.estado));
    return fila;
  }
}