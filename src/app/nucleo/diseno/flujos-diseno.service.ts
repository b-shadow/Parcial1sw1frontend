import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type EstadoTipoTramite = 'ACTIVO' | 'INACTIVO';
export type EstadoFlujo = 'BORRADOR' | 'CONFIGURACION' | 'PUBLICADO' | 'DESACTIVADO';
export type OrigenConstruccionFlujo = 'MANUAL' | 'CLONADO' | 'PROMPT' | 'FORMULARIO_GUIADO' | 'EDICION_GRAFICA';

export interface MensajeResponse {
  mensaje: string;
}

export interface TipoTramiteResumenResponse {
  id: string;
  nombre: string;
  categoria: string;
  estadoTipoTramite: EstadoTipoTramite;
}

export interface TipoTramiteResponse {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  estadoTipoTramite: EstadoTipoTramite;
  flujoPublicadoId: string | null;
  versionPublicada: number | null;
}

export interface FlujoTramiteResumenResponse {
  id: string;
  tipoTramiteId: string;
  nombre: string;
  version: number;
  estadoFlujo: EstadoFlujo;
}

export interface ValidacionEstructuraFlujoResponse {
  valido: boolean;
  errores: string[];
  advertencias: string[];
  fechaValidacion: string;
}

export interface FlujoTramiteResponse {
  id: string;
  tipoTramiteId: string;
  nombre: string;
  descripcion: string | null;
  version: number;
  estadoFlujo: EstadoFlujo;
  origenConstruccion: OrigenConstruccionFlujo;
  resultadoValidacion: ValidacionEstructuraFlujoResponse | null;
}

export interface FlujoClonadoResponse {
  flujoOrigenId: string;
  flujoNuevoId: string;
  versionNueva: number;
}

export interface ConfiguracionFlujoResponse {
  id: string;
  resultadoValidacion: ValidacionEstructuraFlujoResponse | null;
  nodos: unknown[];
  transiciones: unknown[];
  reglasGlobales: unknown[];
  bpmnXml?: string | null;
}

export interface FormularioDepartamentoResponse {
  departamentoId: string;
  nombreFormulario: string;
  descripcion: string | null;
  versionInterna: number | null;
  campos: unknown[];
}

export interface FlujoVisualizacionResponse {
  id: string;
  nombre: string;
  version: number;
  estadoFlujo: EstadoFlujo;
  nodos: unknown[];
  transiciones: unknown[];
  formulariosDepartamento: unknown[];
  reglasGlobales: unknown[];
}

export interface ResultadoConstruccionFlujoResponse {
  flujoId: string;
  estadoFlujo: EstadoFlujo;
  origenConstruccion: OrigenConstruccionFlujo;
  resultadoValidacion: ValidacionEstructuraFlujoResponse | null;
  advertencias: string[];
}

export interface DepartamentoDisenoResponse {
  id: string;
  nombre: string;
  descripcion: string | null;
  codigo: string;
  estadoDepartamento: 'ACTIVO' | 'INACTIVO';
}

export interface CrearFlujoTramiteRequest {
  tipoTramiteId: string;
  nombre: string;
  descripcion: string;
  version: number;
  observaciones: string;
}

export interface CrearTipoTramiteRequest {
  nombre: string;
  descripcion: string;
  categoria: string;
}

export interface ActualizarTipoTramiteRequest {
  nombre: string;
  descripcion: string;
  categoria: string;
}

export interface CambiarEstadoTipoTramiteRequest {
  estadoTipoTramite: EstadoTipoTramite;
}

export interface ActualizarFlujoTramiteRequest {
  tipoTramiteId?: string;
  nombre: string;
  descripcion: string;
  observaciones: string;
}

export interface ClonarVersionFlujoRequest {
  nombre: string;
  descripcion: string;
  observaciones: string;
}

export interface CambiarEstadoFlujoRequest {
  estadoFlujo: EstadoFlujo;
}

export interface ConfigurarFlujoRequest {
  nodos: unknown[];
  transiciones: unknown[];
  reglasGlobales: unknown[];
  bpmnXml?: string;
}

export interface EditarFormularioDepartamentoRequest {
  departamentoId: string;
  nombreFormulario: string;
  descripcion: string;
  campos: unknown[];
}

