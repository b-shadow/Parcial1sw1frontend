export type ModuloAuditado =
  | 'AUTENTICACION'
  | 'ADMINISTRACION'
  | 'DISENO_TRAMITES'
  | 'TRAMITES'
  | 'TAREAS'
  | 'NOTIFICACIONES'
  | 'SUPERVISION';

export type ResultadoAuditoria = 'EXITOSA' | 'FALLIDA' | 'PARCIAL';

export interface FiltroAuditoria {
  fechaDesde?: string;
  fechaHasta?: string;
  actor?: string;
  actorId?: string;
  accion?: string;
  moduloAuditado?: ModuloAuditado;
  entidad?: string;
  entidadId?: string;
  resultadoAuditoria?: ResultadoAuditoria;
}

export interface AuditoriaResumen {
  id: string;
  fechaEvento: string;
  actorId: string | null;
  actorNombreSnapshot: string | null;
  ipOrigen: string | null;
  moduloAuditado: ModuloAuditado | null;
  accion: string;
  entidad: string;
  resultadoAuditoria: ResultadoAuditoria | null;
}

export interface CambioAuditado {
  campo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
}

export interface AuditoriaDetalle {
  id: string;
  actorId: string | null;
  actorNombreSnapshot: string | null;
  rolActor: 'ADMINISTRADOR' | 'ADMINISTRATIVO' | 'EJECUTIVO' | 'USUARIO' | null;
  moduloAuditado: ModuloAuditado | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  resultadoAuditoria: ResultadoAuditoria | null;
  descripcion: string;
  cambios: CambioAuditado[];
  contexto: Record<string, unknown> | null;
  ipOrigen: string | null;
  userAgent: string | null;
  fechaEvento: string;
}

