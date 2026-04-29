import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { BpmnCanvasComponent } from '../../../compartido/componentes/bpmn-canvas.component';
import { AuthService } from '../../../nucleo/autenticacion/auth.service';
import {
  type CampoFormularioInicioResponse,
  type ClienteTramiteDisponibleResponse,
  type RequisitosTramiteResponse,
  type TipoTramiteDisponibleResponse,
  TramitesService,
} from '../../../nucleo/tramites/tramites.service';

type ArchivoFormularioInicioMeta = {
  nombre: string;
  tipoMime: string;
};

@Component({
  selector: 'app-gestion-tramites-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BpmnCanvasComponent],
  template: `
    <div class="space-y-5">
      <section class="rounded-2xl border border-violet-300/60 bg-white/85 p-6 dark:border-violet-500/20 dark:bg-violet-900/30">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Operacion</p>
        <h1 class="m-0 mt-1 text-3xl font-semibold text-violet-950 dark:text-violet-50">Registrar tramite</h1>
        <p class="m-0 mt-2 text-violet-700 dark:text-violet-200">
          CU-22: registro de instancia segun flujo publicado. El listado y detalle se encuentran en la vista Mis tramites.
        </p>
      </section>

      @if (error()) {
        <p class="rounded-xl border border-rose-300/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">{{ error() }}</p>
      }
      @if (message()) {
        <p class="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-100">{{ message() }}</p>
      }

      <section class="rounded-2xl border border-violet-300/50 bg-white/90 p-5 dark:border-violet-500/20 dark:bg-violet-900/30">
        <label class="block space-y-1 text-sm">
          <span class="font-medium text-violet-800 dark:text-violet-100">Tipo de tramite</span>
          <select
            [value]="selectedTipoTramiteId() ?? ''"
            (change)="seleccionarTipoTramite($any($event.target).value)"
            class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50"
          >
            <option value="">Selecciona...</option>
            @for (tipo of tiposDisponibles(); track tipo.id) {
              <option [value]="tipo.id">{{ tipo.nombre }}</option>
            }
          </select>
        </label>

        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <label class="space-y-1 text-sm sm:col-span-2">
            <span class="font-medium text-violet-800 dark:text-violet-100">Cliente (rol USUARIO) *</span>
            <div class="flex items-center gap-2">
              <select
                [value]="clienteSeleccionadoId() ?? ''"
                (change)="seleccionarClientePorId($any($event.target).value)"
                class="h-10 w-full rounded-lg border border-violet-300/70 px-3 text-sm text-violet-900 outline-none dark:border-violet-400/20 dark:bg-violet-950/50 dark:text-violet-100"
              >
                <option value="">Selecciona cliente...</option>
                @for (cliente of clientesDisponibles(); track cliente.id) {
                  <option [value]="cliente.id">{{ cliente.nombres }} {{ cliente.apellidos }} - {{ cliente.correo }}</option>
                }
              </select>
              <button
                type="button"
                (click)="quitarClienteSeleccionado()"
                [disabled]="!clienteSeleccionadoId()"
                class="h-10 rounded-lg border border-violet-300/70 px-3 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-400/20 dark:text-violet-200 dark:hover:bg-violet-800/35"
              >
                Quitar
              </button>
            </div>
            @if (loadingClientes()) {
              <p class="m-0 text-xs text-violet-700 dark:text-violet-300">Cargando clientes...</p>
            }
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium text-violet-800 dark:text-violet-100">Cliente - Nombres *</span>
            <input
              [formControl]="clienteForm.controls.clienteNombres"
              readonly
              class="h-10 w-full rounded-lg border border-violet-300/70 px-3 text-sm text-violet-900 outline-none dark:border-violet-400/20 dark:bg-violet-950/50 dark:text-violet-100"
            />
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium text-violet-800 dark:text-violet-100">Cliente - Apellidos *</span>
            <input
              [formControl]="clienteForm.controls.clienteApellidos"
              readonly
              class="h-10 w-full rounded-lg border border-violet-300/70 px-3 text-sm text-violet-900 outline-none dark:border-violet-400/20 dark:bg-violet-950/50 dark:text-violet-100"
            />
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium text-violet-800 dark:text-violet-100">Cliente - Telefono</span>
            <input
              [formControl]="clienteForm.controls.clienteTelefono"
              readonly
              class="h-10 w-full rounded-lg border border-violet-300/70 px-3 text-sm text-violet-900 outline-none dark:border-violet-400/20 dark:bg-violet-950/50 dark:text-violet-100"
            />
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium text-violet-800 dark:text-violet-100">Cliente - Correo (solo lectura)</span>
            <input
              [formControl]="clienteForm.controls.clienteEmail"
              readonly
              class="h-10 w-full rounded-lg border border-violet-300/70 px-3 text-sm text-violet-900 outline-none dark:border-violet-400/20 dark:bg-violet-950/50 dark:text-violet-100"
            />
          </label>
        </div>

        @if (requisitosTipoSeleccionado()) {
          <div class="mt-3 rounded-xl border border-violet-300/60 bg-violet-100/50 p-3 dark:border-violet-400/20 dark:bg-violet-800/25">
            <p class="m-0 text-sm font-semibold text-violet-900 dark:text-violet-100">{{ requisitosTipoSeleccionado()!.tipoTramiteNombre }}</p>
            @if (requisitosTipoSeleccionado()!.flujoNombre) {
              <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">Flujo activo: {{ requisitosTipoSeleccionado()!.flujoNombre }}</p>
            }
            @if (requisitosTipoSeleccionado()!.observaciones) {
              <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">{{ requisitosTipoSeleccionado()!.observaciones }}</p>
            }
            <p class="m-0 mt-2 text-xs text-violet-700 dark:text-violet-300">Docs obligatorios: {{ unirLista(requisitosTipoSeleccionado()!.documentosObligatorios) }}</p>
            <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">Docs opcionales: {{ unirLista(requisitosTipoSeleccionado()!.documentosOpcionales) }}</p>
          </div>
        }

        @if (flujoPreviewXml()) {
          <div class="mt-3 rounded-xl border border-violet-300/60 bg-white/90 p-2 dark:border-violet-400/20 dark:bg-violet-950/40">
            <p class="m-0 mb-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-violet-700 dark:text-violet-300">Vista previa del flujo</p>
            <app-bpmn-canvas [xml]="flujoPreviewXml()" mode="viewer" [height]="280"></app-bpmn-canvas>
          </div>
        }

        <div class="mt-3 space-y-2">
          <p class="m-0 text-sm font-semibold text-violet-900 dark:text-violet-100">Formulario inicial de requisitos</p>
          @if (camposFormularioInicio().length === 0) {
            <p class="m-0 rounded-xl border border-dashed border-violet-300/70 bg-violet-100/50 px-3 py-2 text-xs text-violet-700 dark:border-violet-400/30 dark:bg-violet-900/25 dark:text-violet-300">
              No hay campos configurados en el nodo de inicio para este flujo publicado.
            </p>
          } @else {
            @for (campo of camposFormularioInicio(); track campo.idCampo) {
              <section class="rounded-xl border border-violet-300/50 bg-white/95 p-3 dark:border-violet-400/20 dark:bg-violet-950/40">
                <p class="m-0 text-sm font-semibold text-violet-900 dark:text-violet-100">
                  {{ campo.etiqueta }}
                  @if (campo.obligatorio) {
                    <span class="text-rose-600">*</span>
                  }
                </p>
                <p class="m-0 mt-1 text-xs" [class.text-rose-700]="campo.obligatorio" [class.text-violet-700]="!campo.obligatorio">
                  {{ campo.obligatorio ? 'Rellenar obligatorio.' : 'Campo opcional.' }}
                </p>
                @if (campo.ayuda) {
                  <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">{{ campo.ayuda }}</p>
                }

                @if (campo.tipoCampo === 'BOOLEANO') {
                  <label class="mt-2 flex items-center gap-2 text-sm text-violet-800 dark:text-violet-200">
                    <input
                      type="checkbox"
                      [checked]="valorBooleanoCampoInicio(campo.idCampo)"
                      (change)="setCampoInicio(campo.idCampo, $any($event.target).checked)"
                    />
                    Marcar
                  </label>
                } @else if (campo.tipoCampo === 'AREA_TEXTO') {
                  <textarea
                    rows="3"
                    class="mt-2 w-full rounded-lg border border-violet-300/70 px-3 py-2 text-sm text-violet-900 outline-none dark:border-violet-400/20 dark:bg-violet-950/50 dark:text-violet-100"
                    [value]="valorTextoCampoInicio(campo.idCampo)"
                    (input)="setCampoInicio(campo.idCampo, $any($event.target).value)"
                  ></textarea>
                } @else if (campo.tipoCampo === 'ARCHIVO' || campo.tipoCampo === 'IMAGEN') {
                  <div class="mt-2 space-y-2">
                    <input #inputArchivo type="file" (change)="cargarArchivoCampoInicio(campo.idCampo, $event)" />
                    @if (valorTextoCampoInicio(campo.idCampo)) {
                      <p class="m-0 text-xs text-violet-700 dark:text-violet-300">
                        Archivo cargado: {{ metaArchivoCampoInicio(campo.idCampo)?.nombre || 'Adjunto' }}
                      </p>
                      <div class="flex items-start gap-2">
                        @if (esImagenCampoInicio(campo.idCampo)) {
                          <img
                            [src]="valorTextoCampoInicio(campo.idCampo)"
                            alt="Vista previa de imagen"
                            class="h-20 w-20 rounded-lg border border-violet-300/60 object-cover dark:border-violet-400/20"
                          />
                        } @else {
                          <a
                            [href]="valorTextoCampoInicio(campo.idCampo)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex rounded-md border border-violet-300/70 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-400/20 dark:text-violet-200 dark:hover:bg-violet-800/35"
                          >
                            Ver documento
                          </a>
                        }
                        <button
                          type="button"
                          (click)="limpiarArchivoCampoInicio(campo.idCampo, inputArchivo)"
                          title="Quitar archivo"
                          class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-300/80 text-sm text-rose-700 hover:bg-rose-100 dark:border-rose-400/40 dark:text-rose-300 dark:hover:bg-rose-900/30"
                        >
                          <span class="pi pi-trash"></span>
                        </button>
                      </div>
                    }
                  </div>
                } @else {
                  <input
                    class="mt-2 h-10 w-full rounded-lg border border-violet-300/70 px-3 text-sm text-violet-900 outline-none dark:border-violet-400/20 dark:bg-violet-950/50 dark:text-violet-100"
                    [value]="valorTextoCampoInicio(campo.idCampo)"
                    (input)="setCampoInicio(campo.idCampo, $any($event.target).value)"
                  />
                }
              </section>
            }
          }
        </div>

        <button
          type="button"
          (click)="registrarTramite()"
          [disabled]="loadingRegistro() || !puedeRegistrarTramite()"
          class="mt-4 h-11 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {{ loadingRegistro() ? 'Registrando...' : 'Registrar tramite' }}
        </button>
      </section>
    </div>
  `,
})
export class GestionTramitesPageComponent implements OnInit {
  readonly tiposDisponibles = signal<TipoTramiteDisponibleResponse[]>([]);
  readonly selectedTipoTramiteId = signal<string | null>(null);
  readonly requisitosTipoSeleccionado = signal<RequisitosTramiteResponse | null>(null);
  readonly flujoPreviewXml = signal('');
  readonly camposInicioValores = signal<Record<string, string | boolean>>({});
  readonly camposInicioArchivosMeta = signal<Record<string, ArchivoFormularioInicioMeta>>({});
  readonly clientesDisponibles = signal<ClienteTramiteDisponibleResponse[]>([]);
  readonly loadingClientes = signal(false);
  readonly clienteSeleccionadoId = signal<string | null>(null);

