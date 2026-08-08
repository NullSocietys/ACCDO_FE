/** Configuración del concurso — no tiene tabla SQL (se mantiene local por ahora). */

export interface Configuracion {
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
}