import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../nucleo/autenticacion/auth.service';
import {
  type AccionGestionTarea,
  type CampoFormularioOperativoResponse,
  type EstadoTareaOperativa,
  type FormularioOperativoResponse,
  type PrioridadTarea,
  type ResultadoResolucionTarea,
  type TareaBandejaResponse,
  type TareaDetalleResponse,
  TareasOperativasService,
} from '../../../nucleo/tareas/tareas-operativas.service';

@Component({
  selector: 'app-bandeja-tareas-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-5">
      <section class="rounded-2xl border border-violet-300/60 bg-white/85 p-6 dark:border-violet-500/20 dark:bg-violet-900/30">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Operacion</p>
        <h1 class="m-0 mt-1 text-3xl font-semibold text-violet-950 dark:text-violet-50">Bandeja de tareas (CU-28 a CU-33)</h1>
        <p class="m-0 mt-2 text-violet-700 dark:text-violet-200">
          Consulta, detalle, gestion operativa, formulario, evidencia y resolucion de actividades asignadas al Ejecutivo.
        </p>
      </section>

      @if (error()) {
        <p class="rounded-xl border border-rose-300/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">{{ error() }}</p>
      }
      @if (message()) {
        <p class="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-100">{{ message() }}</p>
      }

      <section class="grid gap-4 lg:grid-cols-[420px_1fr]">
        <article class="rounded-2xl border border-violet-300/50 bg-white/90 p-4 dark:border-violet-500/20 dark:bg-violet-900/30">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Tareas asignadas</h2>
            <button type="button" (click)="cargarBandeja()" class="rounded-lg border border-violet-300/70 px-3 py-1 text-xs font-semibold text-violet-700">
              Refrescar
            </button>
          </div>

          <form class="mb-3 grid grid-cols-2 gap-2" [formGroup]="filtroForm">
            <select formControlName="estadoTareaOperativa" class="h-9 rounded-lg border border-violet-300/70 px-2 text-xs dark:border-violet-400/20 dark:bg-violet-950/50 dark:text-violet-100">
              <option value="">Estado</option>
              @for (estado of estadosFiltro; track estado) {
                <option [value]="estado">{{ estado }}</option>
              }
            </select>
            <select formControlName="prioridadTarea" class="h-9 rounded-lg border border-violet-300/70 px-2 text-xs dark:border-violet-400/20 dark:bg-violet-950/50 dark:text-violet-100">
              <option value="">Prioridad</option>
              <option value="ALTA">ALTA</option>
              <option value="MEDIA">MEDIA</option>
              <option value="BAJA">BAJA</option>
            </select>
            <input formControlName="tipoTramiteId" placeholder="Tipo tramite ID" class="h-9 rounded-lg border border-violet-300/70 px-2 text-xs dark:border-violet-400/20 dark:bg-violet-950/50 dark:text-violet-100" />
            <input formControlName="departamentoId" placeholder="Departamento ID" class="h-9 rounded-lg border border-violet-300/70 px-2 text-xs dark:border-violet-400/20 dark:bg-violet-950/50 dark:text-violet-100" />
            <input formControlName="fechaDesde" type="date" class="h-9 rounded-lg border border-violet-300/70 px-2 text-xs dark:border-violet-400/20 dark:bg-violet-950/50 dark:text-violet-100" />
            <input formControlName="fechaHasta" type="date" class="h-9 rounded-lg border border-violet-300/70 px-2 text-xs dark:border-violet-400/20 dark:bg-violet-950/50 dark:text-violet-100" />
            <button type="button" (click)="aplicarFiltros()" class="col-span-1 h-9 rounded-lg bg-violet-700 text-xs font-semibold text-white">Filtrar</button>
            <button type="button" (click)="limpiarFiltros()" class="col-span-1 h-9 rounded-lg border border-violet-300/70 text-xs font-semibold text-violet-700">Limpiar</button>
          </form>

          @for (tarea of bandeja(); track tarea.id) {
            <button
              type="button"
              (click)="seleccionarTarea(tarea.id)"
              class="mb-2 w-full rounded-xl border p-3 text-left transition"
              [class.border-violet-500]="tarea.id === selectedTareaId()"
              [class.bg-violet-100/70]="tarea.id === selectedTareaId()"
              [class.border-violet-200/70]="tarea.id !== selectedTareaId()"
            >
              <p class="m-0 text-xs font-semibold text-violet-700">{{ tarea.codigoTarea }} | {{ tarea.codigoTramite }}</p>
              <p class="m-0 mt-1 text-sm font-semibold text-violet-950 dark:text-violet-50">{{ tarea.nombreEtapa }}</p>
              <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">{{ tarea.tipoTramiteNombre }}</p>
              <p class="m-0 mt-1 text-[11px] uppercase tracking-[0.12em] text-violet-600 dark:text-violet-300">
                {{ tarea.estadoTareaOperativa }} | {{ tarea.prioridadTarea }}
              </p>
            </button>
          } @empty {
            <p class="rounded-lg border border-violet-300/50 bg-violet-100/60 px-3 py-3 text-sm text-violet-800">
              No existen tareas disponibles en tu bandeja.
            </p>
          }
        </article>

        <article class="rounded-2xl border border-violet-300/50 bg-white/90 p-4 dark:border-violet-500/20 dark:bg-violet-900/30">
          @if (!detalle()) {
            <p class="rounded-lg border border-violet-300/50 bg-violet-100/60 px-3 py-3 text-sm text-violet-800">
              Selecciona una tarea para ver detalle y ejecutar acciones.
            </p>
          } @else {
            <header class="border-b border-violet-200/70 pb-3 dark:border-violet-500/20">
              <p class="m-0 text-xs font-semibold text-violet-700">{{ detalle()!.codigoTarea }} | {{ detalle()!.codigoTramite }}</p>
              <h2 class="m-0 mt-1 text-xl font-semibold text-violet-950 dark:text-violet-50">{{ detalle()!.nombreEtapa }}</h2>
              <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">{{ detalle()!.tipoTramiteNombre }}</p>
              <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">Estado: {{ detalle()!.estadoTareaOperativa }} | Prioridad: {{ detalle()!.prioridadTarea }}</p>
            </header>

            <section class="mt-3 rounded-xl border border-violet-300/50 bg-violet-100/40 p-3">
              <h3 class="m-0 text-sm font-semibold text-violet-900">Acciones operativas</h3>
              <div class="mt-2 flex flex-wrap gap-2">
                @for (accion of accionesGestionDisponibles(); track accion) {
                  <button
                    type="button"
                    (click)="gestionar(accion)"
                    [disabled]="loadingGestion()"
                    class="h-9 rounded-lg bg-violet-700 px-3 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {{ textoAccion(accion) }}
                  </button>
                }
                @if (accionesGestionDisponibles().length === 0) {
                  <p class="m-0 text-xs text-violet-700">No hay acciones operativas disponibles en este estado.</p>
                }
              </div>
            </section>

            @if (formulario()) {
              <section class="mt-3 rounded-xl border border-violet-300/50 bg-white/95 p-3">
                <h3 class="m-0 text-sm font-semibold text-violet-900">Evidencia operativa (formulario)</h3>
                <p class="m-0 mt-1 text-xs text-violet-700">Estado: {{ formulario()!.estadoFormularioOperativo }}</p>

                <div class="mt-3 space-y-3">
                  @for (campo of camposFormularioVisibles(); track campo.idCampo) {
                    <section class="rounded-xl border border-violet-200/70 bg-white p-3">
                      <p class="m-0 text-sm font-semibold text-violet-900">
                        {{ campo.etiqueta }}
                        @if (campo.obligatorio) {
                          <span class="text-rose-600">*</span>
                        }
                      </p>
                      @if (campo.ayuda) {
                        <p class="m-0 mt-1 text-xs text-violet-600">{{ campo.ayuda }}</p>
                      }

                      @if (campo.tipoCampo === 'BOOLEANO') {
                        <label class="mt-2 flex items-center gap-2 text-sm text-violet-800">
                          <input type="checkbox" [checked]="valorBooleano(campo)" (change)="actualizarBooleano(campo.idCampo, $any($event.target).checked)" />
                          Marcar
                        </label>
                      } @else if (campo.tipoCampo === 'AREA_TEXTO') {
                        <textarea
                          rows="3"
                          class="mt-2 w-full rounded-lg border border-violet-300/70 px-3 py-2 text-sm text-violet-900 outline-none"
                          [placeholder]="campo.placeholder || ''"
                          [value]="valorTexto(campo)"
                          (input)="actualizarTexto(campo.idCampo, $any($event.target).value)"
                        ></textarea>
                      } @else if (campo.tipoCampo === 'IMAGEN' || campo.tipoCampo === 'ARCHIVO') {
                        <div class="mt-2 space-y-2">
                          <input type="file" (change)="cargarArchivo(campo.idCampo, $event)" />
                          @if (valorTexto(campo)) {
                            <p class="m-0 text-xs text-violet-700">Archivo cargado en memoria para guardar.</p>
                          }
                        </div>
                      } @else {
                        <input
                          class="mt-2 w-full rounded-lg border border-violet-300/70 px-3 py-2 text-sm text-violet-900 outline-none"
                          [placeholder]="campo.placeholder || ''"
                          [value]="valorTexto(campo)"
                          (input)="actualizarTexto(campo.idCampo, $any($event.target).value)"
                        />
                      }
                    </section>
                  }
                </div>

                <button
                  type="button"
                  (click)="marcarFinalizado()"
                  [disabled]="guardandoFormulario() || !puedeMarcarFinalizado()"
                  class="mt-3 h-10 w-full rounded-xl bg-violet-600 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {{
                    guardandoFormulario()
                      ? 'Guardando...'
                      : (puedeMarcarFinalizado() ? 'Marcar finalizado' : 'Actividad ya finalizada')
                  }}
                </button>
              </section>
            }

            @if (puedeResolver()) {
              <section class="mt-3 rounded-xl border border-violet-300/50 bg-violet-100/40 p-3">
                <h3 class="m-0 text-sm font-semibold text-violet-900">Resolver actividad</h3>
                <form class="mt-2 grid gap-2" [formGroup]="resolverForm" (ngSubmit)="resolver()">
                  <select formControlName="resultadoResolucion" class="h-10 rounded-lg border border-violet-300/70 px-3 text-sm">
                    <option value="APROBADA">APROBADA</option>
                    <option value="OBSERVADA">OBSERVADA</option>
                    <option value="RECHAZADA">RECHAZADA</option>
                  </select>
                  <textarea formControlName="observaciones" rows="2" placeholder="Observaciones de resolucion" class="rounded-lg border border-violet-300/70 px-3 py-2 text-sm"></textarea>
                  <button type="submit" [disabled]="loadingResolucion()" class="h-10 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-sm font-semibold text-white disabled:opacity-60">
                    {{ loadingResolucion() ? 'Resolviendo...' : 'Resolver actividad' }}
                  </button>
                </form>
              </section>
            }

            <section class="mt-3 grid gap-3 xl:grid-cols-2">
              <article class="rounded-xl border border-violet-300/50 bg-white/95 p-3">
                <h3 class="m-0 text-sm font-semibold text-violet-900">Contexto del tramite</h3>
                <p class="m-0 mt-2 text-xs font-semibold text-violet-800">Formulario inicial</p>
                @for (entry of datosInicio(); track entry.key) {
                  <p class="m-0 mt-1 text-xs text-violet-700"><strong>{{ entry.key }}:</strong> {{ entry.value }}</p>
                } @empty {
                  <p class="m-0 mt-1 text-xs text-violet-700">Sin datos iniciales.</p>
                }

                <p class="m-0 mt-3 text-xs font-semibold text-violet-800">Documentos del tramite</p>
                @for (doc of documentosTramite(); track doc.idDocumento) {
                  <p class="m-0 mt-1 text-xs text-violet-700">{{ doc.nombreOriginal }} ({{ doc.mimeType || 'sin tipo' }})</p>
                } @empty {
                  <p class="m-0 mt-1 text-xs text-violet-700">Sin documentos.</p>
                }
              </article>

              <article class="rounded-xl border border-violet-300/50 bg-white/95 p-3">
                <h3 class="m-0 text-sm font-semibold text-violet-900">Historial y formularios previos</h3>
                @for (linea of historialResumido(); track $index) {
                  <p class="m-0 mt-1 text-xs text-violet-700">{{ linea }}</p>
                } @empty {
                  <p class="m-0 mt-1 text-xs text-violet-700">Sin historial resumido.</p>
                }
                @for (previo of formulariosPrevios(); track previo.tareaId) {
                  <div class="mt-2 rounded-lg border border-violet-200/70 px-2 py-2">
                    <p class="m-0 text-xs font-semibold text-violet-900">{{ previo.nombreEtapa }}</p>
                    @for (campo of previo.campos; track campo.idCampo) {
                      <p class="m-0 mt-1 text-xs text-violet-700">{{ campo.etiqueta }}: {{ campo.valor }}</p>
                    }
                  </div>
                } @empty {}
              </article>
            </section>
          }
        </article>
      </section>
    </div>
  `,
})
export class BandejaTareasPageComponent implements OnInit {
  private static readonly CAMPO_ESTADO_INICIADO = 'estado_iniciado';
  private static readonly CAMPO_ESTADO_FINALIZADO = 'estado_finalizado';

  readonly bandeja = signal<TareaBandejaResponse[]>([]);
  readonly selectedTareaId = signal<string | null>(null);
  readonly detalle = signal<TareaDetalleResponse | null>(null);
  readonly formulario = signal<FormularioOperativoResponse | null>(null);
  readonly valoresFormulario = signal<Record<string, string | boolean>>({});
  readonly error = signal('');
  readonly message = signal('');

  readonly guardandoFormulario = signal(false);
  readonly loadingGestion = signal(false);
  readonly loadingResolucion = signal(false);

  readonly estadosFiltro: EstadoTareaOperativa[] = [
    'PENDIENTE',
    'EN_PROCESO',
    'PAUSADA',
    'RESUELTA',
    'REASIGNADA',
    'CANCELADA',
  ];

  readonly esEjecutivo = computed(() => this.authService.getUsuarioSesion()?.rol === 'EJECUTIVO');
  readonly accionesGestionDisponibles = computed(() =>
    (this.detalle()?.accionesDisponibles ?? []).filter((accion) =>
      ['INICIAR', 'PAUSAR', 'RETOMAR'].includes(accion),
    ) as AccionGestionTarea[],
  );
  readonly puedeResolver = computed(() => (this.detalle()?.accionesDisponibles ?? []).includes('RESOLVER'));
  readonly datosInicio = computed(() =>
    Object.entries(this.detalle()?.contextoTramite?.datosFormularioInicio ?? {}).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
    })),
  );
  readonly documentosTramite = computed(() => this.detalle()?.contextoTramite?.documentosTramite ?? []);
  readonly formulariosPrevios = computed(() => this.detalle()?.contextoTramite?.formulariosPrevios ?? []);
  readonly historialResumido = computed(() => this.detalle()?.historialResumido ?? []);
  readonly camposFormularioVisibles = computed(() =>
    (this.formulario()?.campos ?? []).filter((campo) => !this.esCampoControlEstado(campo.idCampo)),
  );
  readonly puedeMarcarFinalizado = computed(() => {
    const estado = this.detalle()?.estadoTareaOperativa;
    return estado !== 'RESUELTA' && estado !== 'CANCELADA';
  });

  readonly filtroForm = this.formBuilder.nonNullable.group({
    estadoTareaOperativa: [''],
    prioridadTarea: [''],
    tipoTramiteId: [''],
    departamentoId: [''],
    fechaDesde: [''],
    fechaHasta: [''],
  });

  readonly resolverForm = this.formBuilder.nonNullable.group({
    resultadoResolucion: ['APROBADA' as ResultadoResolucionTarea],
    observaciones: [''],
  });

  constructor(
    private readonly tareasService: TareasOperativasService,
    private readonly authService: AuthService,
    private readonly formBuilder: FormBuilder,
  ) {}

  ngOnInit(): void {
    if (!this.esEjecutivo()) {
      this.error.set('Solo el rol EJECUTIVO puede operar tareas.');
      return;
    }
    this.cargarBandeja();
  }

  cargarBandeja(): void {
    this.error.set('');
    this.message.set('');
    const filtro = this.filtroForm.getRawValue();
    this.tareasService
      .listarBandeja({
        estadoTareaOperativa: this.parseEstadoFiltro(filtro.estadoTareaOperativa),
        prioridadTarea: this.parsePrioridadFiltro(filtro.prioridadTarea),
        tipoTramiteId: filtro.tipoTramiteId || null,
        departamentoId: filtro.departamentoId || null,
        fechaDesde: filtro.fechaDesde || null,
        fechaHasta: filtro.fechaHasta || null,
      })
      .subscribe({
        next: (items) => {
          this.bandeja.set(items);
          if (!this.selectedTareaId() && items.length > 0) {
            this.seleccionarTarea(items[0].id);
          }
          if (items.length === 0) {
            this.selectedTareaId.set(null);
            this.detalle.set(null);
            this.formulario.set(null);
          }
        },
        error: (error: unknown) => this.error.set(this.extraerMensajeError(error, 'No se pudo cargar la bandeja de tareas.')),
      });
  }

  aplicarFiltros(): void {
    this.selectedTareaId.set(null);
    this.cargarBandeja();
  }

  limpiarFiltros(): void {
    this.filtroForm.reset({
      estadoTareaOperativa: '',
      prioridadTarea: '',
      tipoTramiteId: '',
      departamentoId: '',
      fechaDesde: '',
      fechaHasta: '',
    });
    this.aplicarFiltros();
  }

  seleccionarTarea(tareaId: string): void {
    this.error.set('');
    this.message.set('');
    this.selectedTareaId.set(tareaId);
    this.tareasService.obtenerDetalle(tareaId).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.formulario.set(detalle.formularioOperativo);
        if (detalle.formularioOperativo) {
          this.hidratarValoresFormulario(detalle.formularioOperativo);
        }
      },
      error: (error: unknown) => {
        this.error.set(this.extraerMensajeError(error, 'No se pudo cargar el detalle de tarea.'));
        this.detalle.set(null);
      },
    });
  }

  gestionar(accion: AccionGestionTarea): void {
    const tareaId = this.selectedTareaId();
    if (!tareaId) {
      return;
    }
    this.loadingGestion.set(true);
    this.error.set('');
    this.message.set('');
    this.tareasService.gestionarTarea(tareaId, { accionGestionTarea: accion }).subscribe({
      next: (response) => {
        if (accion === 'INICIAR' || accion === 'RETOMAR') {
          this.actualizarBooleano(BandejaTareasPageComponent.CAMPO_ESTADO_INICIADO, true);
        }
        this.message.set(response.mensaje);
        this.loadingGestion.set(false);
        this.refrescarActual();
      },
      error: (error: unknown) => {
        this.error.set(this.extraerMensajeError(error, 'No se pudo gestionar la tarea.'));
        this.loadingGestion.set(false);
      },
    });
  }

  guardarFormulario(): void {
    const tareaId = this.selectedTareaId();
    const formulario = this.formulario();
    if (!tareaId || !formulario) {
      this.error.set('No hay formulario para guardar.');
      return;
    }
    this.guardandoFormulario.set(true);
    this.error.set('');
    this.message.set('');
    const valores = this.valoresFormulario();
    const camposRespuesta = formulario.campos.map((campo) => ({
      idCampo: campo.idCampo,
      valor: this.valorCampoParaPersistir(campo, valores[campo.idCampo], false),
    }));
    this.tareasService
      .guardarFormulario(tareaId, {
        camposRespuesta,
      })
      .subscribe({
        next: (response) => {
          this.formulario.set(response);
          this.hidratarValoresFormulario(response);
          this.message.set('Formulario completado correctamente.');
          this.guardandoFormulario.set(false);
          this.refrescarActual();
        },
        error: (error: unknown) => {
          this.error.set(this.extraerMensajeError(error, 'No se pudo guardar el formulario.'));
          this.guardandoFormulario.set(false);
        },
      });
  }

  marcarFinalizado(): void {
    const tareaId = this.selectedTareaId();
    const formulario = this.formulario();
    if (!tareaId || !formulario) {
      this.error.set('No hay formulario para finalizar.');
      return;
    }
    if (!this.puedeMarcarFinalizado()) {
      this.error.set('La tarea ya no se encuentra disponible para operacion.');
      return;
    }

    this.guardandoFormulario.set(true);
    this.error.set('');
    this.message.set('');

    const valores = this.valoresFormulario();
    const camposRespuesta = formulario.campos.map((campo) => ({
      idCampo: campo.idCampo,
      valor: this.valorCampoParaPersistir(campo, valores[campo.idCampo], true),
    }));

    this.tareasService
      .guardarFormulario(tareaId, {
        camposRespuesta,
      })
      .subscribe({
        next: async (response) => {
          this.formulario.set(response);
          this.hidratarValoresFormulario(response);
          try {
            const detalleActual = await firstValueFrom(this.tareasService.obtenerDetalle(tareaId));
            if (detalleActual.estadoTareaOperativa === 'RESUELTA' || detalleActual.estadoTareaOperativa === 'CANCELADA') {
              this.error.set('La tarea ya no se encuentra disponible para operacion.');
              this.guardandoFormulario.set(false);
              this.refrescarActual();
              return;
            }
            const accionesDisponibles = detalleActual.accionesDisponibles ?? [];
            if (accionesDisponibles.includes('INICIAR')) {
              try {
                await firstValueFrom(this.tareasService.gestionarTarea(tareaId, { accionGestionTarea: 'INICIAR' }));
              } catch {
                // Si hubo cambio de estado concurrente, continuar con la secuencia.
              }
            } else if (accionesDisponibles.includes('RETOMAR')) {
              try {
                await firstValueFrom(this.tareasService.gestionarTarea(tareaId, { accionGestionTarea: 'RETOMAR' }));
              } catch {
                // Si hubo cambio de estado concurrente, continuar con la secuencia.
              }
            }

            const resolucion = this.resolverForm.getRawValue();
            await firstValueFrom(
              this.tareasService.resolverTarea(tareaId, {
                resultadoResolucion: resolucion.resultadoResolucion,
                observaciones: resolucion.observaciones || null,
              }),
            );

            this.message.set('Actividad finalizada y flujo avanzado correctamente.');
            this.guardandoFormulario.set(false);
            this.cargarBandeja();
            this.refrescarActual();
          } catch (error: unknown) {
            this.error.set(this.extraerMensajeError(error, 'Formulario guardado, pero no se pudo completar la finalizacion de la actividad.'));
            this.guardandoFormulario.set(false);
            this.refrescarActual();
          }
        },
        error: (error: unknown) => {
          this.error.set(this.extraerMensajeError(error, 'No se pudo marcar la actividad como finalizada.'));
          this.guardandoFormulario.set(false);
        },
      });
  }

  resolver(): void {
    const tareaId = this.selectedTareaId();
    if (!tareaId) {
      return;
    }
    this.loadingResolucion.set(true);
    this.error.set('');
    this.message.set('');
    const payload = this.resolverForm.getRawValue();
    this.tareasService
      .resolverTarea(tareaId, {
        resultadoResolucion: payload.resultadoResolucion,
        observaciones: payload.observaciones || null,
      })
      .subscribe({
        next: (response) => {
          this.message.set(response.mensaje);
          this.loadingResolucion.set(false);
          this.refrescarActual();
          this.cargarBandeja();
        },
        error: (error: unknown) => {
          this.error.set(this.extraerMensajeError(error, 'No se pudo resolver la actividad.'));
          this.loadingResolucion.set(false);
        },
      });
  }

  actualizarTexto(campoId: string, valor: string): void {
    this.valoresFormulario.update((actual) => ({ ...actual, [campoId]: valor }));
  }

  actualizarBooleano(campoId: string, valor: boolean): void {
    this.valoresFormulario.update((actual) => ({ ...actual, [campoId]: valor }));
  }

  valorTexto(campo: CampoFormularioOperativoResponse): string {
    const valor = this.valoresFormulario()[campo.idCampo];
    if (typeof valor === 'boolean') {
      return valor ? 'true' : 'false';
    }
    return (valor ?? '') as string;
  }

  valorBooleano(campo: CampoFormularioOperativoResponse): boolean {
    const valor = this.valoresFormulario()[campo.idCampo];
    if (typeof valor === 'boolean') {
      return valor;
    }
    return String(valor ?? '').toLowerCase() === 'true';
  }

  cargarArchivo(campoId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const contenido = typeof reader.result === 'string' ? reader.result : '';
      this.actualizarTexto(campoId, contenido);
    };
    reader.onerror = () => {
      this.error.set('No se pudo leer el archivo seleccionado.');
    };
    reader.readAsDataURL(file);
  }

  textoAccion(accion: AccionGestionTarea): string {
    return (
      {
        INICIAR: 'Iniciar',
        PAUSAR: 'Pausar',
        RETOMAR: 'Retomar',
      } as Record<AccionGestionTarea, string>
    )[accion];
  }

  private refrescarActual(): void {
    const tareaId = this.selectedTareaId();
    if (tareaId) {
      this.seleccionarTarea(tareaId);
    }
  }

  private hidratarValoresFormulario(formulario: FormularioOperativoResponse): void {
    const valores: Record<string, string | boolean> = {};
    for (const campo of formulario.campos) {
      if (campo.tipoCampo === 'BOOLEANO') {
        valores[campo.idCampo] = String(campo.valor ?? '').toLowerCase() === 'true';
      } else {
        valores[campo.idCampo] = campo.valor ?? '';
      }
    }
    this.valoresFormulario.set(valores);
  }

  private valorSerializado(campo: CampoFormularioOperativoResponse, valor: string | boolean | undefined): string | null {
    if (campo.tipoCampo === 'BOOLEANO') {
      return valor === true ? 'true' : 'false';
    }
    const texto = typeof valor === 'string' ? valor : '';
    return texto.trim().length > 0 ? texto : null;
  }

  private valorCampoParaPersistir(
    campo: CampoFormularioOperativoResponse,
    valor: string | boolean | undefined,
    finalizar: boolean,
  ): string | null {
    if (campo.idCampo === BandejaTareasPageComponent.CAMPO_ESTADO_INICIADO) {
      return 'true';
    }
    if (campo.idCampo === BandejaTareasPageComponent.CAMPO_ESTADO_FINALIZADO) {
      return finalizar ? 'true' : this.valorSerializado(campo, valor);
    }
    return this.valorSerializado(campo, valor);
  }

  private esCampoControlEstado(idCampo: string): boolean {
    return (
      idCampo === BandejaTareasPageComponent.CAMPO_ESTADO_INICIADO ||
      idCampo === BandejaTareasPageComponent.CAMPO_ESTADO_FINALIZADO
    );
  }

  private parseEstadoFiltro(value: string): EstadoTareaOperativa | null {
    const estados: EstadoTareaOperativa[] = ['PENDIENTE', 'EN_PROCESO', 'PAUSADA', 'RESUELTA', 'REASIGNADA', 'CANCELADA'];
    return estados.includes(value as EstadoTareaOperativa) ? (value as EstadoTareaOperativa) : null;
  }

  private parsePrioridadFiltro(value: string): PrioridadTarea | null {
    const prioridades: PrioridadTarea[] = ['ALTA', 'MEDIA', 'BAJA'];
    return prioridades.includes(value as PrioridadTarea) ? (value as PrioridadTarea) : null;
  }

  private extraerMensajeError(error: unknown, fallback: string): string {
    const httpError = error as HttpErrorResponse;
    const backendMessage =
      httpError?.error && typeof httpError.error === 'object' ? (httpError.error as { message?: string }).message : undefined;
    return backendMessage ?? fallback;
  }
}