  readonly error = signal('');
  readonly message = signal('');
  readonly loadingRegistro = signal(false);

  readonly esEjecutivo = computed(() => this.authService.getUsuarioSesion()?.rol === 'EJECUTIVO');
  readonly camposFormularioInicio = computed(() => this.requisitosTipoSeleccionado()?.camposFormularioInicio ?? []);

  readonly clienteForm = this.formBuilder.nonNullable.group({
    clienteNombres: ['', [Validators.required]],
    clienteApellidos: ['', [Validators.required]],
    clienteTelefono: [''],
    clienteEmail: ['', [Validators.required]],
  });

  constructor(
    private readonly tramitesService: TramitesService,
    private readonly authService: AuthService,
    private readonly formBuilder: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.cargarTiposDisponibles();
    if (this.esEjecutivo()) {
      this.cargarClientesDisponibles();
    }
  }

  cargarTiposDisponibles(): void {
    this.tramitesService.listarTiposDisponibles().subscribe({
      next: (tipos) => this.tiposDisponibles.set(tipos),
      error: (error: unknown) => this.error.set(this.extraerMensajeError(error, 'No se pudieron cargar los tipos disponibles.')),
    });
  }

  seleccionarTipoTramite(tipoTramiteId: string): void {
    this.selectedTipoTramiteId.set(tipoTramiteId || null);
    this.requisitosTipoSeleccionado.set(null);
    this.flujoPreviewXml.set('');
    this.camposInicioValores.set({});
    this.camposInicioArchivosMeta.set({});

    if (!tipoTramiteId) {
      return;
    }

    this.tramitesService.consultarRequisitosTipo(tipoTramiteId).subscribe({
      next: (requisitos) => {
        this.requisitosTipoSeleccionado.set(requisitos);
        this.flujoPreviewXml.set((requisitos.bpmnXml ?? '').trim());
        const inicial: Record<string, string | boolean> = {};
        for (const campo of requisitos.camposFormularioInicio) {
          inicial[campo.idCampo] = campo.tipoCampo === 'BOOLEANO' ? false : '';
        }
        this.camposInicioValores.set(inicial);
      },
      error: (error: unknown) =>
        this.error.set(this.extraerMensajeError(error, 'No se pudieron consultar los requisitos del tipo seleccionado.')),
    });
  }

