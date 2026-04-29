import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type RolUsuarioAdmin = 'ADMINISTRADOR' | 'EJECUTIVO' | 'USUARIO';
export type EstadoCuentaAdmin = 'ACTIVA' | 'INACTIVA' | 'BLOQUEADA' | 'PENDIENTE';

export interface UsuarioResumenResponse {
  id: string;
  nombreCompleto: string;
  correo: string;
  rol: RolUsuarioAdmin;
  estadoCuenta: EstadoCuentaAdmin;
}

export interface UsuarioDetalleResponse {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string | null;
  direccion: string | null;
  rol: RolUsuarioAdmin;
  estadoCuenta: EstadoCuentaAdmin;
}

export interface UsuarioCreadoResponse {
  idUsuario: string;
  correo: string;
  rol: RolUsuarioAdmin;
  mensaje: string;
}

export interface CrearUsuarioRequest {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  direccion: string;
  rol: RolUsuarioAdmin;
  contrasenaTemporal: string;
}

export interface ActualizarUsuarioRequest {
  nombres: string;
  apellidos: string;
  telefono: string;
  direccion: string;
}

export interface CambiarRolUsuarioRequest {
  rol: RolUsuarioAdmin;
}

export interface CambiarEstadoUsuarioRequest {
  estadoCuenta: EstadoCuentaAdmin;
}

export interface MensajeResponse {
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosAdminService {
  private readonly apiBaseUrl = environment.apiUrl;
  private readonly resource = `${this.apiBaseUrl}/api/v1/administracion/usuarios`;

  constructor(private readonly http: HttpClient) {}

  listarUsuarios(): Observable<UsuarioResumenResponse[]> {
    return this.http.get<UsuarioResumenResponse[]>(this.resource, { headers: this.authHeaders() });
  }

  obtenerUsuario(usuarioId: string): Observable<UsuarioDetalleResponse> {
    return this.http.get<UsuarioDetalleResponse>(`${this.resource}/${usuarioId}`, { headers: this.authHeaders() });
  }

  crearUsuario(payload: CrearUsuarioRequest): Observable<UsuarioCreadoResponse> {
    return this.http.post<UsuarioCreadoResponse>(this.resource, payload, { headers: this.authHeaders() });
  }

  actualizarUsuario(usuarioId: string, payload: ActualizarUsuarioRequest): Observable<UsuarioDetalleResponse> {
    return this.http.put<UsuarioDetalleResponse>(`${this.resource}/${usuarioId}`, payload, { headers: this.authHeaders() });
  }

  cambiarRol(usuarioId: string, payload: CambiarRolUsuarioRequest): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(`${this.resource}/${usuarioId}/rol`, payload, { headers: this.authHeaders() });
  }

  cambiarEstado(usuarioId: string, payload: CambiarEstadoUsuarioRequest): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(`${this.resource}/${usuarioId}/estado`, payload, { headers: this.authHeaders() });
  }

  private authHeaders(): HttpHeaders {
    const accessToken = localStorage.getItem('accessToken');
    const tokenType = localStorage.getItem('tokenType') ?? 'Bearer';
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return accessToken ? headers.set('Authorization', `${tokenType} ${accessToken}`) : headers;
  }
}

