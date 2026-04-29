import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type EstadoTramite = 'REGISTRADO' | 'EN_PROCESO' | 'PAUSADO' | 'PENDIENTE_SUBSANACION' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO';
export type TipoCampoFormularioInicio = 'TEXTO' | 'NUMERO' | 'FECHA' | 'BOOLEANO' | 'SELECT' | 'AREA_TEXTO' | 'ARCHIVO' | 'IMAGEN';
export type TipoDocumentoTramite = 'REQUERIDO' | 'OPCIONAL';
export type EstadoDocumentoAdjunto = 'PENDIENTE' | 'CARGADO' | 'VALIDADO' | 'OBSERVADO' | 'RECHAZADO';
export type TipoComprobanteTramite = 'REGISTRO' | 'ESTADO' | 'FINALIZACION';
export type TipoEventoHistorialTramite =
  | 'REGISTRO'
  | 'CAMBIO_ESTADO'
  | 'CAMBIO_ETAPA'
  | 'ASIGNACION'
  | 'REASIGNACION'
  | 'ADJUNTO_DOCUMENTO'
  | 'OBSERVACION'
  | 'CANCELACION'
  | 'RECHAZO'
  | 'APROBACION'
  | 'GENERACION_COMPROBANTE'
  | 'DESCARGA_COMPROBANTE';

export interface TipoTramiteDisponibleResponse {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface ClienteTramiteDisponibleResponse {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
}

export interface CampoFormularioInicioResponse {
  idCampo: string;
  etiqueta: string;
  tipoCampo: TipoCampoFormularioInicio;
  obligatorio: boolean;
  ayuda: string | null;
}

export interface RequisitosTramiteResponse {
  tipoTramiteId: string;
  tipoTramiteNombre: string;
  flujoId: string | null;
  flujoNombre: string | null;
  bpmnXml: string | null;
  documentosObligatorios: string[];
  documentosOpcionales: string[];
  camposFormularioInicio: CampoFormularioInicioResponse[];
  observaciones: string | null;
  puedeRegistrar: boolean;
}

export interface TramiteCreadoResponse {
  id: string;
  codigoTramite: string;
  tipoTramiteId: string;
  estadoTramite: EstadoTramite;
  fechaRegistro: string;
}

export interface TramiteResumenResponse {
  id: string;
  codigoTramite: string;
  tipoTramiteNombre: string;
  estadoTramite: EstadoTramite;
  nombreEtapaActual: string;
  fechaUltimaActualizacion: string;
}

export interface DocumentoTramiteResponse {
  idDocumento: string;
  nombreOriginal: string;
  tipoDocumento: TipoDocumentoTramite;
  fechaCarga: string;
  estadoDocumentoAdjunto: EstadoDocumentoAdjunto;
}

export interface ComprobanteTramiteResponse {
  idComprobante: string;
  tipoComprobante: TipoComprobanteTramite;
  fechaGeneracion: string;
  codigoVerificacion: string;
  disponibleParaDescarga: boolean;
}

export interface TramiteDetalleResponse {
  id: string;
  codigoTramite: string;
  tipoTramiteNombre: string;
  estadoTramite: EstadoTramite;
  datosFormularioInicial: Record<string, unknown>;
  etapaActual: string;
  nodosActivos: string[];
  nodosCompletados: string[];
  entregableCampos: {
    claveCampo: string;
    nodoId: string;
    nodoNombre: string;
    idCampo: string;
    etiqueta: string;
    tipoCampo: TipoCampoFormularioInicio;
    obligatorio: boolean;
    valor: string | null;
    presente: boolean;
  }[];
  fechaRegistro: string;
  puedeCancelar: boolean;
  documentos: DocumentoTramiteResponse[];
  comprobantes: ComprobanteTramiteResponse[];
}

export interface EventoHistorialTramiteResponse {
  idEvento: string;
  tipoEvento: TipoEventoHistorialTramite;
  descripcion: string;
  fechaEvento: string;
  actorNombreSnapshot: string | null;
  rolActor: 'ADMINISTRADOR' | 'ADMINISTRATIVO' | 'EJECUTIVO' | 'USUARIO' | null;
  estadoAnterior: EstadoTramite | null;
  estadoNuevo: EstadoTramite | null;
  observaciones: string | null;
}

export interface EstadoHistorialTramiteResponse {
  estadoActual: EstadoTramite;
  etapaActual: string;
  responsableActual: string | null;
  departamentoActual: string | null;
  historial: EventoHistorialTramiteResponse[];
  progreso: number | null;
}

export interface MensajeResponse {
  mensaje: string;
}

export interface RegistrarTramiteRequest {
  tipoTramiteId: string;
  datosFormularioInicial: Record<string, unknown>;
}

export interface CancelarTramiteRequest {
  motivoCancelacion: string;
}

@Injectable({ providedIn: 'root' })
export class TramitesService {
  private readonly apiBaseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  listarTiposDisponibles(): Observable<TipoTramiteDisponibleResponse[]> {
    return this.http.get<TipoTramiteDisponibleResponse[]>(`${this.apiBaseUrl}/api/v1/tramites/tipos-disponibles`, {
      headers: this.authHeaders(),
    });
  }

