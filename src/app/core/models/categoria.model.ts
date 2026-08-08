/** Módulo Categorías — tabla categorias. */

export interface Categoria {
  id: string;
  nombre: string;
  precio: number;
  minIntegrantes: number;
  maxIntegrantes: number;
  activo: boolean;
}

/** Payload de creación/actualización (el backend recibe el modelo directo). */
export type CategoriaPayload = Omit<Categoria, 'id'>;
