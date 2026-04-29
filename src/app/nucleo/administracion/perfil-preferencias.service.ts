import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type RolUsuario = 'ADMINISTRADOR' | 'EJECUTIVO' | 'USUARIO';
export type CanalNotificacion = 'PLATAFORMA' | 'CORREO' | 'PUSH';
export type TipoNotificacion = 'ACTUALIZACION_TRAMITE' | 'ASIGNACION_TAREA' | 'OBSERVACION' | 'RECHAZO' | 'APROBACION';
export type FrecuenciaNotificacion = 'INMEDIATA' | 'AGRUPADA' | 'DIARIA';

export interface PerfilResponse {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string | null;
  direccion: string | null;
  rol: RolUsuario;
}

export interface ActualizarPerfilRequest {
  nombres: string;
  apellidos: string;
  telefono: string;
  direccion: string;
}

export interface CambiarContrasenaRequest {
  contrasenaActual: string;
  nuevaContrasena: string;
  confirmacionNuevaContrasena: string;
}

export interface PreferenciasNotificacionResponse {
  canalesHabilitados: CanalNotificacion[];
  tiposNotificacionHabilitados: TipoNotificacion[];
  frecuencia: FrecuenciaNotificacion;
  agruparNoCriticas: boolean;
  recibirObligatorias: boolean;
}

export interface ActualizarPreferenciasNotificacionRequest {
  canalesHabilitados: CanalNotificacion[];
  tiposNotificacionHabilitados: TipoNotificacion[];
  frecuencia: FrecuenciaNotificacion;
  agruparNoCriticas: boolean;
}

export interface MensajeResponse {
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class PerfilPreferenciasService {
  private readonly apiBaseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  obtenerPerfil(): Observable<PerfilResponse> {
    return this.http.get<PerfilResponse>(`${this.apiBaseUrl}/api/v1/administracion/perfil`, {
      headers: this.authHeaders(),
    });
  }

  actualizarPerfil(payload: ActualizarPerfilRequest): Observable<PerfilResponse> {
    return this.http.put<PerfilResponse>(`${this.apiBaseUrl}/api/v1/administracion/perfil`, payload, {
      headers: this.authHeaders(),
    });
  }

  cambiarContrasena(payload: CambiarContrasenaRequest): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(`${this.apiBaseUrl}/api/v1/administracion/perfil/contrasena`, payload, {
      headers: this.authHeaders(),
    });
  }

  obtenerPreferencias(): Observable<PreferenciasNotificacionResponse> {
    return this.http.get<PreferenciasNotificacionResponse>(
      `${this.apiBaseUrl}/api/v1/administracion/preferencias-notificacion`,
      {
        headers: this.authHeaders(),
      },
    );
  }

  actualizarPreferencias(payload: ActualizarPreferenciasNotificacionRequest): Observable<PreferenciasNotificacionResponse> {
    return this.http.put<PreferenciasNotificacionResponse>(
      `${this.apiBaseUrl}/api/v1/administracion/preferencias-notificacion`,
      payload,
      {
        headers: this.authHeaders(),
      },
    );
  }

  private authHeaders(): HttpHeaders {
    const accessToken = localStorage.getItem('accessToken');
    const tokenType = localStorage.getItem('tokenType') ?? 'Bearer';
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    return accessToken ? headers.set('Authorization', `${tokenType} ${accessToken}`) : headers;
  }
}

