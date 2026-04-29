import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../nucleo/autenticacion/auth.service';
import { DepartamentosAdminService } from '../../../nucleo/administracion/departamentos-admin.service';
import { AuditoriaUiService } from '../../../nucleo/supervision/auditoria-ui.service';
import { BpmnCanvasComponent, type BpmnElementClickEvent } from '../../../compartido/componentes/bpmn-canvas.component';
import { bpmnXmlToFlowPayload, flowToBpmnXml } from '../../../nucleo/diseno/bpmn-xml.mapper';
import {
  type ConfiguracionFlujoResponse,
  type DepartamentoDisenoResponse,
  type EditarFormularioActividadDesdePromptRequest,
  type EstadoFlujo,
  FlujosDisenoService,
  type FlujoTramiteResponse,
  type FlujoTramiteResumenResponse,
  type FlujoVisualizacionResponse,
  type FormularioDepartamentoResponse,
  type ResultadoConstruccionFlujoResponse,
  type TipoTramiteResumenResponse,
} from '../../../nucleo/diseno/flujos-diseno.service';

type DisenoTab =
  | 'gestion'
  | 'configuracion'
  | 'formularios'
  | 'visualizacion'
  | 'prompt'
  | 'guiado'
  | 'grafico';

type CampoFormularioActividad = {
  idCampo: string;
  nombreTecnico: string;
  etiqueta: string;
  tipoCampo: 'AREA_TEXTO' | 'IMAGEN' | 'ARCHIVO';
  obligatorio: boolean;
  visible: boolean;
  editable: boolean;
  esencial: boolean;
  orden: number;
  placeholder: string;
  ayuda: string;
  validaciones: string[];
  opciones: unknown[];
};

type FormularioActividad = {
  nombreFormulario: string;
  descripcion: string;
  versionInterna: number;
  activo: boolean;
  campos: CampoFormularioActividad[];
};

type CampoActividadDraft = {
  id: string;
  etiqueta: string;
  tipo: 'AREA_TEXTO' | 'IMAGEN' | 'ARCHIVO';
  obligatorio: boolean;
  ayuda: string;
};

type CaminoDecisionModal = {
  idTransicion: string;
  nombreCamino: string;
  destinoId: string;
  destinoNombre: string;
};

type CaminoFinModal = {
  idTransicion: string;
  nombreCamino: string;
  origenId: string;
  origenNombre: string;
  camposEntregable: CampoEntregableDecision[];
};

type EstadoCondicionDecision = 'SI' | 'NO' | 'CUALQUIERA';

type CampoEntregableDecision = {
  claveCampo: string;
  nodoId: string;
  nodoNombre: string;
  idCampo: string;
  etiqueta: string;
  tipoCampo: 'AREA_TEXTO' | 'IMAGEN' | 'ARCHIVO';
  obligatorio: boolean;
};

