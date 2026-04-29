import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { RolUsuarioAdmin } from './usuarios-admin.service';

export type EstadoDepartamentoAdmin = 'ACTIVO' | 'INACTIVO';

export interface DepartamentoResponse {
  id: string;
  nombre: string;
  descripcion: string | null;
  codigo: string;
  estadoDepartamento: EstadoDepartamentoAdmin;
}

export interface DepartamentoResumenResponse {
  id: string;
  nombre: string;
  estadoDepartamento: EstadoDepartamentoAdmin;
}

export interface CrearDepartamentoRequest {
  nombre: string;
  descripcion: string;
  codigo: string;
}

export interface ActualizarDepartamentoRequest {
  nombre: string;
  descripcion: string;
}

export interface CambiarEstadoDepartamentoRequest {
  estadoDepartamento: EstadoDepartamentoAdmin;
}

export interface AsignarDepartamentosRequest {
  departamentoIds: string[];
}

export interface AsignacionDepartamentosResponse {
  usuarioId: string;
  rol: RolUsuarioAdmin;
  departamentoIds: string[];
  departamentos: DepartamentoResumenResponse[];
}

export interface MensajeResponse {
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class DepartamentosAdminService {
  private readonly apiBaseUrl = environment.apiUrl;
  private readonly resource = `${this.apiBaseUrl}/api/v1/administracion/departamentos`;

  constructor(private readonly http: HttpClient) {}

  listarDepartamentos(): Observable<DepartamentoResponse[]> {
    return this.http.get<DepartamentoResponse[]>(this.resource, { headers: this.authHeaders() });
  }

  obtenerDepartamento(departamentoId: string): Observable<DepartamentoResponse> {
    return this.http.get<DepartamentoResponse>(`${this.resource}/${departamentoId}`, { headers: this.authHeaders() });
  }

  crearDepartamento(payload: CrearDepartamentoRequest): Observable<DepartamentoResponse> {
    return this.http.post<DepartamentoResponse>(this.resource, payload, { headers: this.authHeaders() });
  }

  actualizarDepartamento(departamentoId: string, payload: ActualizarDepartamentoRequest): Observable<DepartamentoResponse> {
    return this.http.put<DepartamentoResponse>(`${this.resource}/${departamentoId}`, payload, { headers: this.authHeaders() });
  }

  cambiarEstadoDepartamento(
    departamentoId: string,
    payload: CambiarEstadoDepartamentoRequest,
  ): Observable<MensajeResponse> {
    return this.http.patch<MensajeResponse>(`${this.resource}/${departamentoId}/estado`, payload, { headers: this.authHeaders() });
  }

  obtenerAsignacion(usuarioId: string): Observable<AsignacionDepartamentosResponse> {
    return this.http.get<AsignacionDepartamentosResponse>(`${this.apiBaseUrl}/api/v1/administracion/usuarios/${usuarioId}/departamentos`, {
      headers: this.authHeaders(),
    });
  }

  asignarDepartamentos(usuarioId: string, payload: AsignarDepartamentosRequest): Observable<AsignacionDepartamentosResponse> {
    return this.http.put<AsignacionDepartamentosResponse>(`${this.apiBaseUrl}/api/v1/administracion/usuarios/${usuarioId}/departamentos`, payload, {
      headers: this.authHeaders(),
    });
  }

  private authHeaders(): HttpHeaders {
    const accessToken = localStorage.getItem('accessToken');
    const tokenType = localStorage.getItem('tokenType') ?? 'Bearer';
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return accessToken ? headers.set('Authorization', `${tokenType} ${accessToken}`) : headers;
  }
}