  cargarClientesDisponibles(): void {
    this.loadingClientes.set(true);
    this.tramitesService.buscarClientesDisponibles('').subscribe({
      next: (clientes) => {
        this.clientesDisponibles.set(clientes);
        this.loadingClientes.set(false);
      },
      error: (error: unknown) => {
        this.loadingClientes.set(false);
        this.clientesDisponibles.set([]);
        this.error.set(this.extraerMensajeError(error, 'No se pudieron cargar los usuarios cliente.'));
      },
    });
  }

  seleccionarClientePorId(clienteId: string): void {
    const cliente = this.clientesDisponibles().find((item) => item.id === clienteId);
    if (!cliente) {
      this.clienteSeleccionadoId.set(null);
      this.clienteForm.patchValue({
        clienteNombres: '',
        clienteApellidos: '',
        clienteTelefono: '',
        clienteEmail: '',
      });
      return;
    }

    this.clienteSeleccionadoId.set(cliente.id);
    this.clienteForm.patchValue({
      clienteNombres: cliente.nombres,
      clienteApellidos: cliente.apellidos,
      clienteTelefono: cliente.telefono ?? '',
      clienteEmail: cliente.correo ?? '',
    });
  }

  quitarClienteSeleccionado(): void {
    this.seleccionarClientePorId('');
  }

