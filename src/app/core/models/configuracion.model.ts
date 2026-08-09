/** Configuración de la asociación — tabla SQL configuracion. */

export interface Configuracion {
  id?: string;
  nombreAsociacion: string;
  telefono: string;
  correo: string;
  direccion: string;
  cuentaBancaria: string;
  numeroYape: string;
  numeroPlin: string;
  coordinadoraGeneral: string;
  logoUrl: string;
  mensajeConfirmacion: string;
  fechaLimiteInscripcion: string;
  fechaSorteo: string;
  horaSorteo: string;
  horaInicioConcurso: string;
  activo?: boolean;
  createdAt?: string;
}