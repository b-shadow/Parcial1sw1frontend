import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../nucleo/autenticacion/auth.service';
import { AuditoriaDetalle, AuditoriaResumen, FiltroAuditoria, ModuloAuditado, ResultadoAuditoria } from '../modelos/auditoria.model';
import { AuditoriaService } from '../servicios/auditoria.service';

@Component({
  selector: 'app-auditoria-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5">
      <section class="rounded-2xl border border-violet-300/60 bg-white/85 p-6 dark:border-violet-500/20 dark:bg-violet-900/30">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Supervision</p>
        <h1 class="m-0 mt-1 text-3xl font-semibold text-violet-950 dark:text-violet-50">Bitacora y auditoria</h1>
        <p class="m-0 mt-2 text-violet-700 dark:text-violet-200">
          Consulta de eventos del sistema con filtros por fecha, usuario, modulo, accion y resultado.
        </p>
      </section>

      @if (!esAdministrador()) {
        <p class="rounded-xl border border-rose-300/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
          Solo el rol Administrador puede consultar esta vista.
        </p>
      } @else {
        @if (error()) {
          <p class="rounded-xl border border-rose-300/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">{{ error() }}</p>
        }

        <section class="rounded-2xl border border-violet-300/50 bg-white/90 p-4 dark:border-violet-500/20 dark:bg-violet-900/30">
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label class="text-xs font-semibold text-violet-800">
              Fecha desde
              <input [(ngModel)]="filtro.fechaDesde" type="date" class="mt-1 h-10 w-full rounded-xl border border-violet-300/70 px-3 text-sm" />
            </label>
            <label class="text-xs font-semibold text-violet-800">
              Fecha hasta
              <input [(ngModel)]="filtro.fechaHasta" type="date" class="mt-1 h-10 w-full rounded-xl border border-violet-300/70 px-3 text-sm" />
            </label>
            <label class="text-xs font-semibold text-violet-800">
              Usuario (id/correo)
              <input [(ngModel)]="filtro.actor" type="text" placeholder="admin@gmail.com" class="mt-1 h-10 w-full rounded-xl border border-violet-300/70 px-3 text-sm" />
            </label>
            <label class="text-xs font-semibold text-violet-800">
              Accion
              <input [(ngModel)]="filtro.accion" type="text" placeholder="REGISTRO_TRAMITE" class="mt-1 h-10 w-full rounded-xl border border-violet-300/70 px-3 text-sm" />
            </label>
            <label class="text-xs font-semibold text-violet-800">
              Modulo
              <select [(ngModel)]="filtro.moduloAuditado" class="mt-1 h-10 w-full rounded-xl border border-violet-300/70 px-3 text-sm">
                <option value="">Todos</option>
                @for (item of modulos; track item) {
                  <option [value]="item">{{ item }}</option>
                }
              </select>
            </label>
            <label class="text-xs font-semibold text-violet-800">
              Resultado
              <select [(ngModel)]="filtro.resultadoAuditoria" class="mt-1 h-10 w-full rounded-xl border border-violet-300/70 px-3 text-sm">
                <option value="">Todos</option>
                @for (item of resultados; track item) {
                  <option [value]="item">{{ item }}</option>
                }
              </select>
            </label>
            <label class="text-xs font-semibold text-violet-800">
              Entidad
              <input [(ngModel)]="filtro.entidad" type="text" placeholder="Tramite / Tarea" class="mt-1 h-10 w-full rounded-xl border border-violet-300/70 px-3 text-sm" />
            </label>
            <label class="text-xs font-semibold text-violet-800">
              Entidad ID
              <input [(ngModel)]="filtro.entidadId" type="text" placeholder="ID" class="mt-1 h-10 w-full rounded-xl border border-violet-300/70 px-3 text-sm" />
            </label>
          </div>

          <div class="mt-3 grid gap-2 sm:grid-cols-3">
            <button type="button" (click)="consultar()" [disabled]="loading()" class="h-10 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-sm font-semibold text-white disabled:opacity-60">
              {{ loading() ? 'Consultando...' : 'Aplicar filtros' }}
            </button>
            <button type="button" (click)="limpiar()" class="h-10 rounded-xl border border-violet-300/70 px-3 text-sm font-semibold text-violet-700">Limpiar</button>
            <button type="button" (click)="consultar()" class="h-10 rounded-xl border border-violet-300/70 px-3 text-sm font-semibold text-violet-700">Refrescar</button>
          </div>
        </section>

        <section class="rounded-2xl border border-violet-300/50 bg-white/90 p-4 dark:border-violet-500/20 dark:bg-violet-900/30">
          <div class="overflow-x-auto">
            <table class="min-w-full text-left text-xs">
              <thead>
                <tr class="border-b border-violet-200/70 text-violet-900">
                  <th class="px-2 py-2">Fecha</th>
                  <th class="px-2 py-2">Usuario</th>
                  <th class="px-2 py-2">IP</th>
                  <th class="px-2 py-2">Modulo</th>
                  <th class="px-2 py-2">Accion</th>
                  <th class="px-2 py-2">Entidad</th>
                  <th class="px-2 py-2">Resultado</th>
                  <th class="px-2 py-2">Detalle</th>
                </tr>
              </thead>
              <tbody>
                @for (evento of eventos(); track evento.id) {
                  <tr class="border-b border-violet-100/80">
                    <td class="px-2 py-2">{{ formatearFecha(evento.fechaEvento) }}</td>
                    <td class="px-2 py-2">{{ evento.actorNombreSnapshot || evento.actorId || 'N/A' }}</td>
                    <td class="px-2 py-2">{{ evento.ipOrigen || 'N/A' }}</td>
                    <td class="px-2 py-2">{{ evento.moduloAuditado || 'N/A' }}</td>
                    <td class="px-2 py-2 font-semibold">{{ evento.accion }}</td>
                    <td class="px-2 py-2">{{ evento.entidad }}</td>
                    <td class="px-2 py-2">{{ evento.resultadoAuditoria || 'N/A' }}</td>
                    <td class="px-2 py-2">
                      <button type="button" (click)="verDetalle(evento.id)" class="rounded-lg border border-violet-300/70 px-2 py-1 text-[11px] font-semibold text-violet-700">
                        Ver
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="px-2 py-6 text-center text-sm text-violet-700">
                      {{ hayFiltrosActivos() ? 'No se encontraron registros para los filtros aplicados.' : 'No existen eventos de auditoria para mostrar.' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        @if (mostrarDetalle() && detalle()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/45 p-4">
            <section class="w-full max-w-3xl rounded-2xl border border-violet-300/60 bg-white p-5 shadow-2xl dark:border-violet-500/20 dark:bg-violet-950">
              <div class="flex items-center justify-between">
                <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Detalle del evento</h3>
                <button type="button" (click)="cerrarDetalle()" class="rounded-lg border border-violet-300/70 px-3 py-1 text-xs font-semibold text-violet-700">Cerrar</button>
              </div>

              <div class="mt-4 grid gap-2 sm:grid-cols-2">
                <p class="m-0 text-xs"><span class="font-semibold">Usuario:</span> {{ detalle()!.actorNombreSnapshot || detalle()!.actorId || 'N/A' }}</p>
                <p class="m-0 text-xs"><span class="font-semibold">Rol:</span> {{ detalle()!.rolActor || 'N/A' }}</p>
                <p class="m-0 text-xs"><span class="font-semibold">IP:</span> {{ detalle()!.ipOrigen || 'N/A' }}</p>
                <p class="m-0 text-xs"><span class="font-semibold">UserAgent:</span> {{ detalle()!.userAgent || 'N/A' }}</p>
                <p class="m-0 text-xs"><span class="font-semibold">Fecha:</span> {{ formatearFecha(detalle()!.fechaEvento) }}</p>
                <p class="m-0 text-xs"><span class="font-semibold">Modulo:</span> {{ detalle()!.moduloAuditado || 'N/A' }}</p>
                <p class="m-0 text-xs"><span class="font-semibold">Accion:</span> {{ detalle()!.accion }}</p>
                <p class="m-0 text-xs"><span class="font-semibold">Resultado:</span> {{ detalle()!.resultadoAuditoria || 'N/A' }}</p>
                <p class="m-0 text-xs"><span class="font-semibold">Entidad:</span> {{ detalle()!.entidad }}</p>
                <p class="m-0 text-xs"><span class="font-semibold">Entidad ID:</span> {{ detalle()!.entidadId || 'N/A' }}</p>
              </div>

              <div class="mt-3 rounded-xl border border-violet-300/50 bg-violet-50/60 p-3">
                <p class="m-0 text-xs font-semibold text-violet-800">Descripcion</p>
                <p class="m-0 mt-1 text-xs text-violet-700">{{ detalle()!.descripcion || 'Sin descripcion.' }}</p>
              </div>

              <div class="mt-3 rounded-xl border border-violet-300/50 bg-white/80 p-3">
                <p class="m-0 text-xs font-semibold text-violet-800">Campos relevantes</p>
                @if (detalle()!.cambios.length === 0) {
                  <p class="m-0 mt-2 text-xs text-violet-700">Sin campos adicionales.</p>
                } @else {
                  <div class="mt-2 grid gap-2 sm:grid-cols-2">
                    @for (cambio of detalle()!.cambios; track cambio.campo) {
                      <article class="rounded-lg border border-violet-200/70 bg-violet-100/40 p-2 text-xs">
                        <p class="m-0 font-semibold text-violet-900">{{ cambio.campo }}</p>
                        <p class="m-0 mt-1 text-violet-700"><span class="font-semibold">Anterior:</span> {{ cambio.valorAnterior || 'N/A' }}</p>
                        <p class="m-0 mt-1 text-violet-700"><span class="font-semibold">Nuevo:</span> {{ cambio.valorNuevo || 'N/A' }}</p>
                      </article>
                    }
                  </div>
                }
              </div>
            </section>
          </div>
        }
      }
    </div>
  `,
})
export class AuditoriaPageComponent implements OnInit {
  readonly loading = signal(false);
  readonly error = signal('');
  readonly eventos = signal<AuditoriaResumen[]>([]);
  readonly detalle = signal<AuditoriaDetalle | null>(null);
  readonly mostrarDetalle = signal(false);
  readonly esAdministrador = signal(false);

  readonly modulos: ModuloAuditado[] = [
    'AUTENTICACION',
    'ADMINISTRACION',
    'DISENO_TRAMITES',
    'TRAMITES',
    'TAREAS',
    'NOTIFICACIONES',
    'SUPERVISION',
  ];
  readonly resultados: ResultadoAuditoria[] = ['EXITOSA', 'FALLIDA', 'PARCIAL'];

  filtro: FiltroAuditoria = {
    fechaDesde: '',
    fechaHasta: '',
    actor: '',
    actorId: '',
    accion: '',
    moduloAuditado: undefined,
    entidad: '',
    entidadId: '',
    resultadoAuditoria: undefined,
  };

  constructor(
    private readonly auditoriaService: AuditoriaService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    const sesion = this.authService.getUsuarioSesion();
    this.esAdministrador.set(sesion?.rol === 'ADMINISTRADOR');
    if (this.esAdministrador()) {
      this.consultar();
    }
  }

  consultar(): void {
    if (!this.esAdministrador()) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auditoriaService.listar(this.filtro).subscribe({
      next: (items) => {
        this.eventos.set(items);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(this.extraerMensajeError(error));
        this.loading.set(false);
      },
    });
  }

  limpiar(): void {
    this.filtro = {
      fechaDesde: '',
      fechaHasta: '',
      actor: '',
      actorId: '',
      accion: '',
      moduloAuditado: undefined,
      entidad: '',
      entidadId: '',
      resultadoAuditoria: undefined,
    };
    this.consultar();
  }

  verDetalle(eventoId: string): void {
    this.error.set('');
    this.auditoriaService.obtener(eventoId).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.mostrarDetalle.set(true);
      },
      error: (error: unknown) => {
        this.error.set(this.extraerMensajeError(error));
      },
    });
  }

  cerrarDetalle(): void {
    this.mostrarDetalle.set(false);
    this.detalle.set(null);
  }

  hayFiltrosActivos(): boolean {
    return Object.values(this.filtro).some((value) => value !== undefined && value !== null && `${value}`.trim() !== '');
  }

  formatearFecha(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  }

  private extraerMensajeError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo consultar la auditoria.';
    }
    const backendMessage =
      error.error && typeof error.error === 'object'
        ? ((error.error as { message?: string; mensaje?: string }).message ?? (error.error as { message?: string; mensaje?: string }).mensaje)
        : undefined;
    if (backendMessage) {
      return backendMessage;
    }
    return 'No se pudo consultar la auditoria.';
  }
}

