import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { environment } from '../../../environments/environment';

export type RolUsuarioSesion = 'ADMINISTRADOR' | 'ADMINISTRATIVO' | 'EJECUTIVO' | 'USUARIO';

export interface LoginRequest {
  correo: string;
  contrasena: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tipoToken: string;
  expiraEn: number;
  usuario: {
    id: string;
    nombres: string;
    apellidos: string;
    correo: string;
    rol: RolUsuarioSesion;
  };
}

export interface UsuarioSesion {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: RolUsuarioSesion;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

export interface MensajeResponse {
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiBaseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/api/v1/auth/login`, payload);
  }

  logout(): Observable<MensajeResponse | null> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return of(null);
    }

    const payload: RefreshTokenRequest = { refreshToken };
    return this.http.post<MensajeResponse>(`${this.apiBaseUrl}/api/v1/auth/logout`, payload);
  }

  saveSession(response: LoginResponse): void {
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('tokenType', response.tipoToken);
    localStorage.setItem('tokenExpiresIn', String(response.expiraEn));
    localStorage.setItem('usuarioSesion', JSON.stringify(response.usuario));
  }

  clearSession(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenType');
    localStorage.removeItem('tokenExpiresIn');
    localStorage.removeItem('usuarioSesion');
  }

  getUsuarioSesion(): UsuarioSesion | null {
    const raw = localStorage.getItem('usuarioSesion');
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as UsuarioSesion;
    } catch {
      return null;
    }
  }

  normalizeRol(rol: RolUsuarioSesion): 'ADMINISTRATIVO' | 'EJECUTIVO' | 'USUARIO' {
    if (rol === 'ADMINISTRADOR') {
      return 'ADMINISTRATIVO';
    }
    if (rol === 'EJECUTIVO') {
      return 'EJECUTIVO';
    }
    return 'USUARIO';
  }

  isRolPermitidoFrontend(rol: RolUsuarioSesion): boolean {
    const normalized = this.normalizeRol(rol);
    return normalized === 'ADMINISTRATIVO' || normalized === 'EJECUTIVO';
  }

  extractErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No fue posible iniciar sesion. Intenta nuevamente.';
    }

    const backendMessage = error.error && typeof error.error === 'object' ? (error.error as { message?: string }).message : undefined;
    if (backendMessage) {
      return backendMessage;
    }

    if (error.status === 0) {
      return 'No se pudo conectar con el backend.';
    }

    return 'No fue posible iniciar sesion. Verifica tus credenciales.';
  }
}
