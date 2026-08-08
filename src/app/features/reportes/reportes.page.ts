import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataStoreService } from '../../core/services/data-store.service';
import { BadgeComponent, statusLabel, statusTone } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { InputComponent } from '../../shared/ui/input.component';
import { KpiBoardComponent } from '../../shared/ui/kpi-board.component';
import { KpiItem } from '../../shared/ui/kpi-board.types';

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
    KpiBoardComponent,
  ],
  styleUrl: './reportes.page.css',
  templateUrl: './reportes.page.html',
})
export class ReportesPage {
  readonly store = inject(DataStoreService);
  readonly statusTone = statusTone;
  readonly statusLabel = statusLabel;

  readonly search = signal('');
  readonly modalidadFilter = signal('');
  readonly estadoFilter = signal('');
  readonly vistaActual = signal<'general' | 'modalidades'>('general');
  readonly modalidadExpandida = signal<string | null>(null);

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

  readonly kpis = computed((): KpiItem[] => {
    const all = this.integrantes();
    const grupos = new Set(all.map((r) => r.codigo)).size;
    const confirmados = all.filter((r) => r.estado === 'CONFIRMADA').length;
    const varones = all.filter((r) => r.sexo === 'Varón').length;
    const mujeres = all.length - varones;

    return [
      {
        label: 'Integrantes',
        value: all.length,
        hint: 'Bailarines registrados',
        icon: 'users',
        tone: 'gold',
      },
      {
        label: 'Grupos',
        value: grupos,
        hint: 'Elencos inscritos',
        icon: 'users-round',
        tone: 'ink',
      },
      {
        label: 'Modalidades',
        value: new Set(all.map((r) => r.modalidad)).size,
        hint: 'En competencia',
        icon: 'trophy',
        tone: 'warn',
      },
      {
        label: 'Composición',
        value: `${varones} · ${mujeres}`,
        hint: 'Varones · Mujeres',
        icon: 'user',
        tone: 'ink',
        money: true,
      },
    ];
  });

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
  }

  toggleModalidad(modalidad: string): void {
    this.modalidadExpandida.set(this.modalidadExpandida() === modalidad ? null : modalidad);
  }

  exportarPdfPorModalidad(reporte: ReporteModalidad): void {
    if (reporte.participantes.length === 0) return;
    this.exportarPdfTitulo(
      'Reporte por modalidad',
      reporte.participantes,
      `Modalidad: ${reporte.modalidad}`,
    );
  }

  readonly modalidadPdf = signal('');

  exportarPdfModalidad(): void {
    const mod = this.modalidadPdf();
    if (!mod) return;
    const rows = this.integrantes().filter((r) => r.modalidad === mod);
    if (rows.length === 0) return;
    this.exportarPdfTitulo('Reporte por modalidad', rows, `Modalidad: ${mod}`);
  }

  exportarPdf(tipo: 'general' | 'filtrado'): void {
    const rows = tipo === 'general' ? this.integrantes() : this.filtered();
    if (rows.length === 0) return;

    const titulo =
      tipo === 'general'
        ? 'Reporte general de integrantes'
        : 'Reporte de integrantes (filtrado)';
    const filtro = this.modalidadFilter()
      ? `Modalidad: ${this.modalidadFilter()}`
      : this.estadoFilter()
        ? `Estado: ${this.statusLabel(this.estadoFilter())}`
        : this.search()
          ? `Búsqueda: ${this.search()}`
          : '';
    this.exportarPdfTitulo(titulo, rows, filtro);
  }

  private exportarPdfTitulo(titulo: string, rows: IntegranteRow[], nota: string): void {
    const hoy = new Date().toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const grupos = new Set(rows.map((r) => r.codigo)).size;
    const modalidades = new Set(rows.map((r) => r.modalidad)).size;

    const filas = rows
      .map(
        (r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${r.nombre}</td>
          <td>${r.dni}</td>
          <td>${r.edad}</td>
          <td>${r.sexo}</td>
          <td>${r.grupo}</td>
          <td>${r.modalidad}</td>
          <td class="mono">${r.codigo}</td>
          <td>${this.statusLabel(r.estado)}</td>
        </tr>`,
      )
      .join('');

    const win = window.open('', '_blank', 'width=860,height=1000');
    if (!win) return;
    win.document.write(`
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${titulo}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Geist', system-ui, sans-serif;
    font-size: 10px;
    color: #1c1917;
    margin: 0;
    padding: 0 4px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 3px solid #b08d3c;
    padding-bottom: 10px;
    margin-bottom: 10px;
  }
  header h1 {
    margin: 0 0 4px;
    font-size: 17px;
    letter-spacing: -0.02em;
  }
  header p { margin: 0; font-size: 11px; color: #44403c; }
  .meta {
    text-align: right;
    font-size: 11px;
    color: #44403c;
    line-height: 1.5;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td {
    padding: 6px 8px;
    border: 1px solid #d6d3d1;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #1c1917;
    color: #fff;
    font-weight: 600;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  td.mono { font-family: 'Geist Mono', monospace; }
  tr:nth-child(even) td { background: #fafaf9; }
  footer {
    margin-top: 10px;
    font-size: 10px;
    color: #78716c;
  }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <header>
    <div>
      <h1>Chicote de Oro · ${titulo}</h1>
      <p>${rows.length} integrantes · ${grupos} grupos · ${modalidades} modalidades${nota ? ' · ' + nota : ''}</p>
    </div>
    <div class="meta">Generado el ${hoy}</div>
  </header>
  <table>
    <thead>
      <tr>
        <th style="width:24px">#</th>
        <th>Integrante</th>
        <th>DNI</th>
        <th>Edad</th>
        <th>Sexo</th>
        <th>Grupo</th>
        <th>Modalidad</th>
        <th>Código</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
${filas}
    </tbody>
  </table>
  <footer>Documento generado desde el panel de administración · Chicote de Oro</footer>
</body>
</html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  }
}