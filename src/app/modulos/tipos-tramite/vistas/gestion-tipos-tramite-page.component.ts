import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../nucleo/autenticacion/auth.service';
import {
  type EstadoTipoTramite,
  type EstadoFlujo,
  type FlujoTramiteResumenResponse,
  FlujosDisenoService,
  type TipoTramiteResponse,
  type TipoTramiteResumenResponse,
} from '../../../nucleo/diseno/flujos-diseno.service';

@Component({
  selector: 'app-gestion-tipos-tramite-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-5">
      <section class="rounded-2xl border border-violet-300/60 bg-white/85 p-6 dark:border-violet-500/20 dark:bg-violet-900/30">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">CU-11</p>
        <h1 class="m-0 mt-1 text-3xl font-semibold text-violet-950 dark:text-violet-50">Gestionar tipos de tramite</h1>
        <p class="m-0 mt-2 text-violet-700 dark:text-violet-200">
          Registrar, consultar, editar, activar o desactivar tipos de tramite para su posterior asociacion con flujos y formularios.
        </p>
      </section>

      @if (globalError()) {
        <p class="rounded-xl border border-rose-300/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{{ globalError() }}</p>
      }
      @if (globalMessage()) {
        <p class="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">{{ globalMessage() }}</p>
      }

      <section class="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <article class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
          <div class="mb-4 flex items-center justify-between gap-2">
            <h2 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Tipos registrados</h2>
            <button type="button" (click)="cargarTipos()" [disabled]="loading()" class="btn-secondary !h-9 !w-auto px-4">
              {{ loading() ? 'Actualizando...' : 'Refrescar' }}
            </button>
          </div>

          <div class="space-y-2">
            @for (tipo of tipos(); track tipo.id) {
              <button
                type="button"
                (click)="seleccionarTipo(tipo.id)"
                class="w-full rounded-xl border p-3 text-left transition"
                [class.border-violet-500]="selectedTipoId() === tipo.id"
                [class.bg-violet-100/70]="selectedTipoId() === tipo.id"
                [class.dark:bg-violet-700/25]="selectedTipoId() === tipo.id"
                [class.border-violet-200/70]="selectedTipoId() !== tipo.id"
              >
                <div class="flex items-center justify-between gap-2">
                  <strong class="text-sm text-violet-950 dark:text-violet-50">{{ tipo.nombre }}</strong>
                  <span
                    class="rounded-lg px-2 py-1 text-[10px] font-semibold"
                    [class.bg-emerald-600]="tipo.estadoTipoTramite === 'ACTIVO'"
                    [class.text-white]="tipo.estadoTipoTramite === 'ACTIVO'"
                    [class.bg-slate-500]="tipo.estadoTipoTramite === 'INACTIVO'"
                    [class.text-white]="tipo.estadoTipoTramite === 'INACTIVO'"
                  >
                    {{ tipo.estadoTipoTramite }}
                  </span>
                </div>
                <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">Tramite: {{ tipo.nombre }}</p>
                <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">Flujos registrados: {{ contarFlujosPorTipo(tipo.id) }}</p>
                @if (flujoPublicadoPorTipo(tipo.id); as publicado) {
                  <p class="m-0 mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                    Flujo asignado: {{ publicado.nombre }} (v{{ publicado.version }})
                  </p>
                } @else {
                  <p class="m-0 mt-1 text-xs text-amber-700 dark:text-amber-300">Sin flujo asignado/publicado.</p>
                }
              </button>
            } @empty {
              <p class="rounded-xl border border-violet-300/50 bg-violet-100/60 px-3 py-3 text-sm text-violet-800 dark:border-violet-400/20 dark:bg-violet-800/25 dark:text-violet-200">
                No hay tipos de tramite registrados.
              </p>
            }
          </div>
        </article>

        <article class="space-y-5">
          <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
            <h2 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Registrar tipo de tramite</h2>
            <p class="m-0 mt-1 text-sm text-violet-700 dark:text-violet-300">
              Usa este boton para abrir el formulario en una ventana flotante.
            </p>
            <button type="button" (click)="abrirModalCrearTipo()" class="mt-4 btn-primary">
              Registrar tipo de tramite
            </button>
          </section>

          <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
            <h2 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Editar / activar / desactivar</h2>
            @if (!selectedTipo()) {
              <p class="mt-3 text-sm text-violet-700 dark:text-violet-300">Selecciona un tipo para gestionarlo.</p>
            } @else {
              <form class="mt-4 space-y-3" [formGroup]="editarForm" (ngSubmit)="editarTipo()">
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Nombre</span>
                  <input formControlName="nombre" class="field-input" />
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Tramite</span>
                  <input [value]="editarForm.controls.nombre.value" readonly class="field-input opacity-80" />
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Descripcion</span>
                  <textarea formControlName="descripcion" rows="3" class="field-area"></textarea>
                </label>
                <button type="submit" [disabled]="loading()" class="btn-secondary">Guardar cambios</button>
              </form>

              <div class="mt-4 rounded-xl border border-violet-300/50 bg-violet-100/40 p-3 text-xs text-violet-800 dark:border-violet-500/20 dark:bg-violet-900/30 dark:text-violet-200">
                <p class="m-0">Estado actual: <strong>{{ selectedTipo()!.estadoTipoTramite }}</strong></p>
                @if (selectedTipo()!.flujoPublicadoId) {
                  <p class="m-0 mt-1">Flujo publicado asociado: {{ selectedTipo()!.flujoPublicadoId }} (v{{ selectedTipo()!.versionPublicada ?? 'N/A' }})</p>
                } @else {
                  <p class="m-0 mt-1 text-amber-700 dark:text-amber-300">Aun no hay flujo publicado para este tipo.</p>
                }
              </div>

              <button
                type="button"
                (click)="toggleEstado()"
                [disabled]="loading()"
                class="mt-3 h-11 w-full rounded-xl border border-amber-300/60 bg-amber-500/15 font-semibold text-amber-700 transition hover:bg-amber-500/25 dark:border-amber-300/40 dark:text-amber-200"
              >
                {{ selectedTipo()!.estadoTipoTramite === 'ACTIVO' ? 'Desactivar tipo' : 'Activar tipo' }}
              </button>
            }
          </section>

          <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
            <h2 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">
              {{ selectedTipo() ? 'Flujos del tipo seleccionado' : 'Todos los flujos' }}
            </h2>
            @if (selectedTipo()) {
              <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">
                Tipo: {{ selectedTipo()!.nombre }}
              </p>
            }
            <div class="mt-3 space-y-2">
              @for (flujo of flujosVisiblesEnPanel(); track flujo.id) {
                <div class="rounded-xl border border-violet-200/70 bg-white/90 p-3 dark:border-violet-400/20 dark:bg-violet-950/40">
                  <div class="flex items-center justify-between gap-2">
                    <p class="m-0 text-sm font-semibold text-violet-900 dark:text-violet-100">{{ flujo.nombre }}</p>
                    <span class="rounded-lg bg-violet-600 px-2 py-1 text-[10px] font-semibold text-white">v{{ flujo.version }}</span>
                  </div>
                  <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">Tipo: {{ nombreTipoTramite(flujo.tipoTramiteId) }}</p>
                  <p class="m-0 mt-1 text-xs uppercase tracking-[0.12em] text-violet-600 dark:text-violet-400">Estado: {{ flujo.estadoFlujo }}</p>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      (click)="publicarFlujo(flujo.id)"
                      [disabled]="loading() || flujo.estadoFlujo === 'PUBLICADO'"
                      class="h-8 rounded-lg border border-emerald-300/60 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-700 disabled:opacity-60 dark:text-emerald-200"
                    >
                      {{ flujo.estadoFlujo === 'PUBLICADO' ? 'Ya publicado' : 'Seleccionar y publicar' }}
                    </button>
                    <button
                      type="button"
                      (click)="cambiarEstadoFlujo(flujo.id, 'DESACTIVADO')"
                      [disabled]="loading() || flujo.estadoFlujo === 'DESACTIVADO'"
                      class="h-8 rounded-lg border border-amber-300/60 bg-amber-500/15 px-3 text-xs font-semibold text-amber-700 disabled:opacity-60 dark:text-amber-200"
                    >
                      Desactivar
                    </button>
                  </div>
                </div>
              } @empty {
                <p class="rounded-xl border border-violet-300/50 bg-violet-100/60 px-3 py-3 text-sm text-violet-800 dark:border-violet-400/20 dark:bg-violet-800/25 dark:text-violet-200">
                  No hay flujos para mostrar.
                </p>
              }
            </div>
          </section>
        </article>
      </section>

      @if (showCrearTipoModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/45 p-4">
          <section class="w-full max-w-2xl rounded-2xl border border-violet-300/60 bg-white p-5 shadow-2xl dark:border-violet-500/20 dark:bg-violet-950">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Registrar tipo de tramite</h3>
                <p class="m-0 mt-1 text-sm text-violet-700 dark:text-violet-300">Completa los datos para crear un nuevo tipo.</p>
              </div>
              <button type="button" (click)="cerrarModalCrearTipo()" class="rounded-lg border border-violet-300/70 px-2 py-1 text-xs font-semibold text-violet-700 dark:text-violet-100">
                Cerrar
              </button>
            </div>

            <form class="mt-4 space-y-3" [formGroup]="crearForm" (ngSubmit)="crearTipo()">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Nombre</span>
                <input formControlName="nombre" class="field-input" />
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Tramite</span>
                <input [value]="crearForm.controls.nombre.value" readonly class="field-input opacity-80" />
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Descripcion</span>
                <textarea formControlName="descripcion" rows="3" class="field-area"></textarea>
              </label>
              <div class="grid gap-2 sm:grid-cols-2">
                <button type="button" (click)="cerrarModalCrearTipo()" class="btn-secondary">Cancelar</button>
                <button type="submit" [disabled]="loading()" class="btn-primary">
                  {{ loading() ? 'Procesando...' : 'Registrar tipo' }}
                </button>
              </div>
            </form>
          </section>
        </div>
      }
    </div>
  `,
  styles: `
    .field-input {
      height: 2.75rem;
      width: 100%;
      border-radius: 0.75rem;
      border: 1px solid rgba(167, 139, 250, 0.45);
      background: rgba(255, 255, 255, 0.92);
      padding: 0 0.75rem;
      color: rgb(76, 29, 149);
      outline: none;
    }
    .field-area {
      width: 100%;
      border-radius: 0.75rem;
      border: 1px solid rgba(167, 139, 250, 0.45);
      background: rgba(255, 255, 255, 0.92);
      padding: 0.5rem 0.75rem;
      color: rgb(76, 29, 149);
      outline: none;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.8rem;
    }
    .btn-primary {
      height: 2.75rem;
      width: 100%;
      border-radius: 0.75rem;
      background: linear-gradient(to right, rgb(139, 92, 246), rgb(217, 70, 239));
      color: white;
      font-weight: 600;
    }
    .btn-secondary {
      height: 2.75rem;
      width: 100%;
      border-radius: 0.75rem;
      border: 1px solid rgba(167, 139, 250, 0.6);
      background: rgba(139, 92, 246, 0.15);
      color: rgb(109, 40, 217);
      font-weight: 600;
    }
  `,
})
export class GestionTiposTramitePageComponent implements OnInit {
  readonly loading = signal(false);
  readonly globalError = signal('');
  readonly globalMessage = signal('');
  readonly showCrearTipoModal = signal(false);
  readonly tipos = signal<TipoTramiteResumenResponse[]>([]);
  readonly flujos = signal<FlujoTramiteResumenResponse[]>([]);
  readonly selectedTipoId = signal<string | null>(null);
  readonly selectedTipo = signal<TipoTramiteResponse | null>(null);

  readonly estadoObjetivo = computed<EstadoTipoTramite>(() =>
    this.selectedTipo()?.estadoTipoTramite === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO',
  );
  readonly flujosVisiblesEnPanel = computed(() => {
    const tipoId = this.selectedTipoId();
    if (!tipoId) {
      return this.flujos();
    }
    return this.flujos().filter((flujo) => flujo.tipoTramiteId === tipoId);
  });

  readonly crearForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
  });

  readonly editarForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly flujosDisenoService: FlujosDisenoService,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUsuarioSesion();
    if (!user || user.rol !== 'ADMINISTRADOR') {
      this.router.navigateByUrl('/dashboard');
      return;
    }
    this.cargarTipos();
    this.cargarFlujos();
  }

  cargarTipos(): void {
    this.globalError.set('');
    this.loading.set(true);
    this.flujosDisenoService.listarTiposTramite().subscribe({
      next: (tipos) => {
        this.tipos.set(tipos);
        const selectedId = this.selectedTipoId();
        if (selectedId && tipos.some((item) => item.id === selectedId)) {
          this.seleccionarTipo(selectedId);
        } else {
          this.selectedTipoId.set(null);
          this.selectedTipo.set(null);
        }
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudieron cargar los tipos de tramite.'));
        this.loading.set(false);
      },
    });
  }

  cargarFlujos(): void {
    this.flujosDisenoService.listarFlujos().subscribe({
      next: (flujos) => this.flujos.set(flujos),
      error: () => this.flujos.set([]),
    });
  }

  seleccionarTipo(tipoTramiteId: string): void {
    this.globalError.set('');
    this.selectedTipoId.set(tipoTramiteId);
    this.flujosDisenoService.obtenerTipoTramite(tipoTramiteId).subscribe({
      next: (tipo) => {
        this.selectedTipo.set(tipo);
        this.editarForm.patchValue({
          nombre: tipo.nombre,
          descripcion: tipo.descripcion ?? '',
        });
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo cargar el tipo de tramite seleccionado.'));
      },
    });
  }

  crearTipo(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    if (this.crearForm.invalid) {
      this.crearForm.markAllAsTouched();
      this.globalError.set('Completa el nombre del nuevo tipo de tramite.');
      return;
    }

    this.loading.set(true);
    this.flujosDisenoService.crearTipoTramite({
      ...this.crearForm.getRawValue(),
      categoria: 'TRAMITE',
    }).subscribe({
      next: (tipo) => {
        this.globalMessage.set('Tipo de tramite registrado correctamente.');
        this.crearForm.reset({ nombre: '', descripcion: '' });
        this.showCrearTipoModal.set(false);
        this.loading.set(false);
        this.cargarTipos();
        this.cargarFlujos();
        this.seleccionarTipo(tipo.id);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo registrar el tipo de tramite.'));
        this.loading.set(false);
      },
    });
  }

  abrirModalCrearTipo(): void {
    this.globalError.set('');
    this.showCrearTipoModal.set(true);
  }

  cerrarModalCrearTipo(): void {
    this.showCrearTipoModal.set(false);
  }

  editarTipo(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const tipoId = this.selectedTipoId();
    if (!tipoId) {
      this.globalError.set('Selecciona un tipo para editar.');
      return;
    }
    if (this.editarForm.invalid) {
      this.editarForm.markAllAsTouched();
      this.globalError.set('Completa el nombre del tipo de tramite.');
      return;
    }

    this.loading.set(true);
    this.flujosDisenoService.actualizarTipoTramite(tipoId, {
      ...this.editarForm.getRawValue(),
      categoria: 'TRAMITE',
    }).subscribe({
      next: (tipo) => {
        this.selectedTipo.set(tipo);
        this.globalMessage.set('Tipo de tramite actualizado correctamente.');
        this.loading.set(false);
        this.cargarTipos();
        this.cargarFlujos();
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo actualizar el tipo de tramite.'));
        this.loading.set(false);
      },
    });
  }

  toggleEstado(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const tipoId = this.selectedTipoId();
    const tipo = this.selectedTipo();
    if (!tipoId || !tipo) {
      this.globalError.set('Selecciona un tipo para cambiar estado.');
      return;
    }

    const objetivo = this.estadoObjetivo();
    if (!confirm(`Confirmar cambio de estado a ${objetivo}?`)) {
      return;
    }

    this.loading.set(true);
    this.flujosDisenoService.cambiarEstadoTipoTramite(tipoId, { estadoTipoTramite: objetivo }).subscribe({
      next: (response) => {
        this.globalMessage.set(response.mensaje);
        this.loading.set(false);
        this.cargarTipos();
        this.cargarFlujos();
        this.seleccionarTipo(tipoId);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo cambiar el estado del tipo de tramite.'));
        this.loading.set(false);
      },
    });
  }

  private extraerMensajeError(error: unknown, fallback: string): string {
    const httpError = error as HttpErrorResponse;
    const backendMessage =
      httpError?.error && typeof httpError.error === 'object' ? (httpError.error as { message?: string }).message : undefined;
    return backendMessage ?? fallback;
  }

  contarFlujosPorTipo(tipoTramiteId: string): number {
    return this.flujos().filter((flujo) => flujo.tipoTramiteId === tipoTramiteId).length;
  }

  flujoPublicadoPorTipo(tipoTramiteId: string): FlujoTramiteResumenResponse | null {
    return this.flujos().find((flujo) => flujo.tipoTramiteId === tipoTramiteId && flujo.estadoFlujo === 'PUBLICADO') ?? null;
  }

  nombreTipoTramite(tipoTramiteId: string): string {
    return this.tipos().find((tipo) => tipo.id === tipoTramiteId)?.nombre ?? tipoTramiteId;
  }

  publicarFlujo(flujoId: string): void {
    this.cambiarEstadoFlujo(flujoId, 'PUBLICADO');
  }

  cambiarEstadoFlujo(flujoId: string, estadoFlujo: EstadoFlujo): void {
    this.globalError.set('');
    this.globalMessage.set('');
    this.loading.set(true);
    this.flujosDisenoService.cambiarEstadoFlujo(flujoId, { estadoFlujo }).subscribe({
      next: (response) => {
        this.globalMessage.set(response.mensaje);
        this.loading.set(false);
        this.cargarFlujos();
        this.cargarTipos();
        const tipoId = this.selectedTipoId();
        if (tipoId) {
          this.seleccionarTipo(tipoId);
        }
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo cambiar el estado del flujo.'));
        this.loading.set(false);
      },
    });
  }
}
