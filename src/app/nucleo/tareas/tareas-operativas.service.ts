import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type EstadoTareaOperativa =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'PAUSADA'
  | 'LISTA_PARA_RESOLVER'
  | 'RESUELTA'
  | 'REASIGNADA'
  | 'CANCELADA';

export type PrioridadTarea = 'ALTA' | 'MEDIA' | 'BAJA';
export type EstadoFormularioOperativo = 'NO_INICIADO' | 'EN_PROGRESO' | 'COMPLETADO';
export type TipoCampoFormulario = 'TEXTO' | 'NUMERO' | 'FECHA' | 'BOOLEANO' | 'SELECT' | 'AREA_TEXTO' | 'ARCHIVO' | 'IMAGEN';
export type AccionGestionTarea = 'INICIAR' | 'PAUSAR' | 'RETOMAR' | 'MARCAR_LISTA_PARA_RESOLVER';
export type ResultadoResolucionTarea = 'APROBADA' | 'OBSERVADA' | 'RECHAZADA';

export interface FiltroBandejaTareasRequest {
  estadoTareaOperativa?: EstadoTareaOperativa | null;
  prioridadTarea?: PrioridadTarea | null;
  tipoTramiteId?: string | null;
  departamentoId?: string | null;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
}

export interface TareaBandejaResponse {
  id: string;
  codigoTarea: string;
  codigoTramite: string;
  tipoTramiteNombre: string;
  nombreEtapa: string;
  estadoTareaOperativa: EstadoTareaOperativa;
  prioridadTarea: PrioridadTarea;
  fechaAsignacion: string;
  fechaVencimiento: string | null;
}

export interface CampoFormularioOperativoResponse {
  idCampo: string;
  nombreTecnico: string;
  etiqueta: string;
  tipoCampo: TipoCampoFormulario;
  placeholder: string | null;
  ayuda: string | null;
  valor: string | null;
  obligatorio: boolean;
  valido: boolean;
}

export interface FormularioOperativoResponse {
  formularioId: string;
  nombreFormulario: string;
  estadoFormularioOperativo: EstadoFormularioOperativo;
  campos: CampoFormularioOperativoResponse[];
}

export interface DocumentoContextoTareaResponse {
  idDocumento: string;
  nombreOriginal: string;
  mimeType: string | null;
  tamanoBytes: number | null;
  etapaAsociadaNodoId: string | null;
  fechaCarga: string | null;
}

export interface CampoContextoTareaResponse {
  idCampo: string;
  etiqueta: string;
  tipoCampo: TipoCampoFormulario;
  valor: string | null;
}

export interface EvidenciaContextoTareaResponse {
  idEvidencia: string;
  nombreOriginal: string;
  mimeType: string | null;
  tamanoBytes: number | null;
  fechaCarga: string | null;
}

export interface FormularioPrevioTareaResponse {
  tareaId: string;
  nodoId: string;
  nombreEtapa: string;
  fechaUltimoGuardado: string | null;
  campos: CampoContextoTareaResponse[];
  evidencias: EvidenciaContextoTareaResponse[];
}

export interface ContextoTramiteTareaResponse {
  datosFormularioInicio: Record<string, unknown>;
  documentosTramite: DocumentoContextoTareaResponse[];
  formulariosPrevios: FormularioPrevioTareaResponse[];
}

export interface EvidenciaOperativaResponse {
  idEvidencia: string;
  nombreOriginal: string;
  fechaCarga: string;
  descripcion: string | null;
}

export interface TareaDetalleResponse {
  id: string;
  codigoTarea: string;
  codigoTramite: string;
  tipoTramiteNombre: string;
  nombreEtapa: string;
  estadoTareaOperativa: EstadoTareaOperativa;
  prioridadTarea: PrioridadTarea;
  fechaAsignacion: string;
  responsableActual: string | null;
  formularioOperativo: FormularioOperativoResponse | null;
  contextoTramite: ContextoTramiteTareaResponse | null;
  evidencias: EvidenciaOperativaResponse[];
  historialResumido: string[];
  accionesDisponibles: string[];
}

export interface GuardarFormularioOperativoRequest {
  camposRespuesta: Array<{
    idCampo: string;
    valor: string | null;
  }>;
}

export interface GestionarEstadoOperativoTareaRequest {
  accionGestionTarea: AccionGestionTarea;
  observaciones?: string | null;
}

