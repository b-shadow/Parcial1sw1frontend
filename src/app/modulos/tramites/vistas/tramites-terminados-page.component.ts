import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { BpmnCanvasComponent } from '../../../compartido/componentes/bpmn-canvas.component';
import { type EstadoTramite, type TramiteDetalleResponse, type TramiteResumenResponse, TramitesService } from '../../../nucleo/tramites/tramites.service';

@Component({
  selector: 'app-tramites-terminados-page',
  standalone: true,
  imports: [CommonModule, BpmnCanvasComponent],
  template: `
    <div class="space-y-5">
      <section class="rounded-2xl border border-violet-300/60 bg-white/85 p-6">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">Operacion</p>
        <h1 class="m-0 mt-1 text-3xl font-semibold text-violet-950">Tramites terminados</h1>
        <p class="m-0 mt-2 text-violet-700">Consulta de resultado final, camino seguido y entregable acumulado.</p>
      </section>

      @if (error()) {
        <p class="rounded-xl border border-rose-300/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-800">{{ error() }}</p>
      }

      <section class="grid gap-5 xl:grid-cols-[360px_1fr]">
        <article class="rounded-2xl border border-violet-300/50 bg-white/90 p-4">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="m-0 text-lg font-semibold text-violet-900">Terminados</h2>
            <button type="button" (click)="cargarTerminados()" class="rounded-lg border border-violet-300/70 px-3 py-1 text-xs font-semibold text-violet-700">
              Refrescar
            </button>
          </div>
          @for (item of tramites(); track item.id) {
            <button type="button" (click)="seleccionar(item.id)" class="mb-2 w-full rounded-xl border p-3 text-left"
              [class.border-violet-500]="item.id===selectedId()" [class.bg-violet-100/70]="item.id===selectedId()" [class.border-violet-200/70]="item.id!==selectedId()">
              <p class="m-0 text-xs font-semibold text-violet-700">{{ item.codigoTramite }}</p>
              <p class="m-0 mt-1 text-sm font-semibold text-violet-950">{{ item.tipoTramiteNombre }}</p>
              <p class="m-0 mt-1 text-xs text-violet-700">{{ item.nombreEtapaActual }}</p>
              <p class="m-0 mt-1 text-[11px] uppercase tracking-[0.12em] text-violet-600">{{ item.estadoTramite }}</p>
            </button>
          } @empty {
            <p class="rounded-lg border border-violet-300/50 bg-violet-100/60 px-3 py-3 text-sm text-violet-800">No hay tramites terminados para consultar.</p>
          }
        </article>

        <article class="rounded-2xl border border-violet-300/50 bg-white/90 p-4">
          @if (!detalle()) {
            <p class="rounded-xl border border-violet-300/50 bg-violet-100/60 px-4 py-3 text-sm text-violet-800">Selecciona un tramite terminado.</p>
          } @else {
            <p class="m-0 text-xs font-semibold text-violet-700">{{ detalle()!.codigoTramite }}</p>
            <h2 class="m-0 mt-1 text-xl font-semibold text-violet-950">{{ detalle()!.tipoTramiteNombre }}</h2>
            <p class="m-0 mt-1 text-sm text-violet-700">Resultado final: {{ detalle()!.estadoTramite }}</p>

            @if (bpmnXmlActual()) {
              <section class="mt-4 rounded-xl border border-violet-300/60 bg-white/90 p-2">
                <p class="m-0 mb-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Camino seguido en flujo</p>
                <app-bpmn-canvas
                  [xml]="bpmnXmlActual()"
                  [nodosActivos]="detalle()!.nodosActivos"
                  [nodosCompletados]="detalle()!.nodosCompletados"
                  [marcarNoEjecutados]="true"
                  [marcarFinCompletado]="true"
                  mode="viewer"
                  [height]="320"
                ></app-bpmn-canvas>
              </section>
            }

            <section class="mt-4 rounded-xl border border-violet-300/60 bg-white/90 p-3">
              <p class="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Entregable acumulado</p>
              @for (campo of detalle()!.entregableCampos; track campo.claveCampo) {
                <article class="mt-2 rounded-lg border border-violet-300/50 bg-violet-50/70 p-2 text-xs">
                  <p class="m-0 font-semibold text-violet-900">{{ campo.etiqueta }}</p>
                  <p class="m-0 mt-1 text-violet-700">{{ campo.nodoNombre }} - {{ campo.tipoCampo }}</p>
                  <p class="m-0 mt-1" [class.text-emerald-700]="campo.presente" [class.text-rose-700]="!campo.presente">
                    {{ campo.presente ? 'Presente' : 'No presente' }}
                  </p>
                </article>
              } @empty {
                <p class="m-0 mt-2 text-xs text-violet-700">Sin campos registrados.</p>
              }
            </section>
          }
        </article>
      </section>
    </div>
  `,
})
export class TramitesTerminadosPageComponent implements OnInit {
  readonly tramites = signal<TramiteResumenResponse[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly detalle = signal<TramiteDetalleResponse | null>(null);
  readonly requisitos = signal<{ bpmnXml: string | null } | null>(null);
  readonly error = signal('');
  readonly bpmnXmlActual = computed(() => (this.requisitos()?.bpmnXml ?? '').trim());

  constructor(private readonly tramitesService: TramitesService) {}

  ngOnInit(): void {
    this.cargarTerminados();
  }

  cargarTerminados(): void {
    this.error.set('');
    forkJoin([
      this.tramitesService.listarPorEstado('APROBADO'),
      this.tramitesService.listarPorEstado('RECHAZADO'),
      this.tramitesService.listarPorEstado('CANCELADO'),
    ]).subscribe({
      next: ([aprobados, rechazados, cancelados]) => {
        const map = new Map<string, TramiteResumenResponse>();
        [...aprobados, ...rechazados, ...cancelados].forEach((item) => map.set(item.id, item));
        const items = Array.from(map.values());
        this.tramites.set(items);
        if (items.length > 0 && (!this.selectedId() || !items.some((i) => i.id === this.selectedId()))) {
          this.seleccionar(items[0].id);
        }
        if (items.length === 0) {
          this.selectedId.set(null);
          this.detalle.set(null);
          this.requisitos.set(null);
        }
      },
      error: (error: unknown) => (this.error.set(this.extraerMensajeError(error, 'No se pudo cargar tramites terminados.'))),
    });
  }

  seleccionar(id: string): void {
    this.selectedId.set(id);
    this.tramitesService.obtenerDetalle(id).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.tramitesService.consultarRequisitosTramite(id).subscribe({
          next: (req) => this.requisitos.set({ bpmnXml: req.bpmnXml }),
          error: () => this.requisitos.set(null),
        });
      },
      error: (error: unknown) => this.error.set(this.extraerMensajeError(error, 'No se pudo cargar el detalle.')),
    });
  }

  private extraerMensajeError(error: unknown, fallback: string): string {
    const httpError = error as HttpErrorResponse;
    const backendMessage =
      httpError?.error && typeof httpError.error === 'object' ? (httpError.error as { message?: string }).message : undefined;
    return backendMessage ?? fallback;
  }
}