export interface GenerarFlujoDesdePromptRequest {
  tipoTramiteId: string;
  nombre: string;
  prompt: string;
}

export interface EditarFlujoDesdePromptRequest {
  prompt: string;
}

export interface EditarFormularioActividadDesdePromptRequest {
  prompt: string;
}

export interface TranscripcionPromptAudioResponse {
  text: string;
  usedFallback: boolean;
  warning: string | null;
}

export interface ConstruirFlujoFormularioGuiadoRequest {
  tipoTramiteId: string;
  nombre: string;
  descripcion: string;
  nodos: unknown[];
  transiciones: unknown[];
  reglasGlobales: unknown[];
}

export interface ConstruirFlujoEdicionGraficaRequest {
  tipoTramiteId: string;
  nombre: string;
  descripcion: string;
  nodos: unknown[];
  transiciones: unknown[];
  layout: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class FlujosDisenoService {
  private readonly apiBaseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  listarTiposTramite(): Observable<TipoTramiteResumenResponse[]> {
    return this.http.get<TipoTramiteResumenResponse[]>(`${this.apiBaseUrl}/api/v1/diseno-tramites/tipos-tramite`, {
      headers: this.authHeaders(),
    });
  }

  obtenerTipoTramite(tipoTramiteId: string): Observable<TipoTramiteResponse> {
    return this.http.get<TipoTramiteResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/tipos-tramite/${tipoTramiteId}`, {
      headers: this.authHeaders(),
    });
  }

  crearTipoTramite(payload: CrearTipoTramiteRequest): Observable<TipoTramiteResponse> {
    return this.http.post<TipoTramiteResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/tipos-tramite`, payload, {
      headers: this.authHeaders(),
    });
  }