@Component({
  selector: 'app-diseno-flujos-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BpmnCanvasComponent],
  template: `
    <div class="space-y-5">
      <section class="rounded-2xl border border-violet-300/60 bg-white/85 p-6 dark:border-violet-500/20 dark:bg-violet-900/30">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Diseno de tramites</p>
        <h1 class="m-0 mt-1 text-3xl font-semibold text-violet-950 dark:text-violet-50">Flujos de tramite (CU-12 a CU-21)</h1>
        <p class="m-0 mt-2 text-violet-700 dark:text-violet-200">
          Pantalla integral para crear, editar, clonar, configurar, visualizar, publicar/desactivar y construir flujos.
        </p>
      </section>

      @if (globalError()) {
        <p class="rounded-xl border border-rose-300/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">{{ globalError() }}</p>
      }
      @if (globalMessage()) {
        <p class="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-100">{{ globalMessage() }}</p>
      }

      @if (activeTab() === 'grafico') {
        <section class="rounded-2xl border border-violet-300/50 bg-violet-100/50 p-4 dark:border-violet-500/20 dark:bg-violet-900/30">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-200">
              Ubicacion: Flujo base / Editor grafico
            </p>
            <button type="button" (click)="volverAFlujoBase()" class="rounded-lg border border-violet-300/70 px-3 py-2 text-xs font-semibold text-violet-800 dark:border-violet-400/30 dark:text-violet-100">
              Volver a flujo base
            </button>
          </div>
        </section>
      }

      @if (activeTab() !== 'grafico') {
      <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 class="m-0 text-xl font-semibold text-violet-900 dark:text-violet-100">Diseno de flujos</h2>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              (click)="nuevoFlujoDesdePanel()"
              class="h-10 rounded-xl border border-violet-500/70 bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500 dark:border-violet-400/30"
            >
              Nuevo flujo
            </button>
            <button
              type="button"
              (click)="cargarBase()"
              [disabled]="loadingBase()"
              class="h-10 rounded-xl border border-violet-300/70 px-4 text-sm font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-60 dark:border-violet-400/30 dark:text-violet-100 dark:hover:bg-violet-800/35"
            >
              {{ loadingBase() ? 'Actualizando...' : 'Refrescar datos base' }}
            </button>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div class="space-y-2">
            <h3 class="m-0 mb-2 text-lg font-semibold text-violet-900 dark:text-violet-100">Flujos registrados</h3>
            @for (flujo of flujos(); track flujo.id) {
              <article
                class="w-full rounded-xl border p-3 text-left transition"
                [class.border-violet-500]="flujo.id === selectedFlujoId()"
                [class.bg-violet-100/70]="flujo.id === selectedFlujoId()"
                [class.dark:bg-violet-700/25]="flujo.id === selectedFlujoId()"
                [class.border-violet-200/70]="flujo.id !== selectedFlujoId()"
                [class.dark:border-violet-400/20]="flujo.id !== selectedFlujoId()"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <strong class="text-sm text-violet-950 dark:text-violet-50">{{ flujo.nombre }}</strong>
                  <span class="rounded-lg bg-violet-600 px-2 py-1 text-xs font-semibold text-white">v{{ flujo.version }}</span>
                </div>
                <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">Tipo: {{ nombreTipoTramite(flujo.tipoTramiteId) }}</p>
                <p class="m-0 mt-1 text-xs uppercase tracking-[0.12em] text-violet-600 dark:text-violet-400">Estado: {{ flujo.estadoFlujo }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    (click)="seleccionarFlujoDesdeListado(flujo.id)"
                    class="rounded-md border border-violet-300/70 px-2 py-1 text-[10px] font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-400/30 dark:text-violet-100 dark:hover:bg-violet-800/35"
                  >
                    Seleccionar
                  </button>
                </div>
              </article>
            } @empty {
              <p class="rounded-xl border border-violet-300/50 bg-violet-100/60 px-3 py-3 text-sm text-violet-800 dark:border-violet-400/20 dark:bg-violet-800/25 dark:text-violet-200">
                No hay flujos registrados.
              </p>
            }
          </div>

          <article class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
            <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">
              {{ selectedFlujoId() ? 'Editar flujo seleccionado' : 'Crear nuevo flujo' }}
            </h3>
            <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">
              Llena los datos del flujo y luego abre el editor grafico.
            </p>

            <form class="mt-4 space-y-3" [formGroup]="crearFlujoForm" (ngSubmit)="guardarFlujoDesdePanel()">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Tipo de tramite (escribe el nombre)</span>
                <input
                  formControlName="tipoTramiteNombre"
                  class="field-input"
                  placeholder="Ej: Crear tramite"
                />
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Nombre</span>
                <input formControlName="nombre" class="field-input" />
              </label>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Version inicial</span>
                  <input type="number" min="1" formControlName="version" class="field-input" />
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Observaciones</span>
                  <input formControlName="observaciones" class="field-input" />
                </label>
              </div>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Descripcion</span>
                <textarea formControlName="descripcion" rows="3" class="field-area"></textarea>
              </label>
              <button type="submit" [disabled]="loadingGestion()" class="btn-primary">
                {{ loadingGestion() ? 'Procesando...' : (selectedFlujoId() ? 'Guardar cambios' : 'Crear flujo') }}
              </button>
            </form>

            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <button type="button" (click)="irAlEditorDesdePanel()" class="btn-secondary">Abrir editor grafico</button>
              <button type="button" (click)="nuevoFlujoDesdePanel()" class="btn-secondary">Limpiar seleccion</button>
            </div>
            @if (selectedFlujoId()) {
              <div class="mt-2">
                <button type="button" (click)="abrirModalClonarFlujo()" class="btn-secondary">Clonar flujo</button>
              </div>
            }
          </article>
        </div>
      </section>
      }

      @if (false) {
        <section class="grid gap-5 xl:grid-cols-2">
          <article class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
            <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Paso 1 - Crear flujo</h3>
            <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">Completa los datos y luego pasa al editor grafico.</p>
            <form class="mt-4 space-y-3" [formGroup]="crearFlujoForm" (ngSubmit)="irAlEditorGraficoConNuevoFlujo()">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Tipo de tramite</span>
                <select formControlName="tipoTramiteId" class="field-input">
                  <option value="">Selecciona...</option>
                  @for (tipo of tiposTramiteActivos(); track tipo.id) {
                    <option [value]="tipo.id">{{ tipo.nombre }}</option>
                  }
                </select>
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Nombre</span>
                <input formControlName="nombre" class="field-input" />
              </label>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Version inicial</span>
                  <input type="number" min="1" formControlName="version" class="field-input" />
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Observaciones</span>
                  <input formControlName="observaciones" class="field-input" />
                </label>
              </div>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Descripcion</span>
                <textarea formControlName="descripcion" rows="3" class="field-area"></textarea>
              </label>
              <button type="submit" class="btn-primary">
                Continuar al editor grafico
              </button>
            </form>
          </article>

          <article class="space-y-5">
            <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
              <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Paso 1 - Editar flujo existente</h3>
              <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">
                Primero selecciona un flujo en el catalogo y luego entra al editor grafico.
              </p>
              <div class="mt-4">
                <button type="button" (click)="irAlEditorGraficoEditarSeleccionado()" class="btn-primary">Editar flujo seleccionado en grafico</button>
              </div>
            </section>

            <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
              <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">CU-14 Clonar version</h3>
              <form class="mt-4 space-y-3" [formGroup]="clonarFlujoForm" (ngSubmit)="clonarFlujo()">
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Nombre nueva version</span>
                  <input formControlName="nombre" class="field-input" />
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Descripcion</span>
                  <textarea formControlName="descripcion" rows="2" class="field-area"></textarea>
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Observaciones</span>
                  <input formControlName="observaciones" class="field-input" />
                </label>
                <button type="submit" [disabled]="loadingGestion()" class="btn-secondary">Clonar flujo</button>
              </form>
            </section>

            <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
              <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">CU-18 Publicar o desactivar</h3>
              <form class="mt-4 space-y-3" [formGroup]="estadoFlujoForm" (ngSubmit)="cambiarEstadoFlujo()">
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Nuevo estado</span>
                  <select formControlName="estadoFlujo" class="field-input">
                    @for (estado of estadosFlujoPermitidos; track estado) {
                      <option [value]="estado">{{ estado }}</option>
                    }
                  </select>
                </label>
                <button type="submit" [disabled]="loadingGestion()" class="btn-secondary">Aplicar estado</button>
              </form>
            </section>
          </article>
        </section>
      }

      @if (activeTab() === 'configuracion') {
        <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
          <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">CU-15 Configurar flujo</h3>
          <form class="mt-4 grid gap-3 lg:grid-cols-3" [formGroup]="configuracionForm">
            <label class="space-y-1 text-sm lg:col-span-3">
              <span class="font-medium text-violet-800 dark:text-violet-100">Flujo</span>
              <select formControlName="flujoId" class="field-input">
                <option value="">Selecciona...</option>
                @for (flujo of flujos(); track flujo.id) {
                  <option [value]="flujo.id">{{ flujo.nombre }} (v{{ flujo.version }})</option>
                }
              </select>
            </label>

            <label class="space-y-1 text-sm">
              <span class="font-medium text-violet-800 dark:text-violet-100">Nodos (JSON array)</span>
              <textarea formControlName="nodosJson" rows="12" class="field-area"></textarea>
            </label>
            <label class="space-y-1 text-sm">
              <span class="font-medium text-violet-800 dark:text-violet-100">Transiciones (JSON array)</span>
              <textarea formControlName="transicionesJson" rows="12" class="field-area"></textarea>
            </label>
            <label class="space-y-1 text-sm">
              <span class="font-medium text-violet-800 dark:text-violet-100">Reglas globales (JSON array)</span>
              <textarea formControlName="reglasJson" rows="12" class="field-area"></textarea>
            </label>
          </form>
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" (click)="cargarConfiguracionFlujo()" [disabled]="loadingConfiguracion()" class="btn-secondary">
              Cargar configuracion
            </button>
            <button type="button" (click)="guardarConfiguracionFlujo()" [disabled]="loadingConfiguracion()" class="btn-primary">
              Guardar configuracion
            </button>
          </div>
          @if (configuracionResultado()) {
            <p class="mt-3 text-xs text-violet-700 dark:text-violet-300">
              Validacion: {{ configuracionResultado()!.resultadoValidacion?.valido ? 'VALIDO' : 'CON OBSERVACIONES/ERRORES' }}
            </p>
          }
        </section>
      }

      @if (activeTab() === 'formularios') {
        <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
          <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">CU-16 Formularios por tramite/departamento</h3>
          <form class="mt-4 grid gap-3" [formGroup]="formularioDeptoForm">
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Flujo</span>
                <select formControlName="flujoId" class="field-input">
                  <option value="">Selecciona...</option>
                  @for (flujo of flujos(); track flujo.id) {
                    <option [value]="flujo.id">{{ flujo.nombre }} (v{{ flujo.version }})</option>
                  }
                </select>
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Departamento</span>
                <select formControlName="departamentoId" class="field-input">
                  <option value="">Selecciona...</option>
                  @for (depto of departamentosActivos(); track depto.id) {
                    <option [value]="depto.id">{{ depto.nombre }}</option>
                  }
                </select>
              </label>
            </div>
            <label class="space-y-1 text-sm">
              <span class="font-medium text-violet-800 dark:text-violet-100">Nombre formulario</span>
              <input formControlName="nombreFormulario" class="field-input" />
            </label>
            <label class="space-y-1 text-sm">
              <span class="font-medium text-violet-800 dark:text-violet-100">Descripcion</span>
              <textarea formControlName="descripcion" rows="3" class="field-area"></textarea>
            </label>
            <label class="space-y-1 text-sm">
              <span class="font-medium text-violet-800 dark:text-violet-100">Campos (JSON array)</span>
              <textarea formControlName="camposJson" rows="14" class="field-area"></textarea>
            </label>
          </form>
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" (click)="cargarFormularioDepartamento()" [disabled]="loadingFormularios()" class="btn-secondary">
              Cargar formulario
            </button>
            <button type="button" (click)="guardarFormularioDepartamento()" [disabled]="loadingFormularios()" class="btn-primary">
              Guardar formulario
            </button>
          </div>
          @if (formularioResultado()) {
            <p class="mt-3 text-xs text-violet-700 dark:text-violet-300">
              Version interna: {{ formularioResultado()!.versionInterna ?? 'N/A' }} - Campos: {{ formularioResultado()!.campos.length }}
            </p>
          }
        </section>
      }

      @if (activeTab() === 'visualizacion') {
        <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
          <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">CU-17 Visualizar flujo</h3>
          <form class="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" [formGroup]="visualizacionForm">
            <label class="space-y-1 text-sm">
              <span class="font-medium text-violet-800 dark:text-violet-100">Flujo</span>
              <select formControlName="flujoId" class="field-input">
                <option value="">Selecciona...</option>
                @for (flujo of flujos(); track flujo.id) {
                  <option [value]="flujo.id">{{ flujo.nombre }} (v{{ flujo.version }})</option>
                }
              </select>
            </label>
            <button type="button" (click)="cargarVisualizacionFlujo()" [disabled]="loadingVisualizacion()" class="btn-secondary">
              Cargar visualizacion
            </button>
          </form>

          @if (visualizacionResultado()) {
            <div class="mt-4">
              <app-bpmn-canvas [xml]="bpmnViewerXml()" mode="viewer" [height]="520" (renderError)="globalError.set($event)" />
            </div>
            <div class="mt-4 rounded-xl border border-violet-300/50 bg-violet-100/40 p-3 text-xs text-violet-800 dark:border-violet-400/20 dark:bg-violet-800/20 dark:text-violet-200">
              <p class="m-0">Nodos: {{ visualizacionResultado()!.nodos.length }}</p>
              <p class="m-0">Transiciones: {{ visualizacionResultado()!.transiciones.length }}</p>
              <p class="m-0">Formularios por departamento: {{ visualizacionResultado()!.formulariosDepartamento.length }}</p>
              <p class="m-0">Reglas globales: {{ visualizacionResultado()!.reglasGlobales.length }}</p>
            </div>
            <label class="mt-3 block space-y-1 text-sm">
              <span class="font-medium text-violet-800 dark:text-violet-100">Salida JSON</span>
              <textarea [value]="visualizacionJson()" rows="18" readonly class="field-area"></textarea>
            </label>
          }
        </section>
      }

      @if (activeTab() === 'prompt') {
        <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
          <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">CU-19 Generar flujo desde prompt</h3>
          <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">
            Puedes escribir o dictar por voz. El audio se transcribe con IA y luego debes presionar Procesar.
            Si hay un flujo seleccionado, el prompt se aplica para editar ese diagrama.
          </p>
          @if (selectedFlujoId()) {
            <p class="m-0 mt-2 rounded-md border border-violet-300/60 bg-violet-100/60 px-3 py-2 text-xs font-semibold text-violet-800 dark:border-violet-400/30 dark:bg-violet-900/30 dark:text-violet-100">
              Modo actual: editar flujo seleccionado ({{ selectedFlujo()?.nombre || selectedFlujoId() }})
            </p>
          }
          <form class="mt-4 space-y-3" [formGroup]="promptForm" (ngSubmit)="generarDesdePrompt()">
            <label class="space-y-1 text-sm">
              <span class="font-medium text-violet-800 dark:text-violet-100">Tipo de tramite</span>
              <select formControlName="tipoTramiteId" class="field-input">
                <option value="">Selecciona...</option>
                @for (tipo of tiposTramiteActivos(); track tipo.id) {
                  <option [value]="tipo.id">{{ tipo.nombre }}</option>
                }
              </select>
            </label>
            <label class="space-y-1 text-sm">
              <span class="font-medium text-violet-800 dark:text-violet-100">Nombre del flujo</span>
              <input formControlName="nombre" class="field-input" />
            </label>
            <label class="space-y-1 text-sm">
              <span class="font-medium text-violet-800 dark:text-violet-100">Prompt</span>
              <textarea formControlName="prompt" rows="6" class="field-area"></textarea>
            </label>
            <div class="flex flex-wrap gap-2">
              <button type="button" (click)="iniciarDictadoPrompt()" [disabled]="dictandoPrompt() || transcribiendoPrompt()" class="btn-secondary">
                {{ dictandoPrompt() ? 'Grabando audio...' : 'Iniciar dictado' }}
              </button>
              <button type="button" (click)="detenerDictadoPrompt()" [disabled]="!dictandoPrompt() || transcribiendoPrompt()" class="btn-secondary">
                Detener y transcribir
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              <input #pdfPromptInput type="file" accept="application/pdf" class="hidden" (change)="onPdfPromptSelected($event)" />
              <button type="button" (click)="pdfPromptInput.click()" [disabled]="procesandoPdfPrompt() || loadingConstructores()" class="btn-secondary">
                Subir PDF
              </button>
              <button type="button" (click)="procesarPdfPrompt()" [disabled]="!archivoPdfPrompt() || procesandoPdfPrompt() || loadingConstructores() || transcribiendoPrompt() || dictandoPrompt()" class="btn-secondary">
                {{ procesandoPdfPrompt() ? 'Procesando PDF...' : 'Procesar PDF y abrir editor' }}
              </button>
            </div>
            @if (archivoPdfPrompt()) {
              <p class="m-0 rounded-lg border border-violet-300/60 bg-violet-100/60 px-3 py-2 text-xs font-semibold text-violet-800 dark:border-violet-400/30 dark:bg-violet-900/30 dark:text-violet-100">
                PDF seleccionado: {{ archivoPdfPrompt()!.name }}
              </p>
            }
            @if (transcribiendoPrompt()) {
              <p class="m-0 rounded-lg border border-violet-300/60 bg-violet-100/60 px-3 py-2 text-xs font-semibold text-violet-800 dark:border-violet-400/30 dark:bg-violet-900/30 dark:text-violet-100">
                Transcribiendo audio con IA...
              </p>
            }
            <button type="submit" [disabled]="loadingConstructores() || transcribiendoPrompt() || dictandoPrompt()" class="btn-primary">
              {{ loadingConstructores() ? 'Procesando...' : (selectedFlujoId() ? 'Procesar prompt sobre flujo seleccionado' : 'Generar flujo desde prompt') }}
            </button>
          </form>
          @if (constructorResultado()) {
            <label class="mt-3 block space-y-1 text-sm">
              <span class="font-medium text-violet-800 dark:text-violet-100">Resultado</span>
              <textarea [value]="constructorJson()" rows="8" readonly class="field-area"></textarea>
            </label>
          }
        </section>
      }

      @if (activeTab() === 'guiado') {
        <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
          <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">CU-20 Construir mediante formulario guiado</h3>
          <form class="mt-4 grid gap-3" [formGroup]="guiadoForm" (ngSubmit)="construirDesdeGuiado()">
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Tipo de tramite</span>
                <select formControlName="tipoTramiteId" class="field-input">
                  <option value="">Selecciona...</option>
                  @for (tipo of tiposTramiteActivos(); track tipo.id) {
                    <option [value]="tipo.id">{{ tipo.nombre }}</option>
                  }
                </select>
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Nombre</span>
                <input formControlName="nombre" class="field-input" />
              </label>
            </div>
            <label class="space-y-1 text-sm">
              <span class="font-medium text-violet-800 dark:text-violet-100">Descripcion</span>
              <textarea formControlName="descripcion" rows="3" class="field-area"></textarea>
            </label>
            <div class="grid gap-3 lg:grid-cols-3">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Nodos (JSON)</span>
                <textarea formControlName="nodosJson" rows="10" class="field-area"></textarea>
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Transiciones (JSON)</span>
                <textarea formControlName="transicionesJson" rows="10" class="field-area"></textarea>
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Reglas globales (JSON)</span>
                <textarea formControlName="reglasJson" rows="10" class="field-area"></textarea>
              </label>
            </div>
            <button type="submit" [disabled]="loadingConstructores()" class="btn-primary">
              {{ loadingConstructores() ? 'Procesando...' : 'Construir flujo guiado' }}
            </button>
          </form>
        </section>
      }

      @if (activeTab() === 'grafico') {
        <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
          <div class="mb-3">
            <button type="button" (click)="volverAFlujoBase()" class="rounded-lg border border-violet-300/70 px-3 py-2 text-xs font-semibold text-violet-800 dark:border-violet-400/30 dark:text-violet-100">
              Volver al panel de flujos
            </button>
          </div>
          <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">CU-13 / CU-15 Edicion de flujo</h3>
          <div class="mt-4 rounded-xl border border-violet-300/50 bg-violet-100/50 p-3 text-xs text-violet-800 dark:border-violet-500/20 dark:bg-violet-800/20 dark:text-violet-200">
            <p class="m-0"><strong>Tipo de tramite:</strong> {{ nombreTipoTramite(graficoForm.getRawValue().tipoTramiteId || '-') }}</p>
            <p class="m-0 mt-1"><strong>Nombre flujo:</strong> {{ graficoForm.getRawValue().nombre || '-' }}</p>
            <p class="m-0 mt-1"><strong>Descripcion:</strong> {{ graficoForm.getRawValue().descripcion || 'Sin descripcion' }}</p>
          </div>

          @if (editorGraficoListo()) {
            <div class="mt-3 flex flex-wrap gap-2">
              <button type="button" (click)="cargarVisualizacionFlujo()" class="rounded-lg border border-violet-300/70 px-3 py-2 text-xs font-semibold text-violet-800 dark:border-violet-400/30 dark:text-violet-100">
                Cargar diagrama del flujo seleccionado
              </button>
            </div>

            <div class="mt-3 grid gap-3 lg:grid-cols-[300px_1fr]">
              <aside class="space-y-3 rounded-xl border border-violet-300/50 bg-violet-100/40 p-3 dark:border-violet-500/20 dark:bg-violet-900/30">
              <button type="button" (click)="expandDepartamentosEditor.set(!expandDepartamentosEditor())" class="flex w-full items-center justify-between rounded-lg border border-violet-300/60 bg-white/80 px-3 py-2 text-left text-xs font-semibold text-violet-800 dark:border-violet-400/20 dark:bg-violet-800/20 dark:text-violet-100">
                <span>1) Departamentos y carriles</span>
                <span class="pi" [class.pi-chevron-up]="expandDepartamentosEditor()" [class.pi-chevron-down]="!expandDepartamentosEditor()"></span>
              </button>
              @if (expandDepartamentosEditor()) {
                <div class="space-y-2">
                  @for (dep of departamentosDisponiblesParaCarril(); track dep.id) {
                    <button
                      type="button"
                      draggable="true"
                      (dragstart)="onDragDepartmentStart($event, dep.id)"
                      (click)="agregarCarrilDesdeDepartamento(dep.id)"
                      class="w-full rounded-lg border border-violet-300/60 bg-white/80 px-3 py-2 text-left text-xs font-semibold text-violet-800 hover:bg-violet-50 dark:border-violet-400/20 dark:bg-violet-800/20 dark:text-violet-100"
                    >
                      {{ dep.nombre }}
                    </button>
                  } @empty {
                    <p class="m-0 rounded-md bg-white/70 px-2 py-2 text-xs text-violet-700 dark:bg-violet-800/35 dark:text-violet-200">
                      Todos los departamentos activos ya estan en el diagrama.
                    </p>
                  }
                  <button type="button" (click)="showCrearDepartamentoModal.set(true)" class="w-full rounded-lg border border-emerald-300/70 bg-emerald-500/10 px-3 py-2 text-left text-xs font-semibold text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-200">
                    + Crear departamento
                  </button>
                </div>
                <div class="mt-2 space-y-1">
                  @for (lane of graphLanes(); track lane.id) {
                    <div class="flex items-center justify-between gap-2 rounded-md bg-white/70 px-2 py-1 dark:bg-violet-800/35">
                      <p class="m-0 text-xs text-violet-800 dark:text-violet-100">{{ lane.nombre }}</p>
                      <button type="button" (click)="quitarCarril(lane.id)" class="rounded border border-rose-300/70 px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-400/40 dark:text-rose-200">
                        <span class="pi pi-trash"></span>
                      </button>
                    </div>
                  } @empty {
                    <p class="m-0 text-xs text-violet-700 dark:text-violet-300">Sin carriles aun.</p>
                  }
                </div>
              }

              <button type="button" (click)="expandSimbolosEditor.set(!expandSimbolosEditor())" class="flex w-full items-center justify-between rounded-lg border border-violet-300/60 bg-white/80 px-3 py-2 text-left text-xs font-semibold text-violet-800 dark:border-violet-400/20 dark:bg-violet-800/20 dark:text-violet-100">
                <span>2) Simbolos del flujo</span>
                <span class="pi" [class.pi-chevron-up]="expandSimbolosEditor()" [class.pi-chevron-down]="!expandSimbolosEditor()"></span>
              </button>
              @if (expandSimbolosEditor()) {
                <div class="grid gap-2 sm:grid-cols-2">
                  <button type="button" (click)="agregarNodoInicio()" class="rounded-lg border border-violet-300/60 bg-white/80 px-3 py-2 text-xs font-semibold text-violet-800">Inicio (o)</button>
                  <button type="button" (click)="agregarNodoFin()" class="rounded-lg border border-violet-300/60 bg-white/80 px-3 py-2 text-xs font-semibold text-violet-800">Fin (oo)</button>
                </div>
                <label class="mt-2 block space-y-1 text-xs">
                  <span class="font-semibold text-violet-700 dark:text-violet-300">Nombre para actividad/decision</span>
                  <input
                    [value]="nodoNombreSeleccionado()"
                    (input)="nodoNombreSeleccionado.set($any($event.target).value)"
                    class="field-input !h-10"
                    placeholder="Ej: Validar documentos"
                  />
                </label>
                <label class="mt-2 block space-y-1 text-xs">
                  <span class="font-semibold text-violet-700 dark:text-violet-300">Departamento para actividad/decision</span>
                  <select [value]="nodoDepartamentoSeleccionado()" (change)="nodoDepartamentoSeleccionado.set($any($event.target).value)" class="field-input !h-10">
                    <option value="">Selecciona...</option>
                    @for (lane of departamentosEnDiagrama(); track lane.id) {
                      <option [value]="lane.id">{{ lane.nombre }}</option>
                    }
                  </select>
                </label>
                <div class="grid gap-2 sm:grid-cols-2">
                  <button type="button" (click)="agregarNodoActividad()" class="rounded-lg border border-violet-300/60 bg-white/80 px-3 py-2 text-xs font-semibold text-violet-800">Actividad [ ]</button>
                  <button type="button" (click)="agregarNodoDecision()" class="rounded-lg border border-violet-300/60 bg-white/80 px-3 py-2 text-xs font-semibold text-violet-800">Decision (rombo)</button>
                </div>
              }

              <button type="button" (click)="expandPromptEditor.set(!expandPromptEditor())" class="flex w-full items-center justify-between rounded-lg border border-violet-300/60 bg-white/80 px-3 py-2 text-left text-xs font-semibold text-violet-800 dark:border-violet-400/20 dark:bg-violet-800/20 dark:text-violet-100">
                <span>3) Dictar prompt</span>
                <span class="pi" [class.pi-chevron-up]="expandPromptEditor()" [class.pi-chevron-down]="!expandPromptEditor()"></span>
              </button>
              @if (expandPromptEditor()) {
                <div class="space-y-2">
                  <p class="m-0 text-[11px] text-violet-700 dark:text-violet-300">
                    Escribe o dicta. Se transcribe con IA y luego presiona procesar para editar el diagrama actual.
                  </p>
                  <textarea
                    [formControl]="promptForm.controls.prompt"
                    rows="4"
                    class="field-area !text-xs"
                    placeholder="Ej: Agrega validacion legal antes de aprobar y envia rechazo a atencion al cliente."
                  ></textarea>
                  <div class="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      (click)="iniciarDictadoPrompt()"
                      [disabled]="dictandoPrompt() || transcribiendoPrompt()"
                      class="rounded-lg border border-violet-300/60 bg-white/80 px-3 py-2 text-xs font-semibold text-violet-800"
                    >
                      {{ dictandoPrompt() ? 'Grabando audio...' : 'Iniciar dictado' }}
                    </button>
                    <button
                      type="button"
                      (click)="detenerDictadoPrompt()"
                      [disabled]="!dictandoPrompt() || transcribiendoPrompt()"
                      class="rounded-lg border border-violet-300/60 bg-white/80 px-3 py-2 text-xs font-semibold text-violet-800"
                    >
                      Detener y transcribir
                    </button>
                  </div>
                  @if (transcribiendoPrompt()) {
                    <p class="m-0 rounded-md border border-violet-300/60 bg-violet-100/60 px-2 py-2 text-[11px] font-semibold text-violet-800 dark:border-violet-400/30 dark:bg-violet-900/30 dark:text-violet-100">
                      Transcribiendo audio con IA...
                    </p>
                  }
                  <button
                    type="button"
                    (click)="generarDesdePrompt()"
                    [disabled]="loadingConstructores() || transcribiendoPrompt() || dictandoPrompt()"
                    class="w-full rounded-lg border border-violet-500/70 bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500"
                  >
                    {{ loadingConstructores() ? 'Procesando...' : 'Procesar prompt en este flujo' }}
                  </button>
                </div>
              }
              </aside>

              <form class="space-y-3" (ngSubmit)="construirDesdeGrafico()">
                <div class="rounded-xl border border-violet-300/40 p-1" (dragover)="onCanvasDragOver($event)" (drop)="onCanvasDrop($event)">
                  <app-bpmn-canvas
                    [xml]="bpmnModelerXml()"
                    mode="modeler"
                    [height]="620"
                    (xmlChange)="onBpmnModelerChange($event)"
                    (renderError)="globalError.set($event)"
                    (elementClick)="onBpmnElementClick($event)"
                  />
                </div>
                <button type="button" (click)="construirDesdeGrafico()" [disabled]="loadingConstructores()" class="btn-primary">
                  {{ loadingConstructores() ? 'Procesando...' : 'Guardar construccion grafica' }}
                </button>
                @if (mensajeGuardadoGrafico()) {
                  <p class="m-0 rounded-lg border border-emerald-300/60 bg-emerald-100/70 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-900/25 dark:text-emerald-200">
                    {{ mensajeGuardadoGrafico() }}
                  </p>
                }
                @if (errorGuardadoGrafico()) {
                  <p class="m-0 rounded-lg border border-rose-300/60 bg-rose-100/70 px-3 py-2 text-xs font-semibold text-rose-800 dark:border-rose-400/30 dark:bg-rose-900/25 dark:text-rose-200">
                    {{ errorGuardadoGrafico() }}
                  </p>
                }
              </form>
            </div>
          } @else {
            <div class="mt-3 rounded-xl border border-amber-300/60 bg-amber-100/60 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/35 dark:bg-amber-900/20 dark:text-amber-200">
              Primero crea un flujo o selecciona uno del catalogo y elige "Editar en grafico".
            </div>
          }
        </section>
      }

      @if (showFormularioActividadModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/45 p-4">
          <section class="w-full max-w-2xl rounded-2xl border border-violet-300/60 bg-white p-5 dark:border-violet-500/20 dark:bg-violet-950">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Formulario por actividad</h3>
                <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">
                  Actividad: {{ formularioActividadNombreNodo() || '-' }} | Departamento: {{ formularioActividadDepartamentoNombre() || '-' }}
                </p>
              </div>
              <button type="button" (click)="cerrarFormularioActividadModal()" class="rounded border border-violet-300/70 px-2 py-1 text-xs font-semibold text-violet-700">
                Cerrar
              </button>
            </div>

            <div class="mt-4 grid gap-3">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Nombre de nodo</span>
                <input [value]="formularioActividadNombreNodo()" (input)="formularioActividadNombreNodo.set($any($event.target).value)" class="field-input" />
              </label>
            </div>

            <div
              class="mt-3 rounded-lg border px-3 py-2 text-xs"
              [class.border-amber-300/60]="persistenciaFormularioEstado() === 'pendiente'"
              [class.bg-amber-100/60]="persistenciaFormularioEstado() === 'pendiente'"
              [class.text-amber-800]="persistenciaFormularioEstado() === 'pendiente'"
              [class.border-emerald-300/60]="persistenciaFormularioEstado() === 'ok'"
              [class.bg-emerald-100/60]="persistenciaFormularioEstado() === 'ok'"
              [class.text-emerald-800]="persistenciaFormularioEstado() === 'ok'"
              [class.border-rose-300/60]="persistenciaFormularioEstado() === 'error'"
              [class.bg-rose-100/60]="persistenciaFormularioEstado() === 'error'"
              [class.text-rose-800]="persistenciaFormularioEstado() === 'error'"
            >
              <strong>{{ persistenciaFormularioTitulo() }}</strong>
              @if (persistenciaFormularioUltimaFecha()) {
                <span> | {{ persistenciaFormularioUltimaFecha() }}</span>
              }
              @if (persistenciaFormularioDetalle()) {
                <p class="m-0 mt-1">{{ persistenciaFormularioDetalle() }}</p>
              }
            </div>

            <div class="mt-3 rounded-lg border border-violet-300/60 bg-violet-50/70 p-3">
              <p class="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Editar formulario por prompt</p>
              <p class="m-0 mt-1 text-xs text-violet-700">
                Ejemplo: <code>agregar campo texto "Motivo" obligatorio</code>, <code>agregar campo foto "Foto frontal"</code>,
                <code>eliminar campo "Foto frontal"</code>, <code>renombrar campo "Motivo" a "Motivo principal"</code>.
              </p>
              <textarea
                class="field-area mt-2"
                rows="3"
                [value]="formularioActividadPrompt()"
                (input)="formularioActividadPrompt.set($any($event.target).value)"
                placeholder='Escribe instrucciones de edicion para este nodo...'
              ></textarea>
              <div class="mt-2 flex justify-end">
                <button
                  type="button"
                  (click)="aplicarPromptFormularioActividadModal()"
                  [disabled]="loadingFormularioActividadPrompt()"
                  class="rounded-lg border border-violet-300/70 px-3 py-2 text-xs font-semibold text-violet-800 disabled:opacity-60"
                >
                  {{ loadingFormularioActividadPrompt() ? 'Aplicando...' : 'Aplicar prompt' }}
                </button>
              </div>
            </div>

            @if (!formularioActividadEsNodoInicio()) {
              <div class="mt-4 rounded-xl border border-violet-300/50 bg-violet-100/40 p-3 text-xs text-violet-800 dark:border-violet-500/20 dark:bg-violet-900/30 dark:text-violet-200">
                <p class="m-0 font-semibold">Campos fijos obligatorios</p>
                <p class="m-0 mt-1">1. Marcar iniciado (se muestra como checkbox al ejecutivo)</p>
                <p class="m-0">2. Marcar finalizado (se muestra como checkbox al ejecutivo)</p>
              </div>
            } @else {
              <div class="mt-4 rounded-xl border border-violet-300/50 bg-violet-100/40 p-3 text-xs text-violet-800 dark:border-violet-500/20 dark:bg-violet-900/30 dark:text-violet-200">
                <p class="m-0 font-semibold">Formulario inicial de requisitos</p>
                <p class="m-0 mt-1">La informacion cargada aqui se conserva para consulta durante todo el flujo.</p>
              </div>
            }

            <div class="mt-4">
              <div class="flex flex-wrap gap-2">
                <button type="button" (click)="agregarCampoActividad('AREA_TEXTO')" class="rounded-lg border border-violet-300/70 px-3 py-1 text-xs font-semibold text-violet-800">+ Texto</button>
                <button type="button" (click)="agregarCampoActividad('IMAGEN')" class="rounded-lg border border-violet-300/70 px-3 py-1 text-xs font-semibold text-violet-800">+ Foto</button>
                <button type="button" (click)="agregarCampoActividad('ARCHIVO')" class="rounded-lg border border-violet-300/70 px-3 py-1 text-xs font-semibold text-violet-800">+ Documento</button>
              </div>
              <div class="mt-3 space-y-2">
                @for (campo of formularioActividadCamposDraft(); track campo.id; let i = $index) {
                  <article class="rounded-lg border border-violet-300/60 bg-white/85 p-3">
                    <div class="grid gap-2 sm:grid-cols-2">
                      <label class="space-y-1 text-xs">
                        <span class="font-semibold text-violet-700">Titulo solicitado</span>
                        <input [value]="campo.etiqueta" (input)="actualizarCampoActividad(i, { etiqueta: $any($event.target).value })" class="field-input !h-9" />
                      </label>
                      <label class="space-y-1 text-xs">
                        <span class="font-semibold text-violet-700">Formato de recepcion</span>
                        <select [value]="campo.tipo" (change)="actualizarCampoActividad(i, { tipo: $any($event.target).value })" class="field-input !h-9">
                          <option value="AREA_TEXTO">Texto</option>
                          <option value="IMAGEN">Foto</option>
                          <option value="ARCHIVO">Documento</option>
                        </select>
                      </label>
                    </div>
                    <label class="mt-2 flex items-center gap-2 text-xs text-violet-700">
                      <input type="checkbox" [checked]="campo.obligatorio" (change)="actualizarCampoActividad(i, { obligatorio: $any($event.target).checked })" />
                      Campo obligatorio
                    </label>
                    <div class="mt-2">
                      <input [value]="campo.ayuda" (input)="actualizarCampoActividad(i, { ayuda: $any($event.target).value })" class="field-input !h-9" placeholder="Ayuda breve (opcional)" />
                    </div>
                    <div class="mt-2 flex justify-end">
                      <button type="button" (click)="eliminarCampoActividad(i)" class="rounded border border-rose-300/70 px-2 py-1 text-[11px] font-semibold text-rose-700">Quitar</button>
                    </div>
                  </article>
                } @empty {
                  @if (!formularioActividadEsNodoInicio()) {
                    <p class="m-0 rounded-md border border-dashed border-violet-300/70 bg-violet-100/60 px-3 py-2 text-xs text-violet-700">
                      Sin campos dinamicos. El formulario guardara solo iniciado/finalizado.
                    </p>
                  } @else {
                    <p class="m-0 rounded-md border border-dashed border-violet-300/70 bg-violet-100/60 px-3 py-2 text-xs text-violet-700">
                      Sin campos definidos para el formulario inicial.
                    </p>
                  }
                }
              </div>
            </div>

            <div class="mt-4 flex gap-2">
              <button type="button" (click)="cerrarFormularioActividadModal()" class="btn-secondary">Cancelar</button>
              <button type="button" (click)="guardarFormularioActividadModal()" class="btn-primary">Guardar formulario de actividad</button>
            </div>
          </section>
        </div>
      }

      @if (showRenombrarTransicionModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/45 p-4">
          <section class="w-full max-w-xl rounded-2xl border border-violet-300/60 bg-white p-5 dark:border-violet-500/20 dark:bg-violet-950">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Renombrar transicion</h3>
                <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">
                  ID: {{ renombrarTransicionId() || '-' }}
                </p>
              </div>
              <button type="button" (click)="cancelarRenombrarTransicionModal()" class="rounded border border-violet-300/70 px-2 py-1 text-xs font-semibold text-violet-700">
                Cerrar
              </button>
            </div>
            <div class="mt-4">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Nombre de la transicion</span>
                <input
                  [value]="renombrarTransicionNombre()"
                  (input)="renombrarTransicionNombre.set($any($event.target).value)"
                  class="field-input"
                  placeholder="Texto"
                />
              </label>
            </div>
            <div class="mt-4 flex gap-2">
              <button type="button" (click)="cancelarRenombrarTransicionModal()" class="btn-secondary">Cancelar</button>
              <button type="button" (click)="confirmarRenombrarTransicionModal()" class="btn-primary">Guardar nombre</button>
            </div>
          </section>
        </div>
      }

      @if (showFormularioDecisionModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/45 p-4">
          <section class="w-full max-w-2xl rounded-2xl border border-violet-300/60 bg-white p-5 dark:border-violet-500/20 dark:bg-violet-950">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Formulario de decision - rombo</h3>
                <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">
                  ID: {{ formatearIdNodoVisible(formularioDecisionNodoId()) }}
                </p>
              </div>
              <button type="button" (click)="cerrarFormularioDecisionModal()" class="rounded border border-violet-300/70 px-2 py-1 text-xs font-semibold text-violet-700">
                Cerrar
              </button>
            </div>

            <div class="mt-4">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Nombre del rombo</span>
                <input
                  [value]="formularioDecisionNombreNodo()"
                  (input)="formularioDecisionNombreNodo.set($any($event.target).value)"
                  class="field-input"
                  placeholder="Decision"
                />
              </label>
            </div>

            <div class="mt-4 rounded-lg border border-violet-300/60 bg-violet-100/50 p-3 dark:border-violet-500/25 dark:bg-violet-900/40">
              <p class="m-0 text-sm font-semibold text-violet-800 dark:text-violet-100">Caminos salientes</p>
              <div class="mt-2 space-y-2">
                @for (camino of formularioDecisionCaminos(); track camino.idTransicion; let i = $index) {
                  <article class="rounded-md border border-violet-300/60 bg-white/85 p-2 text-xs text-violet-800 dark:border-violet-500/25 dark:bg-violet-950/60 dark:text-violet-200">
                    <p class="m-0"><strong>Camino {{ i + 1 }}:</strong> {{ camino.nombreCamino || 'Texto' }}</p>
                    <p class="m-0 mt-1">Destino: {{ camino.destinoNombre }} <span class="text-violet-500">- {{ formatearIdNodoVisible(camino.destinoId) }}</span></p>
                  </article>
                } @empty {
                  <p class="m-0 rounded-md border border-dashed border-violet-300/70 bg-violet-100/70 px-3 py-2 text-xs text-violet-700">
                    Este rombo no tiene caminos salientes.
                  </p>
                }
              </div>
            </div>

            <div class="mt-4 rounded-lg border border-violet-300/60 bg-violet-100/40 p-3 dark:border-violet-500/25 dark:bg-violet-900/35">
              <p class="m-0 text-sm font-semibold text-violet-800 dark:text-violet-100">Reglas automaticas por camino</p>
              <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">
                Cada campo del entregable puede configurarse como: Debe estar, No debe estar o No importa.
              </p>
              @if (formularioDecisionCamposEntregable().length === 0) {
                <p class="m-0 mt-2 rounded-md border border-dashed border-violet-300/70 bg-white/80 px-3 py-2 text-xs text-violet-700 dark:border-violet-500/30 dark:bg-violet-950/50 dark:text-violet-200">
                  No hay campos de entregable detectados en formularios de inicio/actividades.
                </p>
              } @else {
                <div class="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
                  @for (camino of formularioDecisionCaminos(); track camino.idTransicion; let i = $index) {
                    <section class="rounded-md border border-violet-300/60 bg-white/90 p-2 dark:border-violet-500/25 dark:bg-violet-950/60">
                      <p class="m-0 text-xs font-semibold text-violet-900 dark:text-violet-100">
                        Camino {{ i + 1 }}: {{ camino.nombreCamino || 'Texto' }}
                      </p>
                      <div class="mt-2 space-y-2">
                        @for (campo of formularioDecisionCamposEntregable(); track campo.claveCampo) {
                          <div class="grid gap-2 sm:grid-cols-[1.8fr_1fr]">
                            <div class="text-xs">
                              <p class="m-0 font-semibold text-violet-900 dark:text-violet-100">
                                {{ campo.etiqueta }}
                                @if (campo.obligatorio) {
                                  <span class="text-rose-600">*</span>
                                }
                              </p>
                              <p class="m-0 text-[11px] text-violet-700 dark:text-violet-300">
                                {{ campo.nodoNombre }} - {{ campo.tipoCampo }}
                              </p>
                            </div>
                            <select
                              class="field-input h-9 text-xs"
                              [disabled]="campo.obligatorio"
                              [value]="estadoCampoDecision(camino.idTransicion, campo.claveCampo)"
                              (change)="actualizarEstadoCampoDecision(camino.idTransicion, campo.claveCampo, $any($event.target).value)"
                            >
                              <option value="SI">Debe estar</option>
                              <option value="NO">No debe estar</option>
                              <option value="CUALQUIERA">No importa</option>
                            </select>
                          </div>
                        }
                      </div>
                    </section>
                  }
                </div>
              }
            </div>

            <div class="mt-4 flex gap-2">
              <button type="button" (click)="cerrarFormularioDecisionModal()" class="btn-secondary">Cancelar</button>
              <button type="button" (click)="guardarFormularioDecisionModal()" class="btn-primary">Guardar reglas del rombo</button>
            </div>
          </section>
        </div>
      }

      @if (showFormularioFinModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/45 p-4">
          <section class="w-full max-w-2xl rounded-2xl border border-violet-300/60 bg-white p-5 dark:border-violet-500/20 dark:bg-violet-950">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Vista de cierre - fin</h3>
                <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">
                  ID: {{ formatearIdNodoVisible(formularioFinNodoId()) }}
                </p>
              </div>
              <button type="button" (click)="cerrarFormularioFinModal()" class="rounded border border-violet-300/70 px-2 py-1 text-xs font-semibold text-violet-700">
                Cerrar
              </button>
            </div>

            <div class="mt-4">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Nombre del fin</span>
                <input [value]="formularioFinNombreNodo()" class="field-input" readonly />
              </label>
            </div>

            <div class="mt-4 rounded-lg border border-violet-300/60 bg-violet-100/50 p-3 dark:border-violet-500/25 dark:bg-violet-900/40">
              <p class="m-0 text-sm font-semibold text-violet-800 dark:text-violet-100">Caminos de llegada</p>
              <div class="mt-2 space-y-2">
                @for (camino of formularioFinCaminos(); track camino.idTransicion; let i = $index) {
                  <article class="rounded-md border border-violet-300/60 bg-white/85 p-2 text-xs text-violet-800 dark:border-violet-500/25 dark:bg-violet-950/60 dark:text-violet-200">
                    <p class="m-0"><strong>Camino {{ i + 1 }}:</strong> {{ camino.nombreCamino || 'Texto' }}</p>
                    <p class="m-0 mt-1">Origen: {{ camino.origenNombre }} <span class="text-violet-500">- {{ formatearIdNodoVisible(camino.origenId) }}</span></p>
                  </article>
                } @empty {
                  <p class="m-0 rounded-md border border-dashed border-violet-300/70 bg-violet-100/70 px-3 py-2 text-xs text-violet-700">
                    Este nodo fin no tiene caminos de llegada.
                  </p>
                }
              </div>
            </div>

            <div class="mt-4 rounded-lg border border-violet-300/60 bg-violet-100/40 p-3 dark:border-violet-500/25 dark:bg-violet-900/35">
              <p class="m-0 text-sm font-semibold text-violet-800 dark:text-violet-100">Entregable esperado por camino</p>
              <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">
                Vista fija de los campos que puede traer cada ruta hasta este fin.
              </p>
              <div class="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
                @for (camino of formularioFinCaminos(); track camino.idTransicion; let i = $index) {
                  <section class="rounded-md border border-violet-300/60 bg-white/90 p-2 dark:border-violet-500/25 dark:bg-violet-950/60">
                    <p class="m-0 text-xs font-semibold text-violet-900 dark:text-violet-100">
                      Camino {{ i + 1 }}: {{ camino.nombreCamino || 'Texto' }}
                    </p>
                    @if (camino.camposEntregable.length === 0) {
                      <p class="m-0 mt-2 text-xs text-violet-700 dark:text-violet-300">Sin campos previos detectados.</p>
                    } @else {
                      <div class="mt-2 space-y-2">
                        @for (campo of camino.camposEntregable; track campo.claveCampo) {
                          <div class="rounded-md border border-violet-200/70 bg-violet-50/70 px-2 py-1 text-xs dark:border-violet-500/25 dark:bg-violet-900/25">
                            <p class="m-0 font-semibold text-violet-900 dark:text-violet-100">
                              {{ campo.etiqueta }}
                              @if (campo.obligatorio) {
                                <span class="text-rose-600">*</span>
                              }
                            </p>
                            <p class="m-0 text-[11px] text-violet-700 dark:text-violet-300">
                              {{ campo.nodoNombre }} - {{ campo.tipoCampo }}
                            </p>
                          </div>
                        }
                      </div>
                    }
                  </section>
                }
              </div>
            </div>

            <div class="mt-4 flex gap-2">
              <button type="button" (click)="cerrarFormularioFinModal()" class="btn-primary">Cerrar</button>
            </div>
          </section>
        </div>
      }

      @if (showCrearFlujoModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/45 p-4">
          <section class="w-full max-w-xl rounded-2xl border border-violet-300/60 bg-white p-5 dark:border-violet-500/20 dark:bg-violet-950">
            <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Crear flujo</h3>
            <form class="mt-4 space-y-3" [formGroup]="crearFlujoModalForm" (ngSubmit)="confirmarCrearFlujoModal()">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Tipo de tramite</span>
                <select formControlName="tipoTramiteId" class="field-input">
                  <option value="">Selecciona...</option>
                  @for (tipo of tiposTramiteActivos(); track tipo.id) {
                    <option [value]="tipo.id">{{ tipo.nombre }}</option>
                  }
                </select>
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Nombre</span>
                <input formControlName="nombre" class="field-input" />
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Descripcion</span>
                <textarea formControlName="descripcion" rows="3" class="field-area"></textarea>
              </label>
              <div class="flex gap-2">
                <button type="button" (click)="showCrearFlujoModal.set(false)" class="btn-secondary">Cancelar</button>
                <button type="submit" class="btn-primary">Ir al editor grafico</button>
              </div>
            </form>
          </section>
        </div>
      }

      @if (showCrearDepartamentoModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/45 p-4">
          <section class="w-full max-w-xl rounded-2xl border border-violet-300/60 bg-white p-5 dark:border-violet-500/20 dark:bg-violet-950">
            <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Crear departamento</h3>
            <form class="mt-4 space-y-3" [formGroup]="crearDepartamentoRapidoForm" (ngSubmit)="crearDepartamentoRapido()">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Nombre</span>
                <input formControlName="nombre" class="field-input" />
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Codigo</span>
                <input formControlName="codigo" class="field-input" />
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Descripcion</span>
                <textarea formControlName="descripcion" rows="3" class="field-area"></textarea>
              </label>
              <div class="flex gap-2">
                <button type="button" (click)="showCrearDepartamentoModal.set(false)" class="btn-secondary">Cancelar</button>
                <button type="submit" class="btn-primary">Crear y agregar al diagrama</button>
              </div>
            </form>
          </section>
        </div>
      }

      @if (showClonarFlujoModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/45 p-4">
          <section class="w-full max-w-xl rounded-2xl border border-violet-300/60 bg-white p-5 dark:border-violet-500/20 dark:bg-violet-950">
            <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Clonar flujo</h3>
            <p class="m-0 mt-1 text-xs text-violet-700 dark:text-violet-300">
              Se clonara nombre, diagrama, nodos, transiciones, formularios y configuracion del flujo seleccionado.
            </p>
            <form class="mt-4 space-y-3" [formGroup]="clonarFlujoForm" (ngSubmit)="confirmarClonarFlujoModal()">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Nombre del nuevo flujo</span>
                <input formControlName="nombre" class="field-input" />
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Descripcion (opcional)</span>
                <textarea formControlName="descripcion" rows="3" class="field-area"></textarea>
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Observaciones (opcional)</span>
                <input formControlName="observaciones" class="field-input" />
              </label>
              <div class="flex gap-2">
                <button type="button" (click)="cerrarModalClonarFlujo()" class="btn-secondary">Cancelar</button>
                <button type="submit" [disabled]="loadingGestion()" class="btn-primary">
                  {{ loadingGestion() ? 'Clonando...' : 'Confirmar clonacion' }}
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
export class DisenoFlujosPageComponent implements OnInit {
  private static readonly BPMN_CACHE_PREFIX = 'diseno_flujo_bpmn_';
  readonly tabs: { id: DisenoTab; label: string }[] = [
    { id: 'gestion', label: 'Gestion base' },
    { id: 'configuracion', label: 'Configurar flujo' },
    { id: 'formularios', label: 'Formularios' },
    { id: 'visualizacion', label: 'Visualizacion' },
    { id: 'prompt', label: 'Generar por prompt' },
    { id: 'guiado', label: 'Formulario guiado' },
    { id: 'grafico', label: 'Editor grafico' },
  ];
  readonly estadosFlujoPermitidos: EstadoFlujo[] = ['BORRADOR', 'CONFIGURACION', 'PUBLICADO', 'DESACTIVADO'];

  readonly activeTab = signal<DisenoTab>('gestion');
  readonly loadingBase = signal(false);
  readonly loadingGestion = signal(false);
  readonly loadingConfiguracion = signal(false);
  readonly loadingFormularios = signal(false);
  readonly loadingVisualizacion = signal(false);
  readonly loadingConstructores = signal(false);

  readonly globalError = signal('');
  readonly globalMessage = signal('');

  readonly tiposTramite = signal<TipoTramiteResumenResponse[]>([]);
  readonly flujos = signal<FlujoTramiteResumenResponse[]>([]);
  readonly departamentos = signal<DepartamentoDisenoResponse[]>([]);

  readonly selectedFlujoId = signal<string | null>(null);
  readonly selectedFlujo = signal<FlujoTramiteResponse | null>(null);
  readonly configuracionResultado = signal<ConfiguracionFlujoResponse | null>(null);
  readonly formularioResultado = signal<FormularioDepartamentoResponse | null>(null);
  readonly visualizacionResultado = signal<FlujoVisualizacionResponse | null>(null);
  readonly constructorResultado = signal<ResultadoConstruccionFlujoResponse | null>(null);
  readonly bpmnViewerXml = signal('');
  readonly bpmnModelerXml = signal('');
  readonly dictandoPrompt = signal(false);
  readonly transcribiendoPrompt = signal(false);
  readonly procesandoPdfPrompt = signal(false);
  readonly archivoPdfPrompt = signal<File | null>(null);
  readonly mensajeGuardadoGrafico = signal('');
  readonly errorGuardadoGrafico = signal('');
  readonly graphLaneDepartmentIds = signal<string[]>([]);
  readonly draggingDepartmentId = signal<string | null>(null);
  readonly showCrearFlujoModal = signal(false);
  readonly showCrearDepartamentoModal = signal(false);
  readonly showClonarFlujoModal = signal(false);
  readonly expandDepartamentosEditor = signal(true);
  readonly expandSimbolosEditor = signal(true);
  readonly expandPromptEditor = signal(false);
  readonly nodoDepartamentoSeleccionado = signal('');
  readonly nodoNombreSeleccionado = signal('');
  readonly formulariosActividadPorNodo = signal<Record<string, FormularioActividad>>({});
  readonly showFormularioActividadModal = signal(false);
  readonly showRenombrarTransicionModal = signal(false);
  readonly renombrarTransicionId = signal('');
  readonly renombrarTransicionNombre = signal('Texto');
  readonly showFormularioDecisionModal = signal(false);
  readonly formularioDecisionNodoId = signal('');
  readonly formularioDecisionNombreNodo = signal('');
  readonly formularioDecisionCaminos = signal<CaminoDecisionModal[]>([]);
  readonly formularioDecisionCamposEntregable = signal<CampoEntregableDecision[]>([]);
  readonly formularioDecisionEstadosPorCamino = signal<Record<string, Record<string, EstadoCondicionDecision>>>({});
  readonly condicionesDecisionPorTransicion = signal<Record<string, Record<string, EstadoCondicionDecision>>>({});
  readonly showFormularioFinModal = signal(false);
  readonly formularioFinNodoId = signal('');
  readonly formularioFinNombreNodo = signal('');
  readonly formularioFinCaminos = signal<CaminoFinModal[]>([]);
  readonly formularioActividadNodoId = signal('');
  readonly formularioActividadDepartamentoId = signal('');
  readonly formularioActividadNombreNodo = signal('');
  readonly formularioActividadEsNodoInicio = signal(false);
  readonly formularioActividadCamposDraft = signal<CampoActividadDraft[]>([]);
  readonly formularioActividadPrompt = signal('');
  readonly loadingFormularioActividadPrompt = signal(false);
  readonly persistenciaFormularioEstado = signal<'pendiente' | 'ok' | 'error'>('pendiente');
  readonly persistenciaFormularioDetalle = signal('');
  readonly persistenciaFormularioUltimaFecha = signal('');
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];

  readonly tiposTramiteActivos = computed(() => this.tiposTramite().filter((t) => t.estadoTipoTramite === 'ACTIVO'));
  readonly departamentosActivos = computed(() => this.departamentos().filter((d) => d.estadoDepartamento === 'ACTIVO'));
  readonly departamentosDisponiblesParaCarril = computed(() => {
    const usados = new Set(this.graphLaneDepartmentIds());
    return this.departamentosActivos().filter((dep) => !usados.has(dep.id));
  });
  readonly graphLanes = computed(() =>
    this.graphLaneDepartmentIds().map((id) => {
      const dep = this.departamentos().find((d) => d.id === id);
      return { id, nombre: dep?.nombre ?? id };
    }),
  );
  readonly departamentosEnDiagrama = computed(() => this.graphLanes());
  readonly formularioActividadDepartamentoNombre = computed(() => {
    const depId = this.formularioActividadDepartamentoId();
    if (!depId) {
      return '';
    }
    const dep = this.departamentos().find((item) => item.id === depId);
    return dep?.nombre ?? depId;
  });
  readonly persistenciaFormularioTitulo = computed(() => {
    const estado = this.persistenciaFormularioEstado();
    if (estado === 'ok') {
      return 'Persistido en backend';
    }
    if (estado === 'error') {
      return 'Error de persistencia';
    }
    return 'Pendiente de persistir';
  });
  readonly visualizacionJson = computed(() => this.visualizacionResultado() ? this.pretty(this.visualizacionResultado()) : '');
  readonly constructorJson = computed(() => this.constructorResultado() ? this.pretty(this.constructorResultado()) : '');

  readonly crearFlujoForm = this.fb.nonNullable.group({
    tipoTramiteId: [''],
    tipoTramiteNombre: ['', [Validators.required]],
    nombre: ['', [Validators.required]],
    descripcion: [''],
    version: [1, [Validators.required, Validators.min(1)]],
    observaciones: [''],
  });

  readonly editarFlujoForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    observaciones: [''],
  });

  readonly clonarFlujoForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    observaciones: [''],
  });

  readonly estadoFlujoForm = this.fb.nonNullable.group({
    estadoFlujo: ['BORRADOR' as EstadoFlujo, [Validators.required]],
  });

  readonly configuracionForm = this.fb.nonNullable.group({
    flujoId: [''],
    nodosJson: ['[]', [Validators.required]],
    transicionesJson: ['[]', [Validators.required]],
    reglasJson: ['[]', [Validators.required]],
  });

  readonly formularioDeptoForm = this.fb.nonNullable.group({
    flujoId: [''],
    departamentoId: [''],
    nombreFormulario: ['Formulario departamento', [Validators.required]],
    descripcion: [''],
    camposJson: ['[]', [Validators.required]],
  });

  readonly visualizacionForm = this.fb.nonNullable.group({
    flujoId: [''],
  });

  readonly promptForm = this.fb.nonNullable.group({
    tipoTramiteId: ['', [Validators.required]],
    nombre: ['', [Validators.required]],
    prompt: ['', [Validators.required, Validators.minLength(20)]],
  });

  readonly guiadoForm = this.fb.nonNullable.group({
    tipoTramiteId: ['', [Validators.required]],
    nombre: ['', [Validators.required]],
    descripcion: [''],
    nodosJson: ['[]', [Validators.required]],
    transicionesJson: ['[]', [Validators.required]],
    reglasJson: ['[]', [Validators.required]],
  });

  readonly graficoForm = this.fb.nonNullable.group({
    tipoTramiteId: ['', [Validators.required]],
    nombre: ['', [Validators.required]],
    descripcion: [''],
  });

  readonly crearFlujoModalForm = this.fb.nonNullable.group({
    tipoTramiteId: ['', [Validators.required]],
    nombre: ['', [Validators.required]],
    descripcion: [''],
  });

  readonly crearDepartamentoRapidoForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    codigo: ['', [Validators.required]],
    descripcion: [''],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly flujosDisenoService: FlujosDisenoService,
    private readonly departamentosAdminService: DepartamentosAdminService,
    private readonly auditoriaUiService: AuditoriaUiService,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUsuarioSesion();
    if (!user || user.rol !== 'ADMINISTRADOR') {
      this.router.navigateByUrl('/dashboard');
      return;
    }
    this.cargarBase();
  }

  cargarBase(): void {
    this.loadingBase.set(true);
    this.globalError.set('');
    Promise.all([this.cargarTiposTramite(), this.cargarFlujos(), this.cargarDepartamentos()])
      .catch(() => undefined)
      .finally(() => this.loadingBase.set(false));
  }

  nuevoFlujoDesdePanel(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    this.selectedFlujoId.set(null);
    this.selectedFlujo.set(null);
    this.crearFlujoForm.reset({
      tipoTramiteId: '',
      tipoTramiteNombre: '',
      nombre: '',
      descripcion: '',
      version: 1,
      observaciones: '',
    });
    this.graficoForm.reset({
      tipoTramiteId: '',
      nombre: '',
      descripcion: '',
    });
    this.bpmnModelerXml.set('');
    this.graphLaneDepartmentIds.set([]);
    this.formulariosActividadPorNodo.set({});
    this.limpiarFormularioActividadContext();
    this.activeTab.set('gestion');
  }

  async guardarFlujoDesdePanel(): Promise<void> {
    this.globalError.set('');
    this.globalMessage.set('');
    if (this.crearFlujoForm.invalid) {
      this.crearFlujoForm.markAllAsTouched();
      this.globalError.set('Completa tipo de tramite y nombre.');
      return;
    }

    const raw = this.crearFlujoForm.getRawValue();
    const flujoId = this.selectedFlujoId();
    this.loadingGestion.set(true);

    if (flujoId) {
      const tipoTramiteId = await this.resolverTipoTramiteIdPorNombre(raw.tipoTramiteNombre);
      if (!tipoTramiteId) {
        this.globalError.set('No se pudo resolver el tipo de tramite.');
        this.loadingGestion.set(false);
        return;
      }
      this.crearFlujoForm.patchValue({ tipoTramiteId });
      this.flujosDisenoService
        .actualizarFlujo(flujoId, {
          tipoTramiteId,
          nombre: raw.nombre,
          descripcion: raw.descripcion,
          observaciones: raw.observaciones,
        })
        .subscribe({
          next: (flujo) => {
            this.globalMessage.set('Flujo actualizado correctamente.');
            this.cargarFlujos();
            this.seleccionarFlujo(flujo.id);
            this.loadingGestion.set(false);
          },
          error: (error: unknown) => {
            this.globalError.set(this.extraerMensajeError(error, 'No se pudo actualizar el flujo.'));
            this.loadingGestion.set(false);
          },
        });
      return;
    }

    const tipoTramiteId = await this.resolverTipoTramiteIdPorNombre(raw.tipoTramiteNombre);
    if (!tipoTramiteId) {
      this.globalError.set('No se pudo resolver el tipo de tramite.');
      this.loadingGestion.set(false);
      return;
    }
    this.crearFlujoForm.patchValue({ tipoTramiteId });

    this.flujosDisenoService
      .crearFlujo({
        tipoTramiteId,
        nombre: raw.nombre,
        descripcion: raw.descripcion,
        version: raw.version,
        observaciones: raw.observaciones,
      })
      .subscribe({
      next: (flujo) => {
        this.globalMessage.set('Flujo creado correctamente.');
        this.cargarFlujos();
        this.seleccionarFlujo(flujo.id);
        this.loadingGestion.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo crear el flujo.'));
        this.loadingGestion.set(false);
      },
      });
  }

  irAlEditorDesdePanel(): void {
    const flujoId = this.selectedFlujoId();
    if (flujoId) {
      this.abrirFlujoDesdeListado(flujoId);
      return;
    }
    this.irAlEditorGraficoConNuevoFlujo();
  }

  abrirModalCrearFlujo(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    this.crearFlujoModalForm.reset({ tipoTramiteId: '', nombre: '', descripcion: '' });
    this.showCrearFlujoModal.set(true);
  }

  confirmarCrearFlujoModal(): void {
    this.globalError.set('');
    if (this.crearFlujoModalForm.invalid) {
      this.crearFlujoModalForm.markAllAsTouched();
      this.globalError.set('Completa tipo de tramite y nombre para iniciar el flujo.');
      return;
    }
    const raw = this.crearFlujoModalForm.getRawValue();
    this.graficoForm.patchValue({
      tipoTramiteId: raw.tipoTramiteId,
      nombre: raw.nombre,
      descripcion: raw.descripcion,
    });
    this.selectedFlujoId.set(null);
    this.selectedFlujo.set(null);
    this.bpmnModelerXml.set('');
    this.graphLaneDepartmentIds.set([]);
    this.nodoDepartamentoSeleccionado.set('');
    this.nodoNombreSeleccionado.set('');
    this.showCrearFlujoModal.set(false);
    this.activarTab('grafico');
    this.generarPlantillaGrafica();
    this.globalMessage.set('Flujo iniciado. Agrega departamentos y simbolos para construir el diagrama.');
  }

  abrirFlujoDesdeListado(flujoId: string): void {
    this.seleccionarFlujo(flujoId);
    this.activarTab('grafico');
  }

  seleccionarFlujoDesdeListado(flujoId: string): void {
    this.seleccionarFlujo(flujoId);
    this.globalMessage.set('Flujo seleccionado. Puedes editarlo cuando desees en el editor grafico.');
  }

  async irAlEditorGraficoConNuevoFlujo(): Promise<void> {
    this.globalError.set('');
    this.globalMessage.set('');
    if (this.crearFlujoForm.invalid) {
      this.crearFlujoForm.markAllAsTouched();
      this.globalError.set('Completa tipo de tramite y nombre para iniciar en el editor grafico.');
      return;
    }
    const raw = this.crearFlujoForm.getRawValue();
    const tipoTramiteId = await this.resolverTipoTramiteIdPorNombre(raw.tipoTramiteNombre);
    if (!tipoTramiteId) {
      this.globalError.set('No se pudo resolver el tipo de tramite.');
      return;
    }
    this.crearFlujoForm.patchValue({ tipoTramiteId });
    this.graficoForm.patchValue({
      tipoTramiteId,
      nombre: raw.nombre,
      descripcion: raw.descripcion,
    });
    this.selectedFlujoId.set(null);
    this.selectedFlujo.set(null);
    this.bpmnModelerXml.set('');
    this.graphLaneDepartmentIds.set([]);
    this.nodoDepartamentoSeleccionado.set('');
    this.nodoNombreSeleccionado.set('');
    this.activarTab('grafico');
    this.generarPlantillaGrafica();
    this.globalMessage.set('Flujo preparado con tus datos. Continua en el editor grafico.');
  }

  irAlEditorGraficoEditarSeleccionado(): void {
    const flujoId = this.selectedFlujoId();
    if (!flujoId) {
      this.globalError.set('Selecciona un flujo del catalogo para editar.');
      return;
    }
    this.abrirFlujoDesdeListado(flujoId);
  }

  seleccionarFlujo(flujoId: string): void {
    this.globalError.set('');
    this.globalMessage.set('');
    this.limpiarFormularioActividadContext();
    this.condicionesDecisionPorTransicion.set({});
    this.selectedFlujoId.set(flujoId);
    this.flujosDisenoService.obtenerFlujo(flujoId).subscribe({
      next: (flujo) => {
        this.selectedFlujo.set(flujo);
        this.editarFlujoForm.patchValue({
          nombre: flujo.nombre,
          descripcion: flujo.descripcion ?? '',
          observaciones: '',
        });
        this.clonarFlujoForm.patchValue({
          nombre: `${flujo.nombre} - copia`,
          descripcion: flujo.descripcion ?? '',
          observaciones: '',
        });
        this.estadoFlujoForm.patchValue({
          estadoFlujo: flujo.estadoFlujo,
        });
        this.configuracionForm.patchValue({ flujoId: flujo.id });
        this.formularioDeptoForm.patchValue({ flujoId: flujo.id });
        this.visualizacionForm.patchValue({ flujoId: flujo.id });
        this.graficoForm.patchValue({
          tipoTramiteId: flujo.tipoTramiteId,
          nombre: flujo.nombre,
          descripcion: flujo.descripcion ?? '',
        });
        this.crearFlujoForm.patchValue({
          tipoTramiteId: flujo.tipoTramiteId,
          tipoTramiteNombre: this.nombreTipoTramite(flujo.tipoTramiteId),
          nombre: flujo.nombre,
          descripcion: flujo.descripcion ?? '',
          observaciones: '',
          version: flujo.version,
        });
        this.cargarBpmnFlujoInterno(flujo.id, flujo.nombre);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo cargar el flujo seleccionado.'));
      },
    });
  }

  crearFlujo(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    if (this.crearFlujoForm.invalid) {
      this.crearFlujoForm.markAllAsTouched();
      this.globalError.set('Completa los datos requeridos para crear el flujo.');
      return;
    }
    this.loadingGestion.set(true);
    this.flujosDisenoService.crearFlujo(this.crearFlujoForm.getRawValue()).subscribe({
      next: (flujo) => {
        this.globalMessage.set('Flujo creado correctamente.');
        this.cargarFlujos();
        this.seleccionarFlujo(flujo.id);
        this.loadingGestion.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo crear el flujo.'));
        this.loadingGestion.set(false);
      },
    });
  }

  editarFlujo(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const flujoId = this.selectedFlujoId();
    if (!flujoId) {
      this.globalError.set('Selecciona un flujo para editar.');
      return;
    }
    if (this.editarFlujoForm.invalid) {
      this.editarFlujoForm.markAllAsTouched();
      this.globalError.set('Completa los campos de edicion.');
      return;
    }
    this.loadingGestion.set(true);
    this.flujosDisenoService.actualizarFlujo(flujoId, this.editarFlujoForm.getRawValue()).subscribe({
      next: (flujo) => {
        this.globalMessage.set('Flujo actualizado correctamente.');
        this.cargarFlujos();
        this.seleccionarFlujo(flujo.id);
        this.loadingGestion.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo actualizar el flujo.'));
        this.loadingGestion.set(false);
      },
    });
  }

  clonarFlujo(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const flujoId = this.selectedFlujoId();
    if (!flujoId) {
      this.globalError.set('Selecciona un flujo para clonar.');
      return;
    }
    if (this.clonarFlujoForm.invalid) {
      this.clonarFlujoForm.markAllAsTouched();
      this.globalError.set('Completa el nombre para clonar.');
      return;
    }
    const nombreClon = this.clonarFlujoForm.getRawValue().nombre.trim();
    const nombreOriginal = this.selectedFlujo()?.nombre?.trim() ?? '';
    if (nombreOriginal && nombreClon.toLowerCase() === nombreOriginal.toLowerCase()) {
      this.globalError.set('El nombre del clon debe ser diferente al flujo original.');
      return;
    }
    this.loadingGestion.set(true);
    this.flujosDisenoService.clonarFlujo(flujoId, this.clonarFlujoForm.getRawValue()).subscribe({
      next: (response) => {
        this.globalMessage.set(`Flujo clonado correctamente. Nueva version: ${response.versionNueva}.`);
        this.cargarFlujos();
        this.seleccionarFlujo(response.flujoNuevoId);
        this.showClonarFlujoModal.set(false);
        this.loadingGestion.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo clonar el flujo.'));
        this.loadingGestion.set(false);
      },
    });
  }

  abrirModalClonarFlujo(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const flujo = this.selectedFlujo();
    if (!flujo) {
      this.globalError.set('Selecciona un flujo para clonar.');
      return;
    }
    this.clonarFlujoForm.patchValue({
      nombre: `${flujo.nombre} - copia`,
      descripcion: flujo.descripcion ?? '',
      observaciones: '',
    });
    this.showClonarFlujoModal.set(true);
  }

  cerrarModalClonarFlujo(): void {
    this.showClonarFlujoModal.set(false);
  }

  confirmarClonarFlujoModal(): void {
    this.clonarFlujo();
  }

  cambiarEstadoFlujo(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const flujoId = this.selectedFlujoId();
    if (!flujoId) {
      this.globalError.set('Selecciona un flujo para cambiar estado.');
      return;
    }
    const estado = this.estadoFlujoForm.getRawValue().estadoFlujo;
    if (!confirm(`Confirmar cambio de estado a ${estado}?`)) {
      return;
    }
    this.loadingGestion.set(true);
    this.flujosDisenoService.cambiarEstadoFlujo(flujoId, { estadoFlujo: estado }).subscribe({
      next: (response) => {
        this.globalMessage.set(response.mensaje);
        this.cargarFlujos();
        this.seleccionarFlujo(flujoId);
        this.loadingGestion.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo cambiar el estado del flujo.'));
        this.loadingGestion.set(false);
      },
    });
  }

  cargarConfiguracionFlujo(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const flujoId = this.configuracionForm.getRawValue().flujoId || this.selectedFlujoId();
    if (!flujoId) {
      this.globalError.set('Selecciona un flujo para cargar configuracion.');
      return;
    }
    this.loadingConfiguracion.set(true);
    this.flujosDisenoService.obtenerConfiguracion(flujoId).subscribe({
      next: (response) => {
        this.configuracionResultado.set(response);
        this.configuracionForm.patchValue({
          flujoId,
          nodosJson: this.pretty(response.nodos),
          transicionesJson: this.pretty(response.transiciones),
          reglasJson: this.pretty(response.reglasGlobales),
        });
        this.loadingConfiguracion.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo cargar la configuracion del flujo.'));
        this.loadingConfiguracion.set(false);
      },
    });
  }

  guardarConfiguracionFlujo(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const raw = this.configuracionForm.getRawValue();
    const flujoId = raw.flujoId || this.selectedFlujoId();
    if (!flujoId) {
      this.globalError.set('Selecciona un flujo para guardar configuracion.');
      return;
    }

    const parsed = this.parseConfiguracion(raw.nodosJson, raw.transicionesJson, raw.reglasJson);
    if (!parsed) {
      return;
    }

    this.loadingConfiguracion.set(true);
    this.flujosDisenoService
      .guardarConfiguracion(flujoId, {
        nodos: parsed.nodos,
        transiciones: parsed.transiciones,
        reglasGlobales: parsed.reglas,
        bpmnXml: this.bpmnModelerXml() || undefined,
      })
      .subscribe({
        next: (response) => {
          this.configuracionResultado.set(response);
          this.globalMessage.set('Configuracion guardada correctamente.');
          this.loadingConfiguracion.set(false);
          this.cargarFlujos();
          this.seleccionarFlujo(flujoId);
        },
        error: (error: unknown) => {
          this.globalError.set(this.extraerMensajeError(error, 'No se pudo guardar la configuracion.'));
          this.loadingConfiguracion.set(false);
        },
      });
  }

  cargarFormularioDepartamento(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const raw = this.formularioDeptoForm.getRawValue();
    const flujoId = raw.flujoId || this.selectedFlujoId();
    if (!flujoId || !raw.departamentoId) {
      this.globalError.set('Selecciona flujo y departamento.');
      return;
    }
    this.loadingFormularios.set(true);
    this.flujosDisenoService.obtenerFormulario(flujoId, raw.departamentoId).subscribe({
      next: (response) => {
        this.formularioResultado.set(response);
        this.formularioDeptoForm.patchValue({
          flujoId,
          departamentoId: response.departamentoId,
          nombreFormulario: response.nombreFormulario,
          descripcion: response.descripcion ?? '',
          camposJson: this.pretty(response.campos),
        });
        this.loadingFormularios.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo cargar el formulario del departamento.'));
        this.loadingFormularios.set(false);
      },
    });
  }

  guardarFormularioDepartamento(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const raw = this.formularioDeptoForm.getRawValue();
    const flujoId = raw.flujoId || this.selectedFlujoId();
    if (!flujoId || !raw.departamentoId) {
      this.globalError.set('Selecciona flujo y departamento.');
      return;
    }
    const campos = this.parseJsonArray(raw.camposJson, 'campos del formulario');
    if (!campos) {
      return;
    }
    this.loadingFormularios.set(true);
    this.flujosDisenoService
      .editarFormulario(flujoId, raw.departamentoId, {
        departamentoId: raw.departamentoId,
        nombreFormulario: raw.nombreFormulario,
        descripcion: raw.descripcion,
        campos,
      })
      .subscribe({
        next: (response) => {
          this.formularioResultado.set(response);
          this.globalMessage.set('Formulario de departamento actualizado.');
          this.registrarAuditoriaUi(
            'GUARDAR_FORMULARIO_DEPARTAMENTO_EDITOR_GRAFICO',
            'Guardado de formulario por departamento en diseno de flujo.',
            {
              flujoId,
              departamentoId: raw.departamentoId,
              campos: Array.isArray(campos) ? campos.length : 0,
            },
          );
          this.loadingFormularios.set(false);
        },
        error: (error: unknown) => {
          this.globalError.set(this.extraerMensajeError(error, 'No se pudo guardar el formulario del departamento.'));
          this.loadingFormularios.set(false);
        },
      });
  }

  cargarVisualizacionFlujo(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const flujoId = this.visualizacionForm.getRawValue().flujoId || this.selectedFlujoId();
    if (!flujoId) {
      this.globalError.set('Selecciona un flujo para visualizar.');
      return;
    }
    this.loadingVisualizacion.set(true);
    this.flujosDisenoService.visualizarFlujo(flujoId).subscribe({
      next: (response) => {
        this.visualizacionResultado.set(response);
        this.actualizarBpmnDesdeVisualizacion(response, this.selectedFlujo()?.nombre ?? 'Flujo');
        this.loadingVisualizacion.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo cargar la visualizacion del flujo.'));
        this.loadingVisualizacion.set(false);
      },
    });
  }

  generarDesdePrompt(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const flujoIdSeleccionado = this.selectedFlujoId();
    const raw = this.promptForm.getRawValue();
    const promptLimpio = (raw.prompt ?? '').trim();
    if (promptLimpio.length < 5) {
      this.promptForm.markAllAsTouched();
      this.globalError.set('Escribe o dicta un prompt con mayor detalle.');
      return;
    }

    if (!flujoIdSeleccionado && this.promptForm.invalid) {
      this.promptForm.markAllAsTouched();
      this.globalError.set('Completa tipo, nombre y prompt para generar un flujo nuevo.');
      return;
    }

    this.loadingConstructores.set(true);
    if (flujoIdSeleccionado) {
      this.flujosDisenoService.editarDesdePrompt(flujoIdSeleccionado, { prompt: promptLimpio }).subscribe({
        next: (response) => {
          this.procesarResultadoConstructor(response, 'Flujo actualizado desde prompt correctamente.');
          this.activeTab.set('grafico');
        },
        error: (error: unknown) => {
          this.globalError.set(this.extraerMensajeError(error, 'No se pudo editar el flujo desde prompt.'));
          this.loadingConstructores.set(false);
        },
      });
      return;
    }

    this.flujosDisenoService.generarDesdePrompt(this.promptForm.getRawValue()).subscribe({
        next: (response) => {
          this.procesarResultadoConstructor(response, 'Flujo generado desde prompt correctamente.');
        },
        error: (error: unknown) => {
          this.globalError.set(this.extraerMensajeError(error, 'No se pudo generar el flujo desde prompt.'));
          this.loadingConstructores.set(false);
        },
      });
  }

  onPdfPromptSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    this.archivoPdfPrompt.set(file);
    if (!file) {
      this.globalError.set('No se selecciono ningun PDF.');
      return;
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.archivoPdfPrompt.set(null);
      this.globalError.set('Selecciona un archivo PDF valido.');
      return;
    }
    this.globalError.set('');
    this.globalMessage.set(`PDF cargado: ${file.name}`);
  }

  procesarPdfPrompt(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const archivo = this.archivoPdfPrompt();
    if (!archivo) {
      this.globalError.set('Primero sube un PDF.');
      return;
    }
    this.procesandoPdfPrompt.set(true);
    this.flujosDisenoService.transcribirPromptPdf(archivo).subscribe({
      next: (resultadoPdf) => {
        const texto = (resultadoPdf.text ?? '').trim();
        if (texto.length < 20) {
          this.procesandoPdfPrompt.set(false);
          this.globalError.set('El PDF no tiene suficiente texto para generar un flujo.');
          return;
        }
        this.promptForm.patchValue({ prompt: texto });
        this.procesandoPdfPrompt.set(false);
        this.globalMessage.set('PDF procesado. Generando flujo y abriendo editor...');
        this.generarDesdePrompt();
      },
      error: (error: unknown) => {
        this.procesandoPdfPrompt.set(false);
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo procesar el PDF.'));
      },
    });
  }

  iniciarDictadoPrompt(): void {
    this.globalError.set('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.globalError.set('Tu navegador no soporta grabacion de audio.');
      return;
    }
    if (this.dictandoPrompt() || this.transcribiendoPrompt()) {
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        this.mediaStream = stream;
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
        this.audioChunks = [];

        const recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };
        recorder.onerror = () => {
          this.finalizarGrabacion();
          this.globalError.set('Error al grabar audio.');
        };
        recorder.start();
        this.mediaRecorder = recorder;
        this.dictandoPrompt.set(true);
      })
      .catch(() => {
        this.globalError.set('No se pudo acceder al microfono.');
      });
  }

  detenerDictadoPrompt(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      this.dictandoPrompt.set(false);
      return;
    }
    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
      this.finalizarGrabacion();
      if (audioBlob.size === 0) {
        this.globalError.set('No se capturo audio para transcribir.');
        return;
      }
      this.transcribiendoPrompt.set(true);
      this.flujosDisenoService.transcribirPromptAudio(audioBlob, 'es').subscribe({
        next: (response) => {
          const base = (this.promptForm.getRawValue().prompt ?? '').trim();
          const text = (response.text ?? '').trim();
          if (!text) {
            this.globalError.set(response.warning || 'No se obtuvo texto de la transcripcion.');
            this.transcribiendoPrompt.set(false);
            return;
          }
          const prompt = `${base}${base ? ' ' : ''}${text}`.trim();
          this.promptForm.patchValue({ prompt });
          if (response.warning) {
            this.globalMessage.set(`Transcripcion completada con aviso: ${response.warning}`);
          } else {
            this.globalMessage.set('Transcripcion completada. Revisa el texto y luego presiona Procesar.');
          }
          this.transcribiendoPrompt.set(false);
        },
        error: (error: unknown) => {
          this.globalError.set(this.extraerMensajeError(error, 'No se pudo transcribir el audio.'));
          this.transcribiendoPrompt.set(false);
        },
      });
    };
    this.mediaRecorder.stop();
    this.dictandoPrompt.set(false);
  }

  private finalizarGrabacion(): void {
    this.dictandoPrompt.set(false);
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
    }
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  construirDesdeGuiado(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    if (this.guiadoForm.invalid) {
      this.guiadoForm.markAllAsTouched();
      this.globalError.set('Completa los campos obligatorios de construccion guiada.');
      return;
    }
    const raw = this.guiadoForm.getRawValue();
    const nodos = this.parseJsonArray(raw.nodosJson, 'nodos');
    const transiciones = this.parseJsonArray(raw.transicionesJson, 'transiciones');
    const reglas = this.parseJsonArray(raw.reglasJson, 'reglas globales');
    if (!nodos || !transiciones || !reglas) {
      return;
    }

    this.loadingConstructores.set(true);
    this.flujosDisenoService
      .construirDesdeFormulario({
        tipoTramiteId: raw.tipoTramiteId,
        nombre: raw.nombre,
        descripcion: raw.descripcion,
        nodos,
        transiciones,
        reglasGlobales: reglas,
      })
      .subscribe({
        next: (response) => {
          this.procesarResultadoConstructor(response, 'Flujo construido desde formulario guiado.');
        },
        error: (error: unknown) => {
          this.globalError.set(this.extraerMensajeError(error, 'No se pudo construir el flujo guiado.'));
          this.loadingConstructores.set(false);
        },
      });
  }

  async construirDesdeGrafico(): Promise<void> {
    this.globalError.set('');
    this.globalMessage.set('');
    this.mensajeGuardadoGrafico.set('');
    this.errorGuardadoGrafico.set('');
    if (this.graficoForm.invalid) {
      this.graficoForm.markAllAsTouched();
      this.globalError.set('Completa los campos obligatorios de construccion grafica.');
      this.errorGuardadoGrafico.set('No se pudo guardar: faltan datos obligatorios.');
      return;
    }
    const raw = this.graficoForm.getRawValue();
    const xmlActual = this.bpmnModelerXml();
    if (!xmlActual || xmlActual.trim().length === 0) {
      this.globalError.set('No hay BPMN XML en el editor grafico.');
      return;
    }

    let payload: { nodos: unknown[]; transiciones: unknown[]; layout: Record<string, unknown> };
    try {
      payload = await bpmnXmlToFlowPayload(xmlActual);
    } catch {
      this.globalError.set('No se pudo convertir el BPMN XML a estructura de flujo.');
      this.errorGuardadoGrafico.set('No se pudo guardar: BPMN invalido.');
      return;
    }
    const nodosPayload = this.enriquecerNodosConFormulariosActividad((payload.nodos ?? []) as any[]);
    const transicionesPayload = this.enriquecerTransicionesConCondicionesDecision(
      (payload.transiciones ?? []) as any[],
      (payload.nodos ?? []) as any[],
    );
    const formulariosActividadEnviados = (nodosPayload as any[]).filter((nodo) => nodo?.formularioActividad?.campos?.length > 0).length;
    const lanes = this.graphLaneDepartmentIds().map((id) => {
      const dep = this.departamentosActivos().find((item) => item.id === id);
      return { id, nombre: dep?.nombre ?? id };
    });
    const xmlNormalizado = flowToBpmnXml(raw.nombre || 'Flujo', nodosPayload as any[], transicionesPayload as any[], lanes);
    if (nodosPayload.length === 0) {
      this.globalError.set('No se detectaron nodos en el diagrama para guardar.');
      this.errorGuardadoGrafico.set('No se pudo guardar: el editor no genero nodos.');
      return;
    }

    const flujoId = this.selectedFlujoId()
      || this.configuracionForm.getRawValue().flujoId
      || this.visualizacionForm.getRawValue().flujoId
      || this.formularioDeptoForm.getRawValue().flujoId
      || null;
    if (!flujoId) {
      this.globalError.set('No hay flujo seleccionado para guardar. Selecciona un flujo del catalogo y vuelve al editor grafico.');
      this.errorGuardadoGrafico.set('Guardado cancelado: falta flujoId objetivo.');
      return;
    }

    this.loadingConstructores.set(true);
    if (flujoId) {
      try {
        this.globalMessage.set(`Guardando construccion grafica sobre flujoId=${flujoId}...`);
        await firstValueFrom(
          this.flujosDisenoService.actualizarFlujo(flujoId, {
            nombre: raw.nombre,
            descripcion: raw.descripcion,
            observaciones: '',
          }),
        );
        await firstValueFrom(
          this.flujosDisenoService.guardarConfiguracion(flujoId, {
            nodos: nodosPayload,
            transiciones: transicionesPayload,
            reglasGlobales: [],
            bpmnXml: xmlNormalizado,
          }),
        );
        this.bpmnModelerXml.set(xmlNormalizado);
        this.guardarBpmnEnCacheLocal(flujoId, xmlNormalizado);
        const verificacion = await firstValueFrom(this.flujosDisenoService.obtenerConfiguracion(flujoId));
        const nodosGuardados = (verificacion.nodos ?? []) as any[];
        const transicionesGuardadas = (verificacion.transiciones ?? []) as any[];
        this.hidratarCondicionesDecisionDesdeTransiciones(transicionesGuardadas);
        const formulariosActividadPersistidos = nodosGuardados.filter((nodo) => nodo?.formularioActividad?.campos?.length > 0).length;
        if (nodosGuardados.length === 0) {
          this.globalError.set(
            `Backend devolvio configuracion vacia. Enviado: ${nodosPayload.length} nodos, ${transicionesPayload.length} transiciones.`,
          );
          this.errorGuardadoGrafico.set('Se envio el guardado, pero backend devolvio estructura vacia.');
          this.mensajeGuardadoGrafico.set('');
        } else {
          if (formulariosActividadEnviados > 0 && formulariosActividadPersistidos === 0) {
            this.globalError.set('El backend guardo nodos/transiciones, pero no persistio formularios de actividad.');
            this.mensajeGuardadoGrafico.set('');
            this.errorGuardadoGrafico.set(
              `Diagnostico: enviados ${formulariosActividadEnviados} formularios por actividad, persistidos ${formulariosActividadPersistidos}.`,
            );
          } else {
            this.globalMessage.set('Construccion grafica guardada en el flujo seleccionado.');
            this.mensajeGuardadoGrafico.set(
              `Diagrama guardado correctamente. Guardados: ${nodosGuardados.length} nodos, ${transicionesGuardadas.length} transiciones, enviados ${formulariosActividadEnviados}, persistidos ${formulariosActividadPersistidos} formularios de actividad.`,
            );
            this.registrarAuditoriaUi(
              'GUARDAR_CONSTRUCCION_GRAFICA',
              'Guardado de construccion grafica de flujo.',
              {
                flujoId,
                nodos: nodosGuardados.length,
                transiciones: transicionesGuardadas.length,
                formulariosActividadPersistidos,
              },
            );
            this.errorGuardadoGrafico.set('');
          }
        }
        this.loadingConstructores.set(false);
        this.cargarFlujos();
        this.seleccionarFlujo(flujoId);
      } catch (error: unknown) {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo guardar la construccion grafica del flujo.'));
        this.mensajeGuardadoGrafico.set('');
        this.errorGuardadoGrafico.set('No se pudo guardar el diagrama. Revisa los datos del flujo.');
        this.loadingConstructores.set(false);
      }
      return;
    }
  }

  async onBpmnModelerChange(xml: string): Promise<void> {
    this.bpmnModelerXml.set(xml);
    this.sincronizarCarrilesDesdeXml(xml);
    await this.sincronizarFormulariosActividadConNodosActuales(xml);
    const flujoId = this.selectedFlujoId();
    if (flujoId) {
      this.guardarBpmnEnCacheLocal(flujoId, xml);
    }
  }

  onBpmnElementClick(event: BpmnElementClickEvent): void {
    if (event.type === 'bpmn:SequenceFlow') {
      this.abrirRenombrarTransicionModal(event.id, event.name);
      return;
    }
    if (event.type === 'bpmn:ExclusiveGateway') {
      this.abrirFormularioDecisionModal(event.id, event.name);
      return;
    }
    if (event.type === 'bpmn:StartEvent') {
      this.abrirFormularioActividadModal(event.id, event.name);
      return;
    }
    if (event.type === 'bpmn:EndEvent') {
      this.abrirFormularioFinModal(event.id, event.name);
      return;
    }
    if (event.type !== 'bpmn:Task' && event.type !== 'bpmn:UserTask' && event.type !== 'bpmn:ServiceTask' && event.type !== 'bpmn:ScriptTask') {
      return;
    }
    this.abrirFormularioActividadModal(event.id, event.name);
  }

  private abrirRenombrarTransicionModal(transicionId: string, nombreActual: string): void {
    const id = (transicionId ?? '').trim();
    if (!id) {
      return;
    }
    this.globalError.set('');
    this.globalMessage.set('');
    this.renombrarTransicionId.set(id);
    this.renombrarTransicionNombre.set((nombreActual ?? '').trim() || 'Texto');
    this.showRenombrarTransicionModal.set(true);
  }

  cancelarRenombrarTransicionModal(): void {
    this.showRenombrarTransicionModal.set(false);
    this.renombrarTransicionId.set('');
    this.renombrarTransicionNombre.set('Texto');
  }

  async confirmarRenombrarTransicionModal(): Promise<void> {
    const id = this.renombrarTransicionId().trim();
    if (!id) {
      this.cancelarRenombrarTransicionModal();
      return;
    }
    const nuevoNombre = this.renombrarTransicionNombre().trim() || 'Texto';
    await this.renombrarTransicionDesdeCanvas(id, nuevoNombre);
    this.cancelarRenombrarTransicionModal();
  }

  private async renombrarTransicionDesdeCanvas(transicionId: string, nuevoNombre: string): Promise<void> {
    this.globalError.set('');
    this.globalMessage.set('');
    const id = (transicionId ?? '').trim();
    if (!id) {
      return;
    }

    const xml = this.bpmnModelerXml();
    if (!xml) {
      this.globalError.set('No hay diagrama disponible para renombrar la transicion.');
      return;
    }

    let parsed: { nodos: any[]; transiciones: any[] };
    try {
      parsed = await bpmnXmlToFlowPayload(xml);
    } catch {
      this.globalError.set('No se pudo leer el diagrama para renombrar la transicion.');
      return;
    }

    const nodos = (parsed.nodos ?? []) as any[];
    const transiciones = (parsed.transiciones ?? []) as any[];
    const indice = transiciones.findIndex((t) => String(t?.idTransicion ?? '') === id);
    if (indice < 0) {
      this.globalError.set('La transicion seleccionada no existe en el diagrama actual.');
      return;
    }

    transiciones[indice] = {
      ...transiciones[indice],
      nombre: nuevoNombre,
    };

    const flowName =
      this.graficoForm.getRawValue().nombre
      || this.flujos().find((item) => item.id === this.selectedFlujoId())?.nombre
      || 'Flujo';

    const laneIds = this.graphLaneDepartmentIds().length > 0
      ? this.graphLaneDepartmentIds()
      : Array.from(new Set(nodos.map((n) => String(n?.departamentoId ?? '').trim()).filter((idItem) => !!idItem)));
    const lanes = laneIds.map((idItem) => {
      const dep = this.departamentosActivos().find((d) => d.id === idItem);
      return { id: idItem, nombre: dep?.nombre ?? idItem };
    });

    const nuevoXml = flowToBpmnXml(flowName, nodos, transiciones, lanes);
    this.bpmnModelerXml.set(nuevoXml);
    this.sincronizarCarrilesDesdeXml(nuevoXml);
    await this.sincronizarFormulariosActividadConNodosActuales(nuevoXml);
    const flujoId = this.selectedFlujoId();
    if (flujoId) {
      this.guardarBpmnEnCacheLocal(flujoId, nuevoXml);
    }

    this.globalMessage.set(`Transicion actualizada: ${nuevoNombre}`);
    this.registrarAuditoriaUi(
      'RENOMBRAR_TRANSICION_EDITOR_GRAFICO',
      'Renombrado de transicion en editor grafico.',
      {
        flujoId: this.selectedFlujoId(),
        transicionId: id,
        nombre: nuevoNombre,
      },
    );
  }

  private async abrirFormularioDecisionModal(nodoId: string, nombreDesdeCanvas: string): Promise<void> {
    this.globalError.set('');
    this.globalMessage.set('');
    const id = (nodoId ?? '').trim();
    if (!id) {
      return;
    }
    const xml = this.bpmnModelerXml();
    if (!xml) {
      this.globalError.set('No hay diagrama cargado para abrir el rombo.');
      return;
    }

    let parsed: { nodos: any[]; transiciones: any[] };
    try {
      parsed = await bpmnXmlToFlowPayload(xml);
    } catch {
      this.globalError.set('No se pudo leer el diagrama para abrir el rombo.');
      return;
    }

    const nodos = (parsed.nodos ?? []) as any[];
    const transiciones = (parsed.transiciones ?? []) as any[];
    const nodo = nodos.find((item) => String(item?.idNodo ?? '') === id);
    if (!nodo || String(nodo?.tipoNodo ?? '').toUpperCase() !== 'DECISION') {
      this.globalError.set('El rombo seleccionado no existe en el diagrama actual.');
      return;
    }

    const caminos = transiciones
      .filter((transicion) => String(transicion?.nodoOrigenId ?? '') === id)
      .map((transicion, index) => {
        const destinoId = String(transicion?.nodoDestinoId ?? '').trim();
        const destino = nodos.find((item) => String(item?.idNodo ?? '') === destinoId);
        return {
          idTransicion: String(transicion?.idTransicion ?? `camino_${index + 1}`),
          nombreCamino: String(transicion?.nombre ?? '').trim() || 'Texto',
          destinoId: destinoId || '-',
          destinoNombre: String(destino?.nombre ?? destinoId ?? 'Destino desconocido').trim() || 'Destino desconocido',
        } satisfies CaminoDecisionModal;
      });

    const camposEntregable = this.construirCamposEntregableDecisionParaNodo(id, nodos, transiciones);
    const reglasPersistidas = this.condicionesDecisionPorTransicion();
    const estadosPorCamino: Record<string, Record<string, EstadoCondicionDecision>> = {};
    for (const camino of caminos) {
      const reglasCamino = reglasPersistidas[camino.idTransicion] ?? {};
      const estadoCampos: Record<string, EstadoCondicionDecision> = {};
      for (const campo of camposEntregable) {
        const estadoPersistido = reglasCamino[campo.claveCampo];
        if (campo.obligatorio) {
          estadoCampos[campo.claveCampo] = 'SI';
          continue;
        }
        estadoCampos[campo.claveCampo] = estadoPersistido ?? 'CUALQUIERA';
      }
      estadosPorCamino[camino.idTransicion] = estadoCampos;
    }

    this.formularioDecisionNodoId.set(id);
    this.formularioDecisionNombreNodo.set(String(nodo?.nombre ?? nombreDesdeCanvas ?? 'Decision'));
    this.formularioDecisionCaminos.set(caminos);
    this.formularioDecisionCamposEntregable.set(camposEntregable);
    this.formularioDecisionEstadosPorCamino.set(estadosPorCamino);
    this.showFormularioDecisionModal.set(true);
  }

  private async abrirFormularioFinModal(nodoId: string, nombreDesdeCanvas: string): Promise<void> {
    this.globalError.set('');
    this.globalMessage.set('');
    const id = (nodoId ?? '').trim();
    if (!id) {
      return;
    }
    const xml = this.bpmnModelerXml();
    if (!xml) {
      this.globalError.set('No hay diagrama cargado para abrir el nodo fin.');
      return;
    }

    let parsed: { nodos: any[]; transiciones: any[] };
    try {
      parsed = await bpmnXmlToFlowPayload(xml);
    } catch {
      this.globalError.set('No se pudo leer el diagrama para abrir el nodo fin.');
      return;
    }

    const nodos = (parsed.nodos ?? []) as any[];
    const transiciones = (parsed.transiciones ?? []) as any[];
    const nodo = nodos.find((item) => String(item?.idNodo ?? '') === id);
    if (!nodo || String(nodo?.tipoNodo ?? '').toUpperCase() !== 'FIN') {
      this.globalError.set('El nodo fin seleccionado no existe en el diagrama actual.');
      return;
    }

    const caminos = transiciones
      .filter((transicion) => String(transicion?.nodoDestinoId ?? '') === id)
      .map((transicion, index) => {
        const origenId = String(transicion?.nodoOrigenId ?? '').trim();
        const origen = nodos.find((item) => String(item?.idNodo ?? '') === origenId);
        const camposEntregable = this.construirCamposEntregableHastaNodo(origenId, nodos, transiciones, true);
        return {
          idTransicion: String(transicion?.idTransicion ?? `camino_fin_${index + 1}`),
          nombreCamino: String(transicion?.nombre ?? '').trim() || 'Texto',
          origenId: origenId || '-',
          origenNombre: String(origen?.nombre ?? origenId ?? 'Origen desconocido').trim() || 'Origen desconocido',
          camposEntregable,
        } satisfies CaminoFinModal;
      });

    this.formularioFinNodoId.set(id);
    this.formularioFinNombreNodo.set(String(nodo?.nombre ?? nombreDesdeCanvas ?? 'Fin'));
    this.formularioFinCaminos.set(caminos);
    this.showFormularioFinModal.set(true);
  }

  cerrarFormularioFinModal(): void {
    this.showFormularioFinModal.set(false);
    this.formularioFinNodoId.set('');
    this.formularioFinNombreNodo.set('');
    this.formularioFinCaminos.set([]);
  }

  cerrarFormularioDecisionModal(): void {
    this.showFormularioDecisionModal.set(false);
    this.formularioDecisionNodoId.set('');
    this.formularioDecisionNombreNodo.set('');
    this.formularioDecisionCaminos.set([]);
    this.formularioDecisionCamposEntregable.set([]);
    this.formularioDecisionEstadosPorCamino.set({});
  }

  async guardarFormularioDecisionModal(): Promise<void> {
    const nodoId = this.formularioDecisionNodoId().trim();
    const nuevoNombre = this.formularioDecisionNombreNodo().trim();
    if (!nodoId) {
      this.cerrarFormularioDecisionModal();
      return;
    }
    if (!nuevoNombre) {
      this.globalError.set('El nombre del rombo es obligatorio.');
      return;
    }
    this.persistirEstadosDecisionDelModal();
    await this.renombrarDecisionDesdeCanvas(nodoId, nuevoNombre);
    this.cerrarFormularioDecisionModal();
  }

  estadoCampoDecision(idTransicion: string, claveCampo: string): EstadoCondicionDecision {
    const porCamino = this.formularioDecisionEstadosPorCamino()[idTransicion] ?? {};
    const campo = this.formularioDecisionCamposEntregable().find((item) => item.claveCampo === claveCampo);
    if (campo?.obligatorio) {
      return 'SI';
    }
    return porCamino[claveCampo] ?? 'CUALQUIERA';
  }

  actualizarEstadoCampoDecision(idTransicion: string, claveCampo: string, estadoCrudo: string): void {
    const estado = this.normalizarEstadoCondicion(estadoCrudo);
    const campo = this.formularioDecisionCamposEntregable().find((item) => item.claveCampo === claveCampo);
    if (campo?.obligatorio) {
      return;
    }
    this.formularioDecisionEstadosPorCamino.update((actual) => {
      const camino = { ...(actual[idTransicion] ?? {}) };
      camino[claveCampo] = estado;
      return { ...actual, [idTransicion]: camino };
    });
  }

  private async renombrarDecisionDesdeCanvas(nodoId: string, nuevoNombre: string): Promise<void> {
    this.globalError.set('');
    this.globalMessage.set('');
    const xml = this.bpmnModelerXml();
    if (!xml) {
      this.globalError.set('No hay diagrama disponible para renombrar el rombo.');
      return;
    }

    let parsed: { nodos: any[]; transiciones: any[] };
    try {
      parsed = await bpmnXmlToFlowPayload(xml);
    } catch {
      this.globalError.set('No se pudo leer el diagrama para renombrar el rombo.');
      return;
    }

    const nodos = (parsed.nodos ?? []) as any[];
    const transiciones = (parsed.transiciones ?? []) as any[];
    const indice = nodos.findIndex((nodo) => String(nodo?.idNodo ?? '') === nodoId);
    if (indice < 0) {
      this.globalError.set('El rombo seleccionado ya no existe en el diagrama.');
      return;
    }
    if (String(nodos[indice]?.tipoNodo ?? '').toUpperCase() !== 'DECISION') {
      this.globalError.set('El elemento seleccionado no es un rombo de decision.');
      return;
    }

    nodos[indice] = {
      ...nodos[indice],
      nombre: nuevoNombre,
    };

    const flowName =
      this.graficoForm.getRawValue().nombre
      || this.flujos().find((item) => item.id === this.selectedFlujoId())?.nombre
      || 'Flujo';
    const laneIds = this.graphLaneDepartmentIds().length > 0
      ? this.graphLaneDepartmentIds()
      : Array.from(new Set(nodos.map((n) => String(n?.departamentoId ?? '').trim()).filter((idItem) => !!idItem)));
    const lanes = laneIds.map((idItem) => {
      const dep = this.departamentosActivos().find((d) => d.id === idItem);
      return { id: idItem, nombre: dep?.nombre ?? idItem };
    });

    const nuevoXml = flowToBpmnXml(flowName, nodos, transiciones, lanes);
    this.bpmnModelerXml.set(nuevoXml);
    this.sincronizarCarrilesDesdeXml(nuevoXml);
    await this.sincronizarFormulariosActividadConNodosActuales(nuevoXml);
    const flujoId = this.selectedFlujoId();
    if (flujoId) {
      this.guardarBpmnEnCacheLocal(flujoId, nuevoXml);
    }
    this.globalMessage.set(`Rombo actualizado: ${nuevoNombre}`);
    this.registrarAuditoriaUi(
      'GUARDAR_REGLAS_ROMBO_EDITOR_GRAFICO',
      'Guardado de reglas automaticas del rombo de decision.',
      {
        flujoId: this.selectedFlujoId(),
        nodoDecisionId: nodoId,
        caminos: this.formularioDecisionCaminos().length,
      },
    );
  }

  cerrarFormularioActividadModal(): void {
    this.showFormularioActividadModal.set(false);
    this.limpiarFormularioActividadContext();
  }

  agregarCampoActividad(tipo: 'AREA_TEXTO' | 'IMAGEN' | 'ARCHIVO'): void {
    const index = this.formularioActividadCamposDraft().length + 1;
    const id = `campo_${Date.now()}_${index}`;
    const etiquetaDefault = tipo === 'IMAGEN' ? 'Adjuntar foto' : tipo === 'ARCHIVO' ? 'Adjuntar documento' : 'Campo de texto';
    this.formularioActividadCamposDraft.update((items) => [
      ...items,
      {
        id,
        etiqueta: etiquetaDefault,
        tipo,
        obligatorio: false,
        ayuda: '',
      },
    ]);
  }

  actualizarCampoActividad(index: number, patch: Partial<CampoActividadDraft>): void {
    this.formularioActividadCamposDraft.update((items) =>
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  eliminarCampoActividad(index: number): void {
    this.formularioActividadCamposDraft.update((items) => items.filter((_, i) => i !== index));
  }

  async guardarFormularioActividadModal(): Promise<void> {
    this.globalError.set('');
    this.globalMessage.set('');
    this.persistenciaFormularioEstado.set('pendiente');
    this.persistenciaFormularioDetalle.set('Guardando cambios en backend...');
    this.persistenciaFormularioUltimaFecha.set('');
    const nodoId = this.formularioActividadNodoId();
    if (!nodoId) {
      this.globalError.set('No se detecto la actividad para guardar formulario.');
      return;
    }
    const nombreNodo = this.formularioActividadNombreNodo().trim();
    if (!nombreNodo) {
      this.globalError.set('El nombre de la actividad es obligatorio.');
      return;
    }
    const xml = this.bpmnModelerXml();
    if (!xml) {
      this.globalError.set('No hay diagrama disponible para actualizar la actividad.');
      return;
    }

    let parsed: { nodos: any[]; transiciones: any[] };
    try {
      parsed = await bpmnXmlToFlowPayload(xml);
    } catch {
      this.globalError.set('No se pudo leer el diagrama para guardar el formulario de actividad.');
      return;
    }
    const nodos = (parsed.nodos ?? []) as any[];
    const transiciones = (parsed.transiciones ?? []) as any[];
    const nodo = nodos.find((item) => item?.idNodo === nodoId);
    if (!nodo) {
      this.globalError.set('La actividad seleccionada ya no existe en el diagrama.');
      return;
    }

    nodo.nombre = nombreNodo;
    const formularioActividad = this.construirFormularioActividadDesdeDraft(nombreNodo);
    this.formulariosActividadPorNodo.update((mapa) => ({
      ...mapa,
      [nodoId]: formularioActividad,
    }));

    const lanes = this.graphLaneDepartmentIds().map((id) => {
      const dep = this.departamentosActivos().find((d) => d.id === id);
      return { id, nombre: dep?.nombre ?? id };
    });
    const flowName = this.graficoForm.getRawValue().nombre || 'Flujo nuevo';
    const nodosConFormulario = this.enriquecerNodosConFormulariosActividad(nodos);
    const nuevoXml = flowToBpmnXml(flowName, nodosConFormulario, transiciones, lanes);
    this.bpmnModelerXml.set(nuevoXml);
    const flujoId = this.selectedFlujoId();
    if (flujoId) {
      this.guardarBpmnEnCacheLocal(flujoId, nuevoXml);
      try {
        const payloadPersistencia = await bpmnXmlToFlowPayload(nuevoXml);
        const nodosPersistencia = this.enriquecerNodosConFormulariosActividad((payloadPersistencia.nodos ?? []) as any[]);
        const transicionesPersistencia = this.enriquecerTransicionesConCondicionesDecision(
          (payloadPersistencia.transiciones ?? []) as any[],
          (payloadPersistencia.nodos ?? []) as any[],
        );
        await firstValueFrom(
          this.flujosDisenoService.guardarConfiguracion(flujoId, {
            nodos: nodosPersistencia,
            transiciones: transicionesPersistencia,
            reglasGlobales: [],
            bpmnXml: nuevoXml,
          }),
        );
        const verificacion = await firstValueFrom(this.flujosDisenoService.obtenerConfiguracion(flujoId));
        this.hidratarFormulariosActividadDesdeNodos((verificacion.nodos ?? []) as any[]);
        this.hidratarCondicionesDecisionDesdeTransiciones((verificacion.transiciones ?? []) as any[]);
        this.persistenciaFormularioEstado.set('ok');
        this.persistenciaFormularioDetalle.set('Configuracion guardada correctamente en base de datos.');
        this.persistenciaFormularioUltimaFecha.set(this.formatearFechaHoraLocal(new Date()));
        this.registrarAuditoriaUi(
          'GUARDAR_FORMULARIO_ACTIVIDAD_EDITOR_GRAFICO',
          'Guardado de formulario por actividad en editor grafico.',
          {
            flujoId,
            nodoId,
            nombreNodo,
            campos: formularioActividad.campos.length,
          },
        );
      } catch (error: unknown) {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo persistir el formulario de actividad en el flujo.'));
        this.errorGuardadoGrafico.set('El formulario se actualizo en pantalla, pero fallo la persistencia en backend.');
        this.persistenciaFormularioEstado.set('error');
        this.persistenciaFormularioDetalle.set('No se pudo confirmar el guardado en backend.');
        this.persistenciaFormularioUltimaFecha.set(this.formatearFechaHoraLocal(new Date()));
        return;
      }
    }
    this.globalMessage.set('Formulario de actividad actualizado y persistido.');
    this.showFormularioActividadModal.set(false);
    this.limpiarFormularioActividadContext();
  }

  aplicarPromptFormularioActividadModal(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const flujoId = this.selectedFlujoId();
    const nodoId = this.formularioActividadNodoId();
    const prompt = this.formularioActividadPrompt().trim();
    if (!flujoId) {
      this.globalError.set('Selecciona un flujo antes de aplicar prompt al formulario.');
      return;
    }
    if (!nodoId) {
      this.globalError.set('No se detecto nodo para aplicar prompt.');
      return;
    }
    if (prompt.length < 5) {
      this.globalError.set('Escribe un prompt con mayor detalle para editar el formulario.');
      return;
    }

    const payload: EditarFormularioActividadDesdePromptRequest = { prompt };
    this.loadingFormularioActividadPrompt.set(true);
    this.flujosDisenoService.editarFormularioActividadDesdePrompt(flujoId, nodoId, payload).subscribe({
      next: async (response) => {
        this.constructorResultado.set(response);
        try {
          const config = await firstValueFrom(this.flujosDisenoService.obtenerConfiguracion(flujoId));
          this.hidratarFormulariosActividadDesdeNodos((config.nodos ?? []) as any[]);
          const actualizado = this.formulariosActividadPorNodo()[nodoId];
          this.formularioActividadCamposDraft.set(this.mapearFormularioADraft(actualizado));
          this.persistenciaFormularioEstado.set('ok');
          this.persistenciaFormularioDetalle.set('Formulario actualizado por prompt y persistido en backend.');
          this.persistenciaFormularioUltimaFecha.set(this.formatearFechaHoraLocal(new Date()));
          this.formularioActividadPrompt.set('');
          if (response.advertencias?.length) {
            this.globalMessage.set(`Prompt aplicado con advertencias: ${response.advertencias.join(' | ')}`);
          } else {
            this.globalMessage.set('Prompt aplicado al formulario correctamente.');
          }
        } catch (errorConfig: unknown) {
          this.globalError.set(this.extraerMensajeError(errorConfig, 'Prompt aplicado, pero no se pudo refrescar configuracion.'));
        } finally {
          this.loadingFormularioActividadPrompt.set(false);
        }
      },
      error: (error: unknown) => {
        this.loadingFormularioActividadPrompt.set(false);
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo aplicar el prompt al formulario de actividad.'));
      },
    });
  }

  onDragDepartmentStart(event: DragEvent, departamentoId: string): void {
    this.draggingDepartmentId.set(departamentoId);
    event.dataTransfer?.setData('text/plain', departamentoId);
  }

  onCanvasDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onCanvasDrop(event: DragEvent): void {
    event.preventDefault();
    const departamentoId = event.dataTransfer?.getData('text/plain') || this.draggingDepartmentId();
    if (!departamentoId) {
      return;
    }
    this.agregarCarrilDesdeDepartamento(departamentoId);
    this.draggingDepartmentId.set(null);
  }

  private async abrirFormularioActividadModal(nodoId: string, nombreDesdeCanvas: string): Promise<void> {
    const xml = this.bpmnModelerXml();
    if (!xml) {
      this.globalError.set('No hay diagrama cargado para editar la actividad.');
      return;
    }
    let parsed: { nodos: any[] };
    try {
      parsed = await bpmnXmlToFlowPayload(xml);
    } catch {
      this.globalError.set('No se pudo leer el diagrama para abrir la actividad.');
      return;
    }
    const nodos = (parsed.nodos ?? []) as any[];
    const nodo = nodos.find((item) => item?.idNodo === nodoId);
    if (!nodo) {
      this.globalError.set('No se encontro el nodo seleccionado.');
      return;
    }
    const depId = String(nodo?.departamentoId ?? '').trim() || 'SIN_DEPARTAMENTO';
    const esInicio = String(nodo?.tipoNodo ?? '').toUpperCase() === 'INICIO';

    const existente = this.formulariosActividadPorNodo()[nodoId];
    this.formularioActividadNodoId.set(nodoId);
    this.formularioActividadDepartamentoId.set(depId);
    this.formularioActividadEsNodoInicio.set(esInicio);
    this.formularioActividadNombreNodo.set(String(nodo?.nombre ?? nombreDesdeCanvas ?? 'Actividad'));
    this.formularioActividadCamposDraft.set(this.mapearFormularioADraft(existente));
    const tieneFormularioGuardado = !!existente && Array.isArray(existente.campos) && existente.campos.length > 0;
    if (tieneFormularioGuardado) {
      this.persistenciaFormularioEstado.set('ok');
      this.persistenciaFormularioDetalle.set('Este formulario ya fue recuperado desde backend.');
      this.persistenciaFormularioUltimaFecha.set('');
    } else {
      this.persistenciaFormularioEstado.set('pendiente');
      this.persistenciaFormularioDetalle.set('Aun no se guardo este cambio en backend.');
      this.persistenciaFormularioUltimaFecha.set('');
    }
    this.showFormularioActividadModal.set(true);
  }

  private limpiarFormularioActividadContext(): void {
    this.formularioActividadNodoId.set('');
    this.formularioActividadDepartamentoId.set('');
    this.formularioActividadNombreNodo.set('');
    this.formularioActividadEsNodoInicio.set(false);
    this.formularioActividadCamposDraft.set([]);
    this.formularioActividadPrompt.set('');
    this.loadingFormularioActividadPrompt.set(false);
    this.persistenciaFormularioEstado.set('pendiente');
    this.persistenciaFormularioDetalle.set('');
    this.persistenciaFormularioUltimaFecha.set('');
  }

  private mapearFormularioADraft(formulario: FormularioActividad | undefined): CampoActividadDraft[] {
    if (!formulario?.campos?.length) {
      return [];
    }
    return formulario.campos.map((campo, index) => ({
      id: campo.idCampo || `campo_${index + 1}`,
      etiqueta: campo.etiqueta || `Campo ${index + 1}`,
      tipo: campo.tipoCampo,
      obligatorio: !!campo.obligatorio,
      ayuda: campo.ayuda ?? '',
    }));
  }

  private construirFormularioActividadDesdeDraft(nombreNodo: string): FormularioActividad {
    const campos = this.formularioActividadCamposDraft().map((item, index) => {
      const etiqueta = (item.etiqueta || `Campo ${index + 1}`).trim();
      const nombreTecnico = this.normalizarNombreTecnico(etiqueta || `campo_${index + 1}`);
      return {
        idCampo: item.id || `campo_${index + 1}`,
        nombreTecnico,
        etiqueta,
        tipoCampo: item.tipo,
        obligatorio: item.obligatorio,
        visible: true,
        editable: true,
        esencial: false,
        orden: index + 3,
        placeholder: '',
        ayuda: item.ayuda ?? '',
        validaciones: item.obligatorio ? ['requerido'] : [],
        opciones: [],
      } satisfies CampoFormularioActividad;
    });
    const existente = this.formulariosActividadPorNodo()[this.formularioActividadNodoId()];
    return {
      nombreFormulario: `Formulario - ${nombreNodo}`,
      descripcion: '',
      versionInterna: (existente?.versionInterna ?? 0) + 1,
      activo: true,
      campos,
    };
  }

  private construirCamposEntregableDecisionParaNodo(
    nodoObjetivoId: string,
    nodos: any[],
    transiciones: any[],
  ): CampoEntregableDecision[] {
    return this.construirCamposEntregableHastaNodo(nodoObjetivoId, nodos, transiciones, false);
  }

  private construirCamposEntregableHastaNodo(
    nodoObjetivoId: string,
    nodos: any[],
    transiciones: any[],
    incluirNodoObjetivo: boolean,
  ): CampoEntregableDecision[] {
    const idsPrevios = this.obtenerIdsNodosPrevios(nodoObjetivoId, transiciones, incluirNodoObjetivo);
    const nombresPorId = new Map(
      (nodos ?? []).map((nodo) => [
        String(nodo?.idNodo ?? ''),
        String(nodo?.nombre ?? nodo?.idNodo ?? '').trim() || String(nodo?.idNodo ?? ''),
      ]),
    );
    return this.construirCamposEntregableDesdeIds(idsPrevios, nombresPorId);
  }

  private obtenerIdsNodosPrevios(
    nodoObjetivoId: string,
    transiciones: any[],
    incluirNodoObjetivo: boolean,
  ): Set<string> {
    const objetivo = String(nodoObjetivoId ?? '').trim();
    if (!objetivo) {
      return new Set<string>();
    }
    const incoming = new Map<string, string[]>();
    for (const transicion of transiciones ?? []) {
      const origen = String(transicion?.nodoOrigenId ?? '').trim();
      const destino = String(transicion?.nodoDestinoId ?? '').trim();
      if (!origen || !destino) {
        continue;
      }
      const lista = incoming.get(destino) ?? [];
      lista.push(origen);
      incoming.set(destino, lista);
    }

    const visitados = new Set<string>();
    const pendientes: string[] = [objetivo];
    while (pendientes.length > 0) {
      const actual = pendientes.pop()!;
      if (visitados.has(actual)) {
        continue;
      }
      visitados.add(actual);
      for (const origen of incoming.get(actual) ?? []) {
        if (!visitados.has(origen)) {
          pendientes.push(origen);
        }
      }
    }

    if (!incluirNodoObjetivo) {
      visitados.delete(objetivo);
    }
    return visitados;
  }

  private construirCamposEntregableDesdeIds(
    idsNodos: Set<string>,
    nombresPorId: Map<string, string>,
  ): CampoEntregableDecision[] {
    const campos: CampoEntregableDecision[] = [];
    for (const [nodoId, formulario] of Object.entries(this.formulariosActividadPorNodo())) {
      if (!idsNodos.has(nodoId)) {
        continue;
      }
      for (const campo of formulario?.campos ?? []) {
        if (!campo || !campo.idCampo || !campo.etiqueta) {
          continue;
        }
        if (campo.idCampo === 'estado_iniciado' || campo.idCampo === 'estado_finalizado') {
          continue;
        }
        if (campo.tipoCampo !== 'AREA_TEXTO' && campo.tipoCampo !== 'IMAGEN' && campo.tipoCampo !== 'ARCHIVO') {
          continue;
        }
        campos.push({
          claveCampo: `${nodoId}:${campo.idCampo}`,
          nodoId,
          nodoNombre: nombresPorId.get(nodoId) ?? this.nombreNodoPorId(nodoId),
          idCampo: campo.idCampo,
          etiqueta: campo.etiqueta,
          tipoCampo: campo.tipoCampo,
          obligatorio: !!campo.obligatorio,
        });
      }
    }
    return campos.sort((a, b) => {
      const nodoComp = a.nodoNombre.localeCompare(b.nodoNombre, 'es');
      if (nodoComp !== 0) {
        return nodoComp;
      }
      return a.etiqueta.localeCompare(b.etiqueta, 'es');
    });
  }

  private persistirEstadosDecisionDelModal(): void {
    const campos = this.formularioDecisionCamposEntregable();
    const estadosModal = this.formularioDecisionEstadosPorCamino();
    this.condicionesDecisionPorTransicion.update((actual) => {
      const actualizado = { ...actual };
      for (const camino of this.formularioDecisionCaminos()) {
        const estadosCamino = estadosModal[camino.idTransicion] ?? {};
        const reglas: Record<string, EstadoCondicionDecision> = {};
        for (const campo of campos) {
          const estado = campo.obligatorio ? 'SI' : this.normalizarEstadoCondicion(estadosCamino[campo.claveCampo]);
          reglas[campo.claveCampo] = estado;
        }
        actualizado[camino.idTransicion] = reglas;
      }
      return actualizado;
    });
  }

  private normalizarEstadoCondicion(estado: unknown): EstadoCondicionDecision {
    const valor = String(estado ?? '').trim().toUpperCase();
    if (valor === 'SI' || valor === 'NO') {
      return valor;
    }
    return 'CUALQUIERA';
  }

  private enriquecerTransicionesConCondicionesDecision(transiciones: any[], nodos: any[] = []): any[] {
    const reglas = this.condicionesDecisionPorTransicion();
    const tipoNodoPorId = new Map(
      (nodos ?? []).map((nodo) => [String(nodo?.idNodo ?? ''), String(nodo?.tipoNodo ?? '').toUpperCase()]),
    );
    const camposPorDecision = new Map<string, CampoEntregableDecision[]>();
    return (transiciones ?? []).map((transicion) => {
      const idTransicion = String(transicion?.idTransicion ?? '');
      if (!idTransicion) {
        return transicion;
      }
      const origenId = String(transicion?.nodoOrigenId ?? '');
      const esSalidaDecision = tipoNodoPorId.get(origenId) === 'DECISION';
      let camposDecision: CampoEntregableDecision[] = [];
      if (esSalidaDecision) {
        if (!camposPorDecision.has(origenId)) {
          camposPorDecision.set(origenId, this.construirCamposEntregableDecisionParaNodo(origenId, nodos, transiciones));
        }
        camposDecision = camposPorDecision.get(origenId) ?? [];
      }
      const campoPorClave = new Map(camposDecision.map((campo) => [campo.claveCampo, campo]));
      const reglasPorDefecto: Record<string, EstadoCondicionDecision> = {};
      for (const campo of camposDecision) {
        reglasPorDefecto[campo.claveCampo] = campo.obligatorio ? 'SI' : 'CUALQUIERA';
      }
      const reglasCamino = reglas[idTransicion] ?? (esSalidaDecision ? reglasPorDefecto : undefined);
      if (!reglasCamino) {
        return { ...transicion, condiciones: Array.isArray(transicion?.condiciones) ? transicion.condiciones : [] };
      }
      const condiciones = Object.entries(reglasCamino)
        .filter(([claveCampo]) => campoPorClave.has(claveCampo))
        .map(([claveCampo, estado]) => {
        const campo = campoPorClave.get(claveCampo);
        return {
          tipoCondicion: 'SIMPLE',
          campo: claveCampo,
          operador: 'EXISTE',
          valor: this.normalizarEstadoCondicion(estado),
          descripcion: campo
            ? `${campo.nodoNombre} - ${campo.etiqueta}: ${this.normalizarEstadoCondicion(estado)}`
            : `Condicion ${claveCampo}`,
        };
      });
      return {
        ...transicion,
        condiciones,
      };
    });
  }

  private hidratarCondicionesDecisionDesdeTransiciones(transiciones: any[]): void {
    const nuevo: Record<string, Record<string, EstadoCondicionDecision>> = {};
    for (const transicion of transiciones ?? []) {
      const idTransicion = String(transicion?.idTransicion ?? '').trim();
      if (!idTransicion) {
        continue;
      }
      const condiciones = Array.isArray(transicion?.condiciones) ? transicion.condiciones : [];
      const porCampo: Record<string, EstadoCondicionDecision> = {};
      for (const condicion of condiciones) {
        const campo = String(condicion?.campo ?? '').trim();
        if (!campo) {
          continue;
        }
        const operador = String(condicion?.operador ?? '').trim().toUpperCase();
        if (operador && operador !== 'EXISTE') {
          continue;
        }
        porCampo[campo] = this.normalizarEstadoCondicion(condicion?.valor);
      }
      if (Object.keys(porCampo).length > 0) {
        nuevo[idTransicion] = porCampo;
      }
    }
    this.condicionesDecisionPorTransicion.update((actual) => ({ ...actual, ...nuevo }));
  }

  private nombreNodoPorId(nodoId: string): string {
    const xml = this.bpmnModelerXml();
    if (!xml) {
      return nodoId;
    }
    const regex = new RegExp(`<bpmn:(?:startEvent|task|exclusiveGateway|endEvent)[^>]*id="${nodoId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*name="([^"]*)"`, 'i');
    const match = xml.match(regex);
    const nombre = match?.[1] ?? '';
    return nombre.trim() || nodoId;
  }

  private enriquecerNodosConFormulariosActividad(nodos: any[]): any[] {
    const formularios = this.formulariosActividadPorNodo();
    return (nodos ?? []).map((nodo) => {
      const idNodo = String(nodo?.idNodo ?? '');
      if (!idNodo) {
        return nodo;
      }
      const formulario = formularios[idNodo];
      if (!formulario) {
        return { ...nodo, formularioActividad: null };
      }
      return { ...nodo, formularioActividad: formulario };
    });
  }

  private hidratarFormulariosActividadDesdeNodos(nodos: any[]): void {
    const mapa: Record<string, FormularioActividad> = {};
    for (const nodo of nodos ?? []) {
      const idNodo = String(nodo?.idNodo ?? '').trim();
      if (!idNodo) {
        continue;
      }
      const formulario = (nodo as any).formularioActividad;
      if (!formulario || typeof formulario !== 'object') {
        continue;
      }
      mapa[idNodo] = {
        nombreFormulario: String(formulario.nombreFormulario ?? ''),
        descripcion: String(formulario.descripcion ?? ''),
        versionInterna: Number(formulario.versionInterna ?? 0) || 0,
        activo: formulario.activo !== false,
        campos: Array.isArray(formulario.campos) ? (formulario.campos as CampoFormularioActividad[]) : [],
      };
    }
    if (Object.keys(mapa).length > 0) {
      this.formulariosActividadPorNodo.set(mapa);
      return;
    }

    const actuales = this.formulariosActividadPorNodo();
    if (Object.keys(actuales).length === 0) {
      this.formulariosActividadPorNodo.set({});
      return;
    }

    const idsEnNodos = new Set((nodos ?? []).map((nodo: any) => String(nodo?.idNodo ?? '')));
    const conservados: Record<string, FormularioActividad> = {};
    for (const [idNodo, formulario] of Object.entries(actuales)) {
      if (idsEnNodos.has(idNodo)) {
        conservados[idNodo] = formulario;
      }
    }
    this.formulariosActividadPorNodo.set(conservados);
  }

  private async sincronizarFormulariosActividadConNodosActuales(xml: string): Promise<void> {
    let parsed: { nodos: any[] } | null = null;
    try {
      parsed = await bpmnXmlToFlowPayload(xml);
    } catch {
      return;
    }
    const ids = new Set(((parsed?.nodos ?? []) as any[]).map((nodo) => String(nodo?.idNodo ?? '')));
    this.formulariosActividadPorNodo.update((actual) => {
      const limpio: Record<string, FormularioActividad> = {};
      for (const [id, formulario] of Object.entries(actual)) {
        if (ids.has(id)) {
          limpio[id] = formulario;
        }
      }
      return limpio;
    });
    const selectedNodoId = this.formularioActividadNodoId();
    if (selectedNodoId && !ids.has(selectedNodoId)) {
      this.cerrarFormularioActividadModal();
    }
  }

  private normalizarNombreTecnico(valor: string): string {
    const base = (valor ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return base || `campo_${Date.now()}`;
  }

  private formatearFechaHoraLocal(fecha: Date): string {
    try {
      return new Intl.DateTimeFormat('es-BO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(fecha);
    } catch {
      return fecha.toISOString();
    }
  }

  activarTab(tabId: DisenoTab): void {
    if (tabId === 'grafico' && !this.editorGraficoListo() && !this.selectedFlujoId()) {
      this.globalError.set('Primero crea o selecciona un flujo para abrir el editor grafico.');
      return;
    }
    this.activeTab.set(tabId);
    if (tabId === 'grafico' && !this.bpmnModelerXml()) {
      const raw = this.graficoForm.getRawValue();
      if (raw.tipoTramiteId && raw.nombre?.trim()) {
        this.generarPlantillaGrafica();
      }
    }
  }

  volverAFlujoBase(): void {
    this.activeTab.set('gestion');
    this.globalMessage.set('Volviste a la pantalla base de diseno de flujos.');
  }

  editorGraficoListo(): boolean {
    const raw = this.graficoForm.getRawValue();
    return Boolean(raw.tipoTramiteId && raw.nombre?.trim());
  }

  generarPlantillaGrafica(): void {
    this.globalError.set('');
    const raw = this.graficoForm.getRawValue();
    const nombreFlujo = raw.nombre?.trim() || 'Flujo nuevo';
    const activeDepartamentos = this.departamentosActivos().map((dep) => ({ id: dep.id, nombre: dep.nombre }));
    const lanes =
      activeDepartamentos.length > 0
        ? [activeDepartamentos[0]]
        : [
            { id: 'depto_1', nombre: 'Atencion al cliente' },
          ];
    this.graphLaneDepartmentIds.set(lanes.map((lane) => lane.id));

    const nodos: any[] = [];
    const transiciones: any[] = [];

    nodos.push({
      idNodo: 'nodo_inicio',
      tipoNodo: 'INICIO',
      nombre: 'Inicio',
      departamentoId: lanes[0].id,
      prioridad: 1,
      reglasNodo: [],
      posicionX: 220,
      posicionY: 140,
      esInicial: true,
      esFinal: false,
    });

    let prevNodeId = 'nodo_inicio';
    for (let i = 0; i < lanes.length; i += 1) {
      const lane = lanes[i];
      const nodeId = `nodo_act_${i + 1}`;
      nodos.push({
        idNodo: nodeId,
        tipoNodo: 'ACTIVIDAD',
        nombre: `Actividad ${i + 1} - ${lane.nombre}`,
        descripcion: `Actividad operativa del departamento ${lane.nombre}`,
        departamentoId: lane.id,
        prioridad: i + 1,
        reglasNodo: [],
        posicionX: 440 + i * 220,
        posicionY: 110 + i * 180,
        esInicial: false,
        esFinal: false,
      });
      transiciones.push({
        idTransicion: `trans_${prevNodeId}_${nodeId}`,
        nodoOrigenId: prevNodeId,
        nodoDestinoId: nodeId,
        nombre: 'Siguiente',
        condiciones: [],
        orden: transiciones.length + 1,
        activa: true,
      });
      prevNodeId = nodeId;
    }

    nodos.push({
      idNodo: 'nodo_decision',
      tipoNodo: 'DECISION',
      nombre: 'Decision',
      departamentoId: lanes[Math.max(0, lanes.length - 1)].id,
      prioridad: 99,
      reglasNodo: [],
      posicionX: 460 + lanes.length * 220,
      posicionY: 110 + Math.max(0, lanes.length - 1) * 180,
      esInicial: false,
      esFinal: false,
    });
    transiciones.push({
      idTransicion: `trans_${prevNodeId}_nodo_decision`,
      nodoOrigenId: prevNodeId,
      nodoDestinoId: 'nodo_decision',
      nombre: 'Evaluar',
      condiciones: [],
      orden: transiciones.length + 1,
      activa: true,
    });

    nodos.push({
      idNodo: 'nodo_fin',
      tipoNodo: 'FIN',
      nombre: 'Fin',
      departamentoId: lanes[Math.max(0, lanes.length - 1)].id,
      prioridad: 100,
      reglasNodo: [],
      posicionX: 680 + lanes.length * 220,
      posicionY: 120 + Math.max(0, lanes.length - 1) * 180,
      esInicial: false,
      esFinal: true,
    });
    transiciones.push({
      idTransicion: 'trans_nodo_decision_nodo_fin',
      nodoOrigenId: 'nodo_decision',
      nodoDestinoId: 'nodo_fin',
      nombre: 'Aprobar',
      condiciones: [],
      orden: transiciones.length + 1,
      activa: true,
    });

    const xml = flowToBpmnXml(nombreFlujo, nodos, transiciones, lanes);
    this.bpmnModelerXml.set(xml);
    this.globalMessage.set('Plantilla grafica generada con carriles por departamento.');
  }

  async agregarCarrilDesdeDepartamento(departamentoId: string): Promise<void> {
    this.globalError.set('');
    const exists = this.graphLaneDepartmentIds().includes(departamentoId);
    if (exists) {
      this.globalMessage.set('Ese departamento ya esta como carril.');
      return;
    }

    const dep = this.departamentosActivos().find((d) => d.id === departamentoId);
    if (!dep) {
      this.globalError.set('El departamento no esta activo o no existe.');
      return;
    }

    let nodos: any[] = [];
    let transiciones: any[] = [];
    const currentXml = this.bpmnModelerXml();
    if (currentXml) {
      try {
        const parsed = await bpmnXmlToFlowPayload(currentXml);
        nodos = parsed.nodos as any[];
        transiciones = parsed.transiciones as any[];
      } catch {
        nodos = [];
        transiciones = [];
      }
    }

    const nextLaneIds = [...this.graphLaneDepartmentIds(), departamentoId];
    this.graphLaneDepartmentIds.set(nextLaneIds);
    const lanes = nextLaneIds.map((id) => {
      const d = this.departamentosActivos().find((depItem) => depItem.id === id);
      return { id, nombre: d?.nombre ?? id };
    });
    const flowName = this.graficoForm.getRawValue().nombre || 'Flujo nuevo';
    const xml = flowToBpmnXml(flowName, nodos, transiciones, lanes);
    this.bpmnModelerXml.set(xml);
    this.globalMessage.set(`Carril agregado: ${dep.nombre}`);
  }

  crearDepartamentoRapido(): void {
    this.globalError.set('');
    if (this.crearDepartamentoRapidoForm.invalid) {
      this.crearDepartamentoRapidoForm.markAllAsTouched();
      this.globalError.set('Completa nombre y codigo del departamento.');
      return;
    }
    const raw = this.crearDepartamentoRapidoForm.getRawValue();
    this.departamentosAdminService
      .crearDepartamento({
        nombre: raw.nombre,
        codigo: raw.codigo,
        descripcion: raw.descripcion ?? '',
      })
      .subscribe({
        next: async (departamento) => {
          await this.cargarDepartamentos();
          this.showCrearDepartamentoModal.set(false);
          this.crearDepartamentoRapidoForm.reset({ nombre: '', codigo: '', descripcion: '' });
          await this.agregarCarrilDesdeDepartamento(departamento.id);
          this.globalMessage.set('Departamento creado y agregado al diagrama.');
        },
        error: (error: unknown) => {
          this.globalError.set(this.extraerMensajeError(error, 'No se pudo crear el departamento.'));
        },
      });
  }

  async agregarNodoInicio(): Promise<void> {
    await this.agregarNodoEditor('INICIO');
  }

  async agregarNodoFin(): Promise<void> {
    await this.agregarNodoEditor('FIN');
  }

  async agregarNodoActividad(): Promise<void> {
    await this.agregarNodoEditor('ACTIVIDAD');
  }

  async agregarNodoDecision(): Promise<void> {
    await this.agregarNodoEditor('DECISION');
  }

  private async agregarNodoEditor(tipo: 'INICIO' | 'FIN' | 'ACTIVIDAD' | 'DECISION'): Promise<void> {
    this.globalError.set('');
    const flowName = this.graficoForm.getRawValue().nombre || 'Flujo nuevo';
    let nodos: any[] = [];
    let transiciones: any[] = [];
    const currentXml = this.bpmnModelerXml();
    if (currentXml) {
      try {
        const parsed = await bpmnXmlToFlowPayload(currentXml);
        nodos = parsed.nodos as any[];
        transiciones = parsed.transiciones as any[];
      } catch {
        nodos = [];
        transiciones = [];
      }
    }

    if (tipo === 'INICIO' && nodos.some((n) => n.tipoNodo === 'INICIO')) {
      this.globalError.set('Solo se permite un nodo de inicio por flujo.');
      return;
    }
    if (tipo === 'FIN' && nodos.some((n) => n.tipoNodo === 'FIN')) {
      this.globalError.set('Solo se permite un nodo de fin por flujo.');
      return;
    }

    if (this.graphLaneDepartmentIds().length === 0) {
      this.globalError.set('Agrega al menos un departamento/carril antes de insertar nodos.');
      return;
    }

    let departamentoId = this.graphLaneDepartmentIds()[0];
    let nombreNodo = tipo === 'INICIO' ? 'Inicio' : tipo === 'FIN' ? 'Fin' : tipo === 'DECISION' ? 'Decision' : 'Actividad';
    if (tipo === 'ACTIVIDAD' || tipo === 'DECISION') {
      const seleccionado = this.nodoDepartamentoSeleccionado();
      if (!seleccionado) {
        this.globalError.set('Selecciona un departamento del diagrama para insertar actividad/decision.');
        return;
      }
      departamentoId = seleccionado;

      const nombreIngresado = this.nodoNombreSeleccionado().trim();
      if (!nombreIngresado) {
        this.globalError.set('Escribe el nombre antes de agregar actividad o decision.');
        return;
      }
      nombreNodo = nombreIngresado;
    }

    const laneIndex = Math.max(0, this.graphLaneDepartmentIds().findIndex((id) => id === departamentoId));
    const nodosLane = nodos.filter((n) => n.departamentoId === departamentoId);
    const maxX = nodosLane.length > 0
      ? Math.max(...nodosLane.map((n) => Number(n.posicionX ?? 200)))
      : Math.max(200, ...nodos.map((n) => Number(n.posicionX ?? 200)));
    const posX = maxX + 220;
    const posY = 110 + laneIndex * 180;

    const nextId = `nodo_${tipo.toLowerCase()}_${Date.now()}`;
    nodos.push({
      idNodo: nextId,
      tipoNodo: tipo,
      nombre: nombreNodo,
      descripcion: tipo === 'ACTIVIDAD' ? 'Actividad operativa.' : '',
      departamentoId,
      prioridad: nodos.length + 1,
      reglasNodo: [],
      posicionX: posX,
      posicionY: posY,
      esInicial: tipo === 'INICIO',
      esFinal: tipo === 'FIN',
    });

    const lanes = this.graphLaneDepartmentIds().map((id) => {
      const dep = this.departamentosActivos().find((d) => d.id === id);
      return { id, nombre: dep?.nombre ?? id };
    });
    const xml = flowToBpmnXml(flowName, nodos, transiciones, lanes);
    this.bpmnModelerXml.set(xml);
    if (tipo === 'ACTIVIDAD' || tipo === 'DECISION') {
      this.nodoNombreSeleccionado.set('');
    }
    this.globalMessage.set(`Nodo ${tipo.toLowerCase()} agregado.`);
  }

  async quitarCarril(departamentoId: string): Promise<void> {
    this.globalError.set('');
    this.globalMessage.set('');
    const laneIds = this.graphLaneDepartmentIds();
    if (!laneIds.includes(departamentoId)) {
      return;
    }
    if (laneIds.length <= 1) {
      this.globalError.set('Debe existir al menos un carril en el diagrama.');
      return;
    }

    const currentXml = this.bpmnModelerXml();
    if (!currentXml) {
      this.globalError.set('No hay diagrama para actualizar.');
      return;
    }

    let nodos: any[] = [];
    let transiciones: any[] = [];
    try {
      const parsed = await bpmnXmlToFlowPayload(currentXml);
      nodos = parsed.nodos as any[];
      transiciones = parsed.transiciones as any[];
    } catch {
      this.globalError.set('No se pudo leer el diagrama actual para quitar el carril.');
      return;
    }

    const remainingIds = laneIds.filter((id) => id !== departamentoId);
    const replacementId = remainingIds[0];
    nodos = nodos.map((nodo) =>
      nodo?.departamentoId === departamentoId ? { ...nodo, departamentoId: replacementId } : nodo,
    );

    const lanes = remainingIds.map((id) => {
      const dep = this.departamentosActivos().find((item) => item.id === id);
      return { id, nombre: dep?.nombre ?? id };
    });

    const flowName = this.graficoForm.getRawValue().nombre || 'Flujo nuevo';
    const xml = flowToBpmnXml(flowName, nodos, transiciones, lanes);
    this.graphLaneDepartmentIds.set(remainingIds);
    this.bpmnModelerXml.set(xml);
    const dep = this.departamentos().find((item) => item.id === departamentoId);
    this.globalMessage.set(`Carril quitado: ${dep?.nombre ?? departamentoId}`);
  }

  nombreTipoTramite(tipoTramiteId: string): string {
    const tipo = this.tiposTramite().find((item) => item.id === tipoTramiteId);
    return tipo ? tipo.nombre : tipoTramiteId;
  }

  private procesarResultadoConstructor(response: ResultadoConstruccionFlujoResponse, message: string): void {
    this.constructorResultado.set(response);
    this.globalMessage.set(message);
    this.loadingConstructores.set(false);
    this.cargarDepartamentos();
    this.cargarFlujos();
    this.seleccionarFlujo(response.flujoId);
    this.activeTab.set('grafico');
  }

  private cargarBpmnFlujoInterno(flujoId: string, nombreFlujo: string): void {
    this.flujosDisenoService.obtenerConfiguracion(flujoId).subscribe({
      next: (response) => {
        this.configuracionResultado.set(response);
        this.hidratarFormulariosActividadDesdeNodos((response.nodos ?? []) as any[]);
        this.hidratarCondicionesDecisionDesdeTransiciones((response.transiciones ?? []) as any[]);
        const bpmnXmlGuardado = (response.bpmnXml ?? '').trim();
        if (bpmnXmlGuardado.length > 0) {
          this.sincronizarCarrilesDesdeXml(bpmnXmlGuardado);
          this.errorGuardadoGrafico.set('');
          this.mensajeGuardadoGrafico.set('Diagrama cargado desde BPMN guardado.');
          this.bpmnViewerXml.set(bpmnXmlGuardado);
          this.bpmnModelerXml.set(bpmnXmlGuardado);
          return;
        }
        const nodos = (response.nodos ?? []) as any[];
        const transiciones = (response.transiciones ?? []) as any[];
        if (nodos.length === 0) {
          const xmlEnCache = this.obtenerBpmnDesdeCacheLocal(flujoId);
          if (xmlEnCache) {
            this.sincronizarCarrilesDesdeXml(xmlEnCache);
            this.errorGuardadoGrafico.set('');
            this.mensajeGuardadoGrafico.set('Configuracion vacia en backend. Se cargo la ultima version guardada localmente.');
            this.bpmnViewerXml.set(xmlEnCache);
            this.bpmnModelerXml.set(xmlEnCache);
            return;
          }
          this.errorGuardadoGrafico.set('Configuracion vacia. Intentando cargar visualizacion guardada...');
          this.mensajeGuardadoGrafico.set('');
          this.cargarVisualizacionFlujoInterno(flujoId, nombreFlujo);
          return;
        } else {
          this.errorGuardadoGrafico.set('');
        }
        const laneIds = new Set<string>();
        for (const nodo of nodos) {
          const depId = (nodo as any).departamentoId;
          if (depId) {
            laneIds.add(depId);
          }
        }
        if (laneIds.size > 0) {
          this.graphLaneDepartmentIds.set([...laneIds]);
        } else {
          this.graphLaneDepartmentIds.set(this.departamentosActivos().map((dep) => dep.id));
        }
        const lanes = this.graphLaneDepartmentIds().map((id) => {
          const dep = this.departamentosActivos().find((d) => d.id === id);
          return { id, nombre: dep?.nombre ?? id };
        });
        const xml = flowToBpmnXml(nombreFlujo, nodos, transiciones, lanes);
        this.guardarBpmnEnCacheLocal(flujoId, xml);
        this.bpmnViewerXml.set(xml);
        this.bpmnModelerXml.set(xml);
      },
      error: () => {
        this.cargarVisualizacionFlujoInterno(flujoId, nombreFlujo);
      },
    });
  }

  private cargarVisualizacionFlujoInterno(flujoId: string, nombreFlujo: string): void {
    this.flujosDisenoService.visualizarFlujo(flujoId).subscribe({
      next: (response) => {
        this.visualizacionResultado.set(response);
        this.actualizarBpmnDesdeVisualizacion(response, nombreFlujo);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo cargar el diagrama del flujo. Se mostrara una plantilla base.'));
        const xmlFallback = this.generarXmlBaseConCarriles(nombreFlujo);
        this.bpmnViewerXml.set(xmlFallback);
        this.bpmnModelerXml.set(xmlFallback);
      },
    });
  }

  private actualizarBpmnDesdeVisualizacion(response: FlujoVisualizacionResponse, fallbackName: string): void {
    const nodosVisualizacion = (response.nodos ?? []) as any[];
    const transicionesVisualizacion = (response.transiciones ?? []) as any[];
    this.hidratarFormulariosActividadDesdeNodos(nodosVisualizacion);
    this.hidratarCondicionesDecisionDesdeTransiciones(transicionesVisualizacion);
    if (nodosVisualizacion.length > 0) {
      this.errorGuardadoGrafico.set('');
      this.mensajeGuardadoGrafico.set(
        `Diagrama cargado desde visualizacion (${nodosVisualizacion.length} nodos).`,
      );
    }
    const laneIds = new Set<string>();
    for (const nodo of (response.nodos ?? []) as any[]) {
      const depId = (nodo as any).departamentoId;
      if (depId) {
        laneIds.add(depId);
      }
    }
    if (laneIds.size > 0) {
      this.graphLaneDepartmentIds.set([...laneIds]);
    } else {
      this.graphLaneDepartmentIds.set(this.departamentosActivos().map((dep) => dep.id));
    }
    const lanes = this.graphLaneDepartmentIds().map((id) => {
      const dep = this.departamentosActivos().find((d) => d.id === id);
      return { id, nombre: dep?.nombre ?? id };
    });
    const xml = flowToBpmnXml(
      response.nombre || fallbackName,
      nodosVisualizacion,
      transicionesVisualizacion,
      lanes,
    );
    const flujoId = this.selectedFlujoId();
    if (flujoId && (nodosVisualizacion.length > 0 || transicionesVisualizacion.length > 0)) {
      this.guardarBpmnEnCacheLocal(flujoId, xml);
    }
    this.bpmnViewerXml.set(xml);
    this.bpmnModelerXml.set(xml);
  }

  private sincronizarCarrilesDesdeXml(xml: string): void {
    const laneIds: string[] = [];
    const regex = /<bpmn:lane\b[^>]*\bid="lane_([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
      const id = match[1];
      if (id && !laneIds.includes(id)) {
        laneIds.push(id);
      }
    }
    this.graphLaneDepartmentIds.set(laneIds);
  }

  private generarXmlBaseConCarriles(nombreFlujo: string): string {
    const laneIds = this.graphLaneDepartmentIds();
    const lanes =
      laneIds.length > 0
        ? laneIds.map((id) => {
            const dep = this.departamentosActivos().find((d) => d.id === id);
            return { id, nombre: dep?.nombre ?? id };
          })
        : this.departamentosActivos().slice(0, 2).map((dep) => ({ id: dep.id, nombre: dep.nombre }));
    this.graphLaneDepartmentIds.set(lanes.map((lane) => lane.id));
    return flowToBpmnXml(nombreFlujo || 'Flujo nuevo', [], [], lanes);
  }

  private obtenerBpmnDesdeCacheLocal(flujoId: string): string | null {
    try {
      const key = `${DisenoFlujosPageComponent.BPMN_CACHE_PREFIX}${flujoId}`;
      const raw = localStorage.getItem(key);
      const xml = (raw ?? '').trim();
      return xml.length > 0 ? xml : null;
    } catch {
      return null;
    }
  }

  private guardarBpmnEnCacheLocal(flujoId: string, xml: string): void {
    try {
      const contenido = (xml ?? '').trim();
      if (!contenido) {
        return;
      }
      const key = `${DisenoFlujosPageComponent.BPMN_CACHE_PREFIX}${flujoId}`;
      localStorage.setItem(key, contenido);
    } catch {
      // Ignorar fallos de almacenamiento local para no romper la edicion.
    }
  }

  private async resolverTipoTramiteIdPorNombre(nombreRaw: string): Promise<string | null> {
    const nombre = (nombreRaw ?? '').trim();
    if (!nombre) {
      return null;
    }

    const normalizado = nombre.toLowerCase();
    const existente = this.tiposTramite().find((tipo) => tipo.nombre.trim().toLowerCase() === normalizado);
    if (existente) {
      return existente.id;
    }

    try {
      const creado = await firstValueFrom(
        this.flujosDisenoService.crearTipoTramite({
          nombre,
          descripcion: `Tipo de tramite creado desde Diseno de flujos (${nombre}).`,
          categoria: 'GENERAL',
        }),
      );
      this.tiposTramite.update((items) => [
        ...items,
        {
          id: creado.id,
          nombre: creado.nombre,
          categoria: creado.categoria,
          estadoTipoTramite: creado.estadoTipoTramite,
        },
      ]);
      return creado.id;
    } catch (error: unknown) {
      await this.cargarTiposTramite();
      const trasRecarga = this.tiposTramite().find((tipo) => tipo.nombre.trim().toLowerCase() === normalizado);
      if (trasRecarga) {
        return trasRecarga.id;
      }
      this.globalError.set(this.extraerMensajeError(error, 'No se pudo crear o resolver el tipo de tramite.'));
      return null;
    }
  }

  private parseConfiguracion(nodosJson: string, transicionesJson: string, reglasJson: string): {
    nodos: unknown[];
    transiciones: unknown[];
    reglas: unknown[];
  } | null {
    const nodos = this.parseJsonArray(nodosJson, 'nodos');
    const transiciones = this.parseJsonArray(transicionesJson, 'transiciones');
    const reglas = this.parseJsonArray(reglasJson, 'reglas globales');
    if (!nodos || !transiciones || !reglas) {
      return null;
    }
    return { nodos, transiciones, reglas };
  }

  private parseJsonArray(raw: string, label: string): unknown[] | null {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.globalError.set(`El campo ${label} debe ser un JSON array.`);
        return null;
      }
      return parsed;
    } catch {
      this.globalError.set(`El campo ${label} no tiene un JSON valido.`);
      return null;
    }
  }

  private pretty(value: unknown): string {
    return JSON.stringify(value ?? {}, null, 2);
  }

  formatearIdNodoVisible(id: string): string {
    const limpio = String(id ?? '').trim();
    if (!limpio) {
      return '-';
    }
    return limpio.replace(/_\d+$/, '');
  }

  private cargarTiposTramite(): Promise<void> {
    return new Promise((resolve) => {
      this.flujosDisenoService.listarTiposTramite().subscribe({
        next: (tipos) => {
          this.tiposTramite.set(tipos);
          resolve();
        },
        error: (error: unknown) => {
          this.globalError.set(this.extraerMensajeError(error, 'No se pudieron cargar tipos de tramite.'));
          resolve();
        },
      });
    });
  }

  private cargarFlujos(): Promise<void> {
    return new Promise((resolve) => {
      this.flujosDisenoService.listarFlujos().subscribe({
        next: (flujos) => {
          this.flujos.set(flujos);
          resolve();
        },
        error: (error: unknown) => {
          this.globalError.set(this.extraerMensajeError(error, 'No se pudieron cargar flujos.'));
          resolve();
        },
      });
    });
  }

  private cargarDepartamentos(): Promise<void> {
    return new Promise((resolve) => {
      this.flujosDisenoService.listarDepartamentos().subscribe({
        next: (departamentos) => {
          this.departamentos.set(departamentos);
          resolve();
        },
        error: (error: unknown) => {
          this.globalError.set(this.extraerMensajeError(error, 'No se pudieron cargar departamentos.'));
          resolve();
        },
      });
    });
  }

  private registrarAuditoriaUi(accion: string, descripcion: string, metadata: Record<string, unknown>): void {
    this.auditoriaUiService.registrar(accion, descripcion, metadata);
  }

  private extraerMensajeError(error: unknown, fallback: string): string {
    const httpError = error as HttpErrorResponse;
    const backendMessage =
      httpError?.error && typeof httpError.error === 'object' ? (httpError.error as { message?: string }).message : undefined;
    return backendMessage ?? fallback;
  }
}

