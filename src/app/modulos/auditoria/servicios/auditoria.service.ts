import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuditoriaDetalle, AuditoriaResumen, FiltroAuditoria } from '../modelos/auditoria.model';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly apiBaseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  listar(filtro: FiltroAuditoria): Observable<AuditoriaResumen[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filtro)) {
      if (value !== undefined && value !== null && `${value}`.trim() !== '') {
        params = params.set(key, `${value}`);
      }
    }
    return this.http.get<AuditoriaResumen[]>(`${this.apiBaseUrl}/api/v1/supervision/auditoria`, {
      headers: this.authHeaders(),
      params,
    });
  }

  obtener(eventoId: string): Observable<AuditoriaDetalle> {
    return this.http.get<AuditoriaDetalle>(`${this.apiBaseUrl}/api/v1/supervision/auditoria/${eventoId}`, {
      headers: this.authHeaders(),
    });
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}

