import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuditoriaUiService {
  private readonly apiBaseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  registrar(accion: string, descripcion: string, metadata: Record<string, unknown> = {}, resultado = 'EXITO'): void {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return;
    }
    this.http
      .post<void>(
        `${this.apiBaseUrl}/api/v1/supervision/auditoria/eventos-ui`,
        { accion, descripcion, resultado, metadata },
        { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
      )
      .subscribe({
        next: () => undefined,
        error: () => undefined,
      });
  }
}

