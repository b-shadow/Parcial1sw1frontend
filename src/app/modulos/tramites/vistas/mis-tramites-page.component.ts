import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';

import { BpmnCanvasComponent } from '../../../compartido/componentes/bpmn-canvas.component';
import {
  type EstadoHistorialTramiteResponse,
  type RequisitosTramiteResponse,
  type TramiteDetalleResponse,
  type TramiteResumenResponse,
  TramitesService,
} from '../../../nucleo/tramites/tramites.service';

@Component({
  selector: 'app-mis-tramites-page',
  standalone: true,
  imports: [CommonModule, BpmnCanvasComponent],
  template: `
    <div class="space-y-5">
      <section class="rounded-2xl border border-violet-300/60 bg-white/85 p-6 dark:border-violet-500/20 dark:bg-violet-900/30">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Operacion</p>
        <h1 class="m-0 mt-1 text-3xl font-semibold text-violet-950 dark:text-violet-50">Mis tramites</h1>
        <p class="m-0 mt-2 text-violet-700 dark:text-violet-200">
          Lista de tramites, visualizacion del flujo BPMN actual y eliminacion de registro.
        </p>
      </section>

      @if (error()) {
        <p class="rounded-xl border border-rose-300/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">{{ error() }}</p>
      }
      @if (message()) {
        <p class="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-100">{{ message() }}</p>
      }

      <section class="grid gap-5 xl:grid-cols-[360px_1fr]">
        <article class="rounded-2xl border border-violet-300/50 bg-white/90 p-4 dark:border-violet-500/20 dark:bg-violet-900/30">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Tramites</h2>
            <button
              type="button"
              (click)="cargarTramites()"
              [disabled]="loadingTramites()"
              class="rounded-lg border border-violet-300/70 px-3 py-1 text-xs font-semibold text-violet-700"
            >
              {{ loadingTramites() ? 'Actualizando...' : 'Refrescar' }}
            </button>
          </div>

          @for (item of tramites(); track item.id) {
            <div
              class="mb-2 rounded-xl border p-3"
              [class.border-violet-500]="item.id === selectedTramiteId()"
              [class.bg-violet-100/70]="item.id === selectedTramiteId()"
              [class.border-violet-200/70]="item.id !== selectedTramiteId()"
            >
              <button type="button" (click)="seleccionarTramite(item.id)" class="w-full text-left">
                <p class="m-0 text-xs font-semibold text-violet-700">{{ item.codigoTramite }}</p>
                <p class="m-0 mt-1 text-sm font-semibold text-violet-950 dark:text-violet-50">{{ item.tipoTramiteNombre }}</p>
                <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">{{ item.nombreEtapaActual }}</p>
                <p class="m-0 mt-1 text-[11px] uppercase tracking-[0.12em] text-violet-600 dark:text-violet-300">{{ item.estadoTramite }}</p>
              </button>
              <button
                type="button"
                (click)="abrirModalEliminacion(item.id)"
                class="mt-2 h-8 w-full rounded-lg border border-rose-300/70 bg-rose-100/80 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-200"
              >
                Eliminar tramite
              </button>
            </div>
          } @empty {
            <p class="rounded-lg border border-violet-300/50 bg-violet-100/60 px-3 py-3 text-sm text-violet-800 dark:border-violet-400/20 dark:bg-violet-800/25 dark:text-violet-200">
              No hay tramites para mostrar.
            </p>
          }
        </article>

        <article class="rounded-2xl border border-violet-300/50 bg-white/90 p-4 dark:border-violet-500/20 dark:bg-violet-900/30">
          @if (!detalle()) {
            <p class="rounded-xl border border-violet-300/50 bg-violet-100/60 px-4 py-3 text-sm text-violet-800 dark:border-violet-400/20 dark:bg-violet-800/25 dark:text-violet-200">
              Selecciona un tramite para ver su detalle y el flujo BPMN.
            </p>
          } @else {
            <header class="border-b border-violet-200/70 pb-3 dark:border-violet-500/20">
              <p class="m-0 text-xs font-semibold text-violet-700 dark:text-violet-300">{{ detalle()!.codigoTramite }}</p>
              <h2 class="m-0 mt-1 text-xl font-semibold text-violet-950 dark:text-violet-50">{{ detalle()!.tipoTramiteNombre }}</h2>
              <p class="m-0 mt-1 text-sm text-violet-700 dark:text-violet-300">Etapa: {{ detalle()!.etapaActual }}</p>
              <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">
                Estado: {{ estadoHistorial()?.estadoActual ?? detalle()!.estadoTramite }}
              </p>
            </header>

            @if (bpmnXmlActual()) {
              <section class="mt-4 rounded-xl border border-violet-300/60 bg-white/90 p-2 dark:border-violet-400/20 dark:bg-violet-950/40">
                <p class="m-0 mb-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-violet-700 dark:text-violet-300">
                  Flujo BPMN en ejecucion
                </p>
                <app-bpmn-canvas
                  [xml]="bpmnXmlActual()"
                  [nodosActivos]="detalle()!.nodosActivos"
                  [nodosCompletados]="detalle()!.nodosCompletados"
                  [marcarNoEjecutados]="esTramiteTerminado(detalle()!.estadoTramite)"
                  [marcarFinCompletado]="esTramiteTerminado(detalle()!.estadoTramite)"
                  mode="viewer"
                  [height]="320"
                ></app-bpmn-canvas>
              </section>
            } @else {
              <p class="mt-4 rounded-lg border border-violet-300/50 bg-violet-100/60 px-3 py-3 text-xs text-violet-700 dark:border-violet-400/20 dark:bg-violet-800/25 dark:text-violet-200">
                No se encontro BPMN para este tramite.
              </p>
            }

            <section class="mt-4 rounded-xl border border-violet-300/60 bg-white/90 p-3 dark:border-violet-400/20 dark:bg-violet-950/40">
              <p class="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-violet-700 dark:text-violet-300">
                Entregable acumulado
              </p>
              @if (detalle()!.entregableCampos.length === 0) {
                <p class="m-0 mt-2 text-xs text-violet-700 dark:text-violet-300">Sin campos registrados en entregable.</p>
              } @else {
                <div class="mt-2 grid gap-2">
                  @for (campo of detalle()!.entregableCampos; track campo.claveCampo) {
                    <article class="rounded-lg border border-violet-300/50 bg-violet-50/70 p-2 text-xs dark:border-violet-500/20 dark:bg-violet-900/30">
                      <p class="m-0 font-semibold text-violet-900 dark:text-violet-100">
                        {{ campo.etiqueta }}
                        @if (campo.obligatorio) {
                          <span class="text-rose-600">*</span>
                        }
                      </p>
                      <p class="m-0 mt-1 text-violet-700 dark:text-violet-300">{{ campo.nodoNombre }} - {{ campo.tipoCampo }}</p>
                      <p class="m-0 mt-1" [class.text-emerald-700]="campo.presente" [class.text-rose-700]="!campo.presente">
                        {{ campo.presente ? 'Presente' : 'No presente' }}
                      </p>
                    </article>
                  }
                </div>
              }
            </section>
          }
        </article>
      </section>

      @if (showDeleteModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/45 p-4">
          <section class="w-full max-w-md rounded-2xl border border-violet-300/60 bg-white p-5 shadow-2xl dark:border-violet-500/20 dark:bg-violet-950">
            <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Eliminar tramite</h3>
            <p class="m-0 mt-2 text-sm text-violet-700 dark:text-violet-300">
              Esta accion eliminara el tramite seleccionado. No se puede deshacer.
            </p>
            <div class="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                (click)="cerrarModalEliminacion()"
                class="h-10 rounded-xl border border-violet-300/70 px-3 text-sm font-semibold text-violet-800 hover:bg-violet-100 dark:border-violet-400/30 dark:text-violet-100 dark:hover:bg-violet-800/35"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirmarEliminacion()"
                [disabled]="loadingEliminar()"
                class="h-10 rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-500 px-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                {{ loadingEliminar() ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class MisTramitesPageComponent implements OnInit {
  readonly tramites = signal<TramiteResumenResponse[]>([]);
  readonly selectedTramiteId = signal<string | null>(null);
  readonly detalle = signal<TramiteDetalleResponse | null>(null);
  readonly estadoHistorial = signal<EstadoHistorialTramiteResponse | null>(null);
  readonly requisitosTramite = signal<RequisitosTramiteResponse | null>(null);

  readonly error = signal('');
  readonly message = signal('');
  readonly loadingTramites = signal(false);
  readonly loadingEliminar = signal(false);
  readonly showDeleteModal = signal(false);
  readonly tramiteAEliminarId = signal<string | null>(null);

  readonly bpmnXmlActual = computed(() => (this.requisitosTramite()?.bpmnXml ?? '').trim());

  constructor(private readonly tramitesService: TramitesService) {}

  ngOnInit(): void {
    this.cargarTramites();
  }

  cargarTramites(): void {
    this.loadingTramites.set(true);
    this.error.set('');
    this.tramitesService.listar().subscribe({
      next: (items) => {
        const activos = items.filter((item) => !this.esTramiteTerminado(item.estadoTramite));
        this.tramites.set(activos);
        this.loadingTramites.set(false);
        const seleccionado = this.selectedTramiteId();
        if (seleccionado && activos.some((item) => item.id === seleccionado)) {
          return;
        }
        if (activos.length > 0) {
          this.seleccionarTramite(activos[0].id);
        } else {
          this.selectedTramiteId.set(null);
          this.detalle.set(null);
          this.estadoHistorial.set(null);
          this.requisitosTramite.set(null);
        }
      },
      error: (error: unknown) => {
        this.error.set(this.extraerMensajeError(error, 'No se pudo cargar la lista de tramites.'));
        this.loadingTramites.set(false);
      },
    });
  }

  seleccionarTramite(tramiteId: string): void {
    this.selectedTramiteId.set(tramiteId);
    this.error.set('');
    this.message.set('');
    this.tramitesService.obtenerDetalle(tramiteId).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.cargarEstadoHistorial(tramiteId);
        this.cargarRequisitosTramite(tramiteId);
      },
      error: (error: unknown) => this.error.set(this.extraerMensajeError(error, 'No se pudo cargar el detalle del tramite.')),
    });
  }

  abrirModalEliminacion(tramiteId: string): void {
    this.tramiteAEliminarId.set(tramiteId);
    this.showDeleteModal.set(true);
  }

  cerrarModalEliminacion(): void {
    this.showDeleteModal.set(false);
    this.tramiteAEliminarId.set(null);
  }

  confirmarEliminacion(): void {
    const tramiteId = this.tramiteAEliminarId();
    if (!tramiteId) {
      return;
    }
    this.loadingEliminar.set(true);
    this.error.set('');
    this.tramitesService.eliminar(tramiteId).subscribe({
      next: (response) => {
        this.message.set(response.mensaje);
        this.loadingEliminar.set(false);
        this.cerrarModalEliminacion();
        this.cargarTramites();
      },
      error: (error: unknown) => {
        this.error.set(this.extraerMensajeError(error, 'No se pudo eliminar el tramite.'));
        this.loadingEliminar.set(false);
      },
    });
  }

  private cargarEstadoHistorial(tramiteId: string): void {
    this.tramitesService.consultarEstadoHistorial(tramiteId).subscribe({
      next: (response) => this.estadoHistorial.set(response),
      error: () => this.estadoHistorial.set(null),
    });
  }

  private cargarRequisitosTramite(tramiteId: string): void {
    this.tramitesService.consultarRequisitosTramite(tramiteId).subscribe({
      next: (response) => this.requisitosTramite.set(response),
      error: () => this.requisitosTramite.set(null),
    });
  }

  private extraerMensajeError(error: unknown, fallback: string): string {
    const httpError = error as HttpErrorResponse;
    const backendMessage =
      httpError?.error && typeof httpError.error === 'object' ? (httpError.error as { message?: string }).message : undefined;
    return backendMessage ?? fallback;
  }

  esTramiteTerminado(estado: string | null | undefined): boolean {
    return estado === 'APROBADO' || estado === 'RECHAZADO' || estado === 'CANCELADO';
  }
}