  actualizarTipoTramite(tipoTramiteId: string, payload: ActualizarTipoTramiteRequest): Observable<TipoTramiteResponse> {
    return this.http.put<TipoTramiteResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/tipos-tramite/${tipoTramiteId}`, payload, {
      headers: this.authHeaders(),
    });
  }

  cambiarEstadoTipoTramite(tipoTramiteId: string, payload: CambiarEstadoTipoTramiteRequest): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/tipos-tramite/${tipoTramiteId}/estado`, payload, {
      headers: this.authHeaders(),
    });
  }

  listarFlujos(): Observable<FlujoTramiteResumenResponse[]> {
    return this.http.get<FlujoTramiteResumenResponse[]>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos`, {
      headers: this.authHeaders(),
    });
  }

  obtenerFlujo(flujoId: string): Observable<FlujoTramiteResponse> {
    return this.http.get<FlujoTramiteResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/${flujoId}`, {
      headers: this.authHeaders(),
    });
  }

  crearFlujo(payload: CrearFlujoTramiteRequest): Observable<FlujoTramiteResponse> {
    return this.http.post<FlujoTramiteResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos`, payload, {
      headers: this.authHeaders(),
    });
  }

  actualizarFlujo(flujoId: string, payload: ActualizarFlujoTramiteRequest): Observable<FlujoTramiteResponse> {
    return this.http.put<FlujoTramiteResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/${flujoId}`, payload, {
      headers: this.authHeaders(),
    });
  }

  clonarFlujo(flujoId: string, payload: ClonarVersionFlujoRequest): Observable<FlujoClonadoResponse> {
    return this.http.post<FlujoClonadoResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/${flujoId}/clonar`, payload, {
      headers: this.authHeaders(),
    });
  }

  cambiarEstadoFlujo(flujoId: string, payload: CambiarEstadoFlujoRequest): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/${flujoId}/estado`, payload, {
      headers: this.authHeaders(),
    });
  }

  obtenerConfiguracion(flujoId: string): Observable<ConfiguracionFlujoResponse> {
    return this.http.get<ConfiguracionFlujoResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/${flujoId}/configuracion`, {
      headers: this.authHeaders(),
    });
  }

  guardarConfiguracion(flujoId: string, payload: ConfigurarFlujoRequest): Observable<ConfiguracionFlujoResponse> {
    return this.http.put<ConfiguracionFlujoResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/${flujoId}/configuracion`, payload, {
      headers: this.authHeaders(),
    });
  }

  obtenerFormulario(flujoId: string, departamentoId: string): Observable<FormularioDepartamentoResponse> {
    return this.http.get<FormularioDepartamentoResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/${flujoId}/formularios/${departamentoId}`, {
      headers: this.authHeaders(),
    });
  }

  editarFormulario(
    flujoId: string,
    departamentoId: string,
    payload: EditarFormularioDepartamentoRequest,
  ): Observable<FormularioDepartamentoResponse> {
    return this.http.put<FormularioDepartamentoResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/${flujoId}/formularios/${departamentoId}`, payload, {
      headers: this.authHeaders(),
    });
  }

  visualizarFlujo(flujoId: string): Observable<FlujoVisualizacionResponse> {
    return this.http.get<FlujoVisualizacionResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/${flujoId}/visualizacion`, {
      headers: this.authHeaders(),
    });
  }

  generarDesdePrompt(payload: GenerarFlujoDesdePromptRequest): Observable<ResultadoConstruccionFlujoResponse> {
    return this.http.post<ResultadoConstruccionFlujoResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/generar-desde-prompt`, payload, {
      headers: this.authHeaders(),
    });
  }

  editarDesdePrompt(flujoId: string, payload: EditarFlujoDesdePromptRequest): Observable<ResultadoConstruccionFlujoResponse> {
    return this.http.post<ResultadoConstruccionFlujoResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/${flujoId}/editar-desde-prompt`, payload, {
      headers: this.authHeaders(),
    });
  }

  editarFormularioActividadDesdePrompt(
    flujoId: string,
    nodoId: string,
    payload: EditarFormularioActividadDesdePromptRequest,
  ): Observable<ResultadoConstruccionFlujoResponse> {
    return this.http.post<ResultadoConstruccionFlujoResponse>(
      `${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/${flujoId}/nodos/${nodoId}/editar-formulario-desde-prompt`,
      payload,
      {
        headers: this.authHeaders(),
      },
    );
  }

  transcribirPromptAudio(file: Blob, language = 'es'): Observable<TranscripcionPromptAudioResponse> {
    const formData = new FormData();
    formData.append('file', file, 'dictado.webm');
    formData.append('language', language);
    return this.http.post<TranscripcionPromptAudioResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/prompt/transcribir-audio`, formData, {
      headers: this.authHeaders(false),
    });
  }

  transcribirPromptPdf(file: File): Observable<TranscripcionPromptAudioResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name || 'proceso.pdf');
    return this.http.post<TranscripcionPromptAudioResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/prompt/transcribir-pdf`, formData, {
      headers: this.authHeaders(false),
    });
  }

  construirDesdeFormulario(payload: ConstruirFlujoFormularioGuiadoRequest): Observable<ResultadoConstruccionFlujoResponse> {
    return this.http.post<ResultadoConstruccionFlujoResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/construir-desde-formulario`, payload, {
      headers: this.authHeaders(),
    });
  }

  construirDesdeEditorGrafico(payload: ConstruirFlujoEdicionGraficaRequest): Observable<ResultadoConstruccionFlujoResponse> {
    return this.http.post<ResultadoConstruccionFlujoResponse>(`${this.apiBaseUrl}/api/v1/diseno-tramites/flujos/construir-desde-editor-grafico`, payload, {
      headers: this.authHeaders(),
    });
  }

  listarDepartamentos(): Observable<DepartamentoDisenoResponse[]> {
    return this.http.get<DepartamentoDisenoResponse[]>(`${this.apiBaseUrl}/api/v1/administracion/departamentos`, {
      headers: this.authHeaders(),
    });
  }

  private authHeaders(jsonContentType = true): HttpHeaders {
    const accessToken = localStorage.getItem('accessToken');
    const tokenType = localStorage.getItem('tokenType') ?? 'Bearer';
    let headers = new HttpHeaders();
    if (jsonContentType) {
      headers = headers.set('Content-Type', 'application/json');
    }
    return accessToken ? headers.set('Authorization', `${tokenType} ${accessToken}`) : headers;
  }
}
