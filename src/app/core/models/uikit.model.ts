/** Tipos de UI y contenido de bases (no tablas SQL). */

export interface StatCard {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
  tone: 'gold' | 'dark' | 'success' | 'warning' | 'info';
}

export interface ChartBar {
  label: string;
  value: number;
}

/** Premios por modalidad (contenido de bases, no tabla SQL). */
export interface PremioCategoria {
  categoriaId: string;
  categoriaNombre: string;
  primero: string;
  segundo: string;
  tercero: string;
}

export interface CriterioCalificacion {
  clave: 'presentacion' | 'coreografia' | 'armonia' | 'mensaje' | 'expresion';
  nombre: string;
  puntos: number;
  descripcion: string;
}

/** @deprecated Usar Categoria.nombre / categoriaId */
export type Modalidad = string;