  puedeRegistrarTramite(): boolean {
    if (!this.esEjecutivo()) {
      return false;
    }
    if (!this.selectedTipoTramiteId() || !this.clienteSeleccionadoId()) {
      return false;
    }
    if (this.clienteForm.invalid) {
      return false;
    }
    const valores = this.camposInicioValores();
    return this.camposFormularioInicio()
      .filter((campo) => campo.obligatorio)
      .every((campo) => !this.valorCampoInicioInvalido(campo, valores[campo.idCampo]));
  }

  registrarTramite(): void {
    if (!this.esEjecutivo()) {
      this.error.set('Solo el rol EJECUTIVO puede registrar tramites.');
      return;
    }

    const tipoTramiteId = this.selectedTipoTramiteId();
    if (!tipoTramiteId) {
      this.error.set('Selecciona un tipo de tramite.');
      return;
    }

    const clienteUsuarioId = this.clienteSeleccionadoId();
    if (!clienteUsuarioId) {
      this.error.set('Selecciona un cliente valido (rol USUARIO).');
      return;
    }

    if (this.clienteForm.invalid) {
      this.clienteForm.markAllAsTouched();
      this.error.set('Completa los datos obligatorios del cliente (nombres, apellidos y correo).');
      return;
    }

    const campos = this.camposFormularioInicio();
    const valores = this.camposInicioValores();
    const faltantes = campos
      .filter((campo) => campo.obligatorio)
      .filter((campo) => this.valorCampoInicioInvalido(campo, valores[campo.idCampo]))
      .map((campo) => campo.etiqueta);

    if (faltantes.length > 0) {
      this.error.set(`Completa los campos obligatorios: ${faltantes.join(', ')}`);
      return;
    }

    const cliente = this.clienteForm.getRawValue();
    const datosFormularioInicial: Record<string, unknown> = {
      clienteUsuarioId,
      clienteNombres: cliente.clienteNombres.trim(),
      clienteApellidos: cliente.clienteApellidos.trim(),
      clienteNombre: `${cliente.clienteNombres.trim()} ${cliente.clienteApellidos.trim()}`.trim(),
    };

    if (cliente.clienteTelefono?.trim()) {
      datosFormularioInicial['clienteTelefono'] = cliente.clienteTelefono.trim();
    }
    if (cliente.clienteEmail?.trim()) {
      datosFormularioInicial['clienteEmail'] = cliente.clienteEmail.trim();
    }

    for (const campo of campos) {
      const valor = valores[campo.idCampo];
      if (campo.tipoCampo === 'BOOLEANO') {
        datosFormularioInicial[campo.idCampo] = valor === true;
      } else if (typeof valor === 'string' && valor.trim().length > 0) {
        datosFormularioInicial[campo.idCampo] = valor.trim();
      }
    }

    this.loadingRegistro.set(true);
    this.error.set('');
    this.message.set('');

    this.tramitesService.registrar({ tipoTramiteId, datosFormularioInicial }).subscribe({
      next: (creado) => {
        this.loadingRegistro.set(false);
        this.message.set(`Tramite registrado correctamente: ${creado.codigoTramite}`);
        this.clienteForm.patchValue({
          clienteNombres: '',
          clienteApellidos: '',
          clienteTelefono: '',
          clienteEmail: '',
        });
        this.clienteSeleccionadoId.set(null);
        this.camposInicioValores.set({});
        this.camposInicioArchivosMeta.set({});
      },
      error: (error: unknown) => {
        this.loadingRegistro.set(false);
        this.error.set(this.extraerMensajeError(error, 'No se pudo registrar el tramite.'));
      },
    });
  }