export interface ResolverTareaRequest {
  resultadoResolucion: ResultadoResolucionTarea;
  observaciones?: string | null;
}

export interface ResolucionTareaResponse {
  resultadoResolucion: ResultadoResolucionTarea;
  fechaResolucion: string;
  nodoSiguienteId: string | null;
  mensaje: string;
}

export interface MensajeResponse {
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class TareasOperativasService {
  private readonly apiBaseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  listarBandeja(filtro?: FiltroBandejaTareasRequest): Observable<TareaBandejaResponse[]> {
    let params = new HttpParams();
    if (filtro?.estadoTareaOperativa) {
      params = params.set('estadoTareaOperativa', filtro.estadoTareaOperativa);
    }
    if (filtro?.prioridadTarea) {
      params = params.set('prioridadTarea', filtro.prioridadTarea);
    }
    if (filtro?.tipoTramiteId && filtro.tipoTramiteId.trim().length > 0) {
      params = params.set('tipoTramiteId', filtro.tipoTramiteId.trim());
    }
    if (filtro?.departamentoId && filtro.departamentoId.trim().length > 0) {
      params = params.set('departamentoId', filtro.departamentoId.trim());
    }
    if (filtro?.fechaDesde) {
      params = params.set('fechaDesde', filtro.fechaDesde);
    }
    if (filtro?.fechaHasta) {
      params = params.set('fechaHasta', filtro.fechaHasta);
    }
    return this.http.get<TareaBandejaResponse[]>(`${this.apiBaseUrl}/api/v1/tareas/bandeja`, {
      headers: this.authHeaders(),
      params,
    });
  }

  obtenerDetalle(tareaId: string): Observable<TareaDetalleResponse> {
    return this.http.get<TareaDetalleResponse>(`${this.apiBaseUrl}/api/v1/tareas/${tareaId}`, {
      headers: this.authHeaders(),
    });
  }

  obtenerFormulario(tareaId: string): Observable<FormularioOperativoResponse> {
    return this.http.get<FormularioOperativoResponse>(`${this.apiBaseUrl}/api/v1/tareas/${tareaId}/formulario-operativo`, {
      headers: this.authHeaders(),
    });
  }

  guardarFormulario(tareaId: string, payload: GuardarFormularioOperativoRequest): Observable<FormularioOperativoResponse> {
    return this.http.put<FormularioOperativoResponse>(`${this.apiBaseUrl}/api/v1/tareas/${tareaId}/formulario-operativo`, payload, {
      headers: this.authHeaders(),
    });
  }

  gestionarTarea(tareaId: string, payload: GestionarEstadoOperativoTareaRequest): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(`${this.apiBaseUrl}/api/v1/tareas/${tareaId}/gestion-operativa`, payload, {
      headers: this.authHeaders(),
    });
  }

  adjuntarEvidencia(tareaId: string, descripcion: string | null, archivo: File): Observable<EvidenciaOperativaResponse> {
    const formData = new FormData();
    if (descripcion && descripcion.trim().length > 0) {
      formData.append('descripcion', descripcion.trim());
    }
    formData.append('archivo', archivo);
    return this.http.post<EvidenciaOperativaResponse>(`${this.apiBaseUrl}/api/v1/tareas/${tareaId}/evidencias`, formData, {
      headers: this.authHeaders(false),
    });
  }

  listarEvidencias(tareaId: string): Observable<EvidenciaOperativaResponse[]> {
    return this.http.get<EvidenciaOperativaResponse[]>(`${this.apiBaseUrl}/api/v1/tareas/${tareaId}/evidencias`, {
      headers: this.authHeaders(),
    });
  }

  resolverTarea(tareaId: string, payload: ResolverTareaRequest): Observable<ResolucionTareaResponse> {
    return this.http.post<ResolucionTareaResponse>(`${this.apiBaseUrl}/api/v1/tareas/${tareaId}/resolver`, payload, {
      headers: this.authHeaders(),
    });
  }

  private authHeaders(withJsonContentType = true): HttpHeaders {
    const accessToken = localStorage.getItem('accessToken');
    const tokenType = localStorage.getItem('tokenType') ?? 'Bearer';
    let headers = new HttpHeaders();
    if (withJsonContentType) {
      headers = headers.set('Content-Type', 'application/json');
    }
    return accessToken ? headers.set('Authorization', `${tokenType} ${accessToken}`) : headers;
  }
}