  buscarClientesDisponibles(query: string): Observable<ClienteTramiteDisponibleResponse[]> {
    const q = encodeURIComponent(query);
    return this.http.get<ClienteTramiteDisponibleResponse[]>(`${this.apiBaseUrl}/api/v1/tramites/clientes-disponibles?q=${q}`, {
      headers: this.authHeaders(),
    });
  }

  consultarRequisitosTipo(tipoTramiteId: string): Observable<RequisitosTramiteResponse> {
    return this.http.get<RequisitosTramiteResponse>(`${this.apiBaseUrl}/api/v1/tramites/tipos-disponibles/${tipoTramiteId}/requisitos`, {
      headers: this.authHeaders(),
    });
  }

  registrar(payload: RegistrarTramiteRequest): Observable<TramiteCreadoResponse> {
    return this.http.post<TramiteCreadoResponse>(`${this.apiBaseUrl}/api/v1/tramites`, payload, {
      headers: this.authHeaders(),
    });
  }

  listar(): Observable<TramiteResumenResponse[]> {
    return this.http.get<TramiteResumenResponse[]>(`${this.apiBaseUrl}/api/v1/tramites`, {
      headers: this.authHeaders(),
    });
  }

  listarPorEstado(estadoTramite: EstadoTramite): Observable<TramiteResumenResponse[]> {
    const query = new URLSearchParams({ estadoTramite }).toString();
    return this.http.get<TramiteResumenResponse[]>(`${this.apiBaseUrl}/api/v1/tramites?${query}`, {
      headers: this.authHeaders(),
    });
  }

  obtenerDetalle(tramiteId: string): Observable<TramiteDetalleResponse> {
    return this.http.get<TramiteDetalleResponse>(`${this.apiBaseUrl}/api/v1/tramites/${tramiteId}`, {
      headers: this.authHeaders(),
    });
  }

  consultarEstadoHistorial(tramiteId: string): Observable<EstadoHistorialTramiteResponse> {
    return this.http.get<EstadoHistorialTramiteResponse>(`${this.apiBaseUrl}/api/v1/tramites/${tramiteId}/estado-historial`, {
      headers: this.authHeaders(),
    });
  }

  consultarRequisitosTramite(tramiteId: string): Observable<RequisitosTramiteResponse> {
    return this.http.get<RequisitosTramiteResponse>(`${this.apiBaseUrl}/api/v1/tramites/${tramiteId}/requisitos`, {
      headers: this.authHeaders(),
    });
  }

  cancelar(tramiteId: string, payload: CancelarTramiteRequest): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(`${this.apiBaseUrl}/api/v1/tramites/${tramiteId}/cancelar`, payload, {
      headers: this.authHeaders(),
    });
  }

  eliminar(tramiteId: string): Observable<MensajeResponse> {
    return this.http.delete<MensajeResponse>(`${this.apiBaseUrl}/api/v1/tramites/${tramiteId}`, {
      headers: this.authHeaders(),
    });
  }

  listarDocumentos(tramiteId: string): Observable<DocumentoTramiteResponse[]> {
    return this.http.get<DocumentoTramiteResponse[]>(`${this.apiBaseUrl}/api/v1/tramites/${tramiteId}/documentos`, {
      headers: this.authHeaders(),
    });
  }

  adjuntarDocumento(
    tramiteId: string,
    payload: { tipoDocumento: TipoDocumentoTramite; requisitoId: string; descripcion?: string; etapaAsociadaNodoId?: string | null },
    archivo: File,
  ): Observable<DocumentoTramiteResponse> {
    const formData = new FormData();
    formData.append('tipoDocumento', payload.tipoDocumento);
    formData.append('requisitoId', payload.requisitoId);
    if (payload.descripcion) {
      formData.append('descripcion', payload.descripcion);
    }
    if (payload.etapaAsociadaNodoId) {
      formData.append('etapaAsociadaNodoId', payload.etapaAsociadaNodoId);
    }
    formData.append('archivo', archivo);

    return this.http.post<DocumentoTramiteResponse>(`${this.apiBaseUrl}/api/v1/tramites/${tramiteId}/documentos`, formData, {
      headers: this.authHeaders(false),
    });
  }

  descargarDocumento(tramiteId: string, documentoId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiBaseUrl}/api/v1/tramites/${tramiteId}/documentos/${documentoId}`, {
      headers: this.authHeaders(false),
      observe: 'response',
      responseType: 'blob',
    });
  }

  listarComprobantes(tramiteId: string): Observable<ComprobanteTramiteResponse[]> {
    return this.http.get<ComprobanteTramiteResponse[]>(`${this.apiBaseUrl}/api/v1/tramites/${tramiteId}/comprobantes`, {
      headers: this.authHeaders(),
    });
  }

  descargarComprobante(tramiteId: string, comprobanteId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiBaseUrl}/api/v1/tramites/${tramiteId}/comprobantes/${comprobanteId}/descargar`, {
      headers: this.authHeaders(false),
      observe: 'response',
      responseType: 'blob',
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