  setCampoInicio(idCampo: string, valor: string | boolean): void {
    this.camposInicioValores.update((actual) => ({ ...actual, [idCampo]: valor }));
  }

  valorTextoCampoInicio(idCampo: string): string {
    const valor = this.camposInicioValores()[idCampo];
    if (typeof valor === 'boolean') {
      return valor ? 'true' : 'false';
    }
    return (valor ?? '') as string;
  }

  valorBooleanoCampoInicio(idCampo: string): boolean {
    return this.camposInicioValores()[idCampo] === true;
  }

  cargarArchivoCampoInicio(idCampo: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.camposInicioArchivosMeta.update((actual) => ({
      ...actual,
      [idCampo]: { nombre: file.name, tipoMime: file.type ?? '' },
    }));

    const reader = new FileReader();
    reader.onload = () => {
      const contenido = typeof reader.result === 'string' ? reader.result : '';
      this.setCampoInicio(idCampo, contenido);
    };
    reader.onerror = () => this.error.set('No se pudo leer el archivo del formulario inicial.');
    reader.readAsDataURL(file);
  }

  limpiarArchivoCampoInicio(idCampo: string, inputArchivo?: HTMLInputElement): void {
    this.setCampoInicio(idCampo, '');
    this.camposInicioArchivosMeta.update((actual) => {
      const copia = { ...actual };
      delete copia[idCampo];
      return copia;
    });
    if (inputArchivo) {
      inputArchivo.value = '';
    }
  }

  metaArchivoCampoInicio(idCampo: string): ArchivoFormularioInicioMeta | null {
    return this.camposInicioArchivosMeta()[idCampo] ?? null;
  }

  esImagenCampoInicio(idCampo: string): boolean {
    const tipo = this.metaArchivoCampoInicio(idCampo)?.tipoMime?.toLowerCase() ?? '';
    return tipo.startsWith('image/');
  }

  unirLista(items: string[]): string {
    return items.length === 0 ? 'Ninguno' : items.join(', ');
  }

  private valorCampoInicioInvalido(campo: CampoFormularioInicioResponse, valor: string | boolean | undefined): boolean {
    if (campo.tipoCampo === 'BOOLEANO') {
      return typeof valor !== 'boolean';
    }
    return typeof valor !== 'string' || valor.trim().length === 0;
  }

  private extraerMensajeError(error: unknown, fallback: string): string {
    const httpError = error as HttpErrorResponse;
    const backendMessage =
      httpError?.error && typeof httpError.error === 'object'
        ? (httpError.error as { message?: string }).message
        : undefined;
    return backendMessage ?? fallback;
  }
}
