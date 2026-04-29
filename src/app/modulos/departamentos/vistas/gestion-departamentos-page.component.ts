import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';

import { AuthService } from '../../../nucleo/autenticacion/auth.service';
import {
  DepartamentosAdminService,
  type AsignacionDepartamentosResponse,
  type DepartamentoResponse,
  type EstadoDepartamentoAdmin,
} from '../../../nucleo/administracion/departamentos-admin.service';
import { type UsuarioResumenResponse, UsuariosAdminService } from '../../../nucleo/administracion/usuarios-admin.service';

@Component({
  selector: 'app-gestion-departamentos-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-5">
      <section class="rounded-2xl border border-violet-300/60 bg-white/85 p-6 dark:border-violet-500/20 dark:bg-violet-900/30">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Administracion</p>
        <h1 class="m-0 mt-1 text-3xl font-semibold text-violet-950 dark:text-violet-50">Gestion de departamentos</h1>
        <p class="m-0 mt-2 text-violet-700 dark:text-violet-200">
          Gestiona departamentos y asigna ejecutivos a las areas operativas en una sola pantalla.
        </p>
      </section>

      @if (globalError()) {
        <p class="rounded-xl border border-rose-300/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{{ globalError() }}</p>
      }
      @if (globalMessage()) {
        <p class="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">{{ globalMessage() }}</p>
      }

      <section class="flex flex-wrap gap-2">
        <button
          type="button"
          (click)="activeTab.set('departamentos')"
          class="rounded-xl border px-4 py-2 text-sm font-semibold transition"
          [class.border-violet-500]="activeTab() === 'departamentos'"
          [class.bg-violet-600]="activeTab() === 'departamentos'"
          [class.text-white]="activeTab() === 'departamentos'"
          [class.border-violet-300/70]="activeTab() !== 'departamentos'"
          [class.text-violet-800]="activeTab() !== 'departamentos'"
          [class.dark:text-violet-100]="activeTab() !== 'departamentos'"
        >
          Departamentos
        </button>
        <button
          type="button"
          (click)="activeTab.set('asignaciones')"
          class="rounded-xl border px-4 py-2 text-sm font-semibold transition"
          [class.border-violet-500]="activeTab() === 'asignaciones'"
          [class.bg-violet-600]="activeTab() === 'asignaciones'"
          [class.text-white]="activeTab() === 'asignaciones'"
          [class.border-violet-300/70]="activeTab() !== 'asignaciones'"
          [class.text-violet-800]="activeTab() !== 'asignaciones'"
          [class.dark:text-violet-100]="activeTab() !== 'asignaciones'"
        >
          Asignaciones
        </button>
      </section>

      @if (activeTab() === 'departamentos') {
        <section class="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
          <article class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
            <div class="mb-4 flex items-center justify-between gap-3">
              <h2 class="m-0 text-xl font-semibold text-violet-900 dark:text-violet-100">Departamentos</h2>
              <button
                type="button"
                (click)="cargarDepartamentos(); cargarAsignacionesEjecutivos()"
                [disabled]="loadingDepartamentos()"
                class="h-10 rounded-xl border border-violet-300/70 px-4 text-sm font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-60 dark:border-violet-400/30 dark:text-violet-100 dark:hover:bg-violet-800/35"
              >
                {{ loadingDepartamentos() ? 'Actualizando...' : 'Refrescar' }}
              </button>
            </div>

            <div class="space-y-2">
              @for (departamento of departamentos(); track departamento.id) {
                <button
                  type="button"
                  (click)="seleccionarDepartamento(departamento.id)"
                  class="w-full rounded-xl border p-3 text-left transition"
                  [class.border-violet-500]="departamento.id === selectedDepartamentoId()"
                  [class.bg-violet-100/70]="departamento.id === selectedDepartamentoId()"
                  [class.dark:bg-violet-700/25]="departamento.id === selectedDepartamentoId()"
                  [class.border-violet-200/70]="departamento.id !== selectedDepartamentoId()"
                  [class.dark:border-violet-400/20]="departamento.id !== selectedDepartamentoId()"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <strong class="text-sm text-violet-950 dark:text-violet-50">{{ departamento.nombre }}</strong>
                    <span
                      class="rounded-lg px-2 py-1 text-xs font-semibold"
                      [class.bg-emerald-600]="departamento.estadoDepartamento === 'ACTIVO'"
                      [class.text-white]="departamento.estadoDepartamento === 'ACTIVO'"
                      [class.bg-slate-500]="departamento.estadoDepartamento === 'INACTIVO'"
                      [class.text-white]="departamento.estadoDepartamento === 'INACTIVO'"
                    >
                      {{ departamento.estadoDepartamento }}
                    </span>
                  </div>
                  <p class="m-0 mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-violet-600 dark:text-violet-400">
                    Codigo: {{ departamento.codigo }}
                  </p>
                  <p class="m-0 mt-1 text-sm text-violet-700 dark:text-violet-300">{{ departamento.descripcion || 'Sin descripcion.' }}</p>
                  <p class="m-0 mt-2 text-xs text-violet-700 dark:text-violet-300">
                    Ejecutivos asignados:
                    <strong>{{ ejecutivosAsignadosA(departamento.id).length }}</strong>
                    @if (ejecutivosAsignadosA(departamento.id).length > 0) {
                      - {{ ejecutivosAsignadosA(departamento.id).join(', ') }}
                    }
                  </p>
                </button>
              } @empty {
                <p class="rounded-xl border border-violet-300/50 bg-violet-100/60 px-3 py-3 text-sm text-violet-800 dark:border-violet-400/20 dark:bg-violet-800/25 dark:text-violet-200">
                  No hay departamentos para mostrar.
                </p>
              }
            </div>
          </article>

          <article class="space-y-5">
            <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
              <h2 class="m-0 text-xl font-semibold text-violet-900 dark:text-violet-100">Registrar departamento</h2>
              <p class="m-0 mt-1 text-sm text-violet-700 dark:text-violet-300">Alta de nuevas areas operativas.</p>

              <form class="mt-4 space-y-3" [formGroup]="crearForm" (ngSubmit)="crearDepartamento()">
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Nombre</span>
                  <input formControlName="nombre" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50" />
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Codigo</span>
                  <input formControlName="codigo" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50" />
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Descripcion</span>
                  <textarea formControlName="descripcion" rows="3" class="w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 py-2 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50"></textarea>
                </label>
                <button
                  type="submit"
                  [disabled]="loadingCrearDepto()"
                  class="h-11 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-semibold text-white hover:brightness-110 disabled:opacity-60"
                >
                  {{ loadingCrearDepto() ? 'Creando...' : 'Crear departamento' }}
                </button>
              </form>
            </section>
          </article>
        </section>

        <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
          <h2 class="m-0 text-xl font-semibold text-violet-900 dark:text-violet-100">Editar departamento seleccionado</h2>
          <p class="m-0 mt-1 text-sm text-violet-700 dark:text-violet-300">Modificar datos y activar/desactivar.</p>

          @if (!selectedDepartamento()) {
            <p class="mt-4 rounded-xl border border-violet-300/50 bg-violet-100/50 px-4 py-3 text-sm text-violet-800 dark:border-violet-400/20 dark:bg-violet-800/25 dark:text-violet-200">
              Selecciona un departamento del listado para gestionarlo.
            </p>
          } @else {
            <div class="mt-4 grid gap-5 xl:grid-cols-[1fr_320px]">
              <form class="space-y-3" [formGroup]="editarForm" (ngSubmit)="guardarEdicionDepartamento()">
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Nombre</span>
                  <input formControlName="nombre" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50" />
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Codigo</span>
                  <input [value]="selectedDepartamento()!.codigo" disabled class="h-11 w-full rounded-xl border border-violet-200/80 bg-slate-100/80 px-3 text-slate-600 dark:border-violet-300/10 dark:bg-violet-950/60 dark:text-violet-300" />
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Descripcion</span>
                  <textarea formControlName="descripcion" rows="3" class="w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 py-2 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50"></textarea>
                </label>
                <button
                  type="submit"
                  [disabled]="loadingEditarDepto()"
                  class="h-11 w-full rounded-xl bg-violet-700 font-semibold text-white hover:bg-violet-600 disabled:opacity-60"
                >
                  {{ loadingEditarDepto() ? 'Guardando...' : 'Guardar cambios' }}
                </button>
              </form>

              <div class="space-y-3">
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Estado</span>
                  <select [formControl]="estadoDeptoForm.controls.estadoDepartamento" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50">
                    @for (estado of estadosDepartamento; track estado) {
                      <option [value]="estado">{{ estado }}</option>
                    }
                  </select>
                </label>
                <button
                  type="button"
                  (click)="guardarEstadoDepartamento()"
                  [disabled]="loadingEstadoDepto()"
                  class="h-10 w-full rounded-xl border border-violet-300/70 bg-violet-100/70 font-semibold text-violet-800 hover:bg-violet-200 disabled:opacity-60 dark:border-violet-400/20 dark:bg-violet-800/35 dark:text-violet-100"
                >
                  {{ loadingEstadoDepto() ? 'Actualizando estado...' : 'Guardar estado' }}
                </button>
              </div>
            </div>
          }
        </section>
      } @else {
        <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
          <h2 class="m-0 text-xl font-semibold text-violet-900 dark:text-violet-100">Asignar ejecutivo a departamentos</h2>
          <p class="m-0 mt-1 text-sm text-violet-700 dark:text-violet-300">
            Selecciona un usuario con rol EJECUTIVO y define en que departamentos activos podra operar.
          </p>

          <div class="mt-4 grid gap-5 xl:grid-cols-[320px_1fr]">
            <div class="space-y-2">
              <h3 class="m-0 text-sm font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">Ejecutivos</h3>
              @for (usuario of ejecutivos(); track usuario.id) {
                <button
                  type="button"
                  (click)="seleccionarEjecutivo(usuario.id)"
                  class="w-full rounded-xl border p-3 text-left transition"
                  [class.border-violet-500]="usuario.id === selectedEjecutivoId()"
                  [class.bg-violet-100/70]="usuario.id === selectedEjecutivoId()"
                  [class.dark:bg-violet-700/25]="usuario.id === selectedEjecutivoId()"
                  [class.border-violet-200/70]="usuario.id !== selectedEjecutivoId()"
                  [class.dark:border-violet-400/20]="usuario.id !== selectedEjecutivoId()"
                >
                  <strong class="block text-sm text-violet-950 dark:text-violet-50">{{ usuario.nombreCompleto }}</strong>
                  <span class="text-xs text-violet-700 dark:text-violet-300">{{ usuario.correo }}</span>
                </button>
              } @empty {
                <p class="rounded-xl border border-amber-300/40 bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
                  No hay usuarios EJECUTIVO disponibles.
                </p>
              }
            </div>

            <div>
              @if (!selectedEjecutivoId()) {
                <p class="rounded-xl border border-violet-300/50 bg-violet-100/50 px-4 py-3 text-sm text-violet-800 dark:border-violet-400/20 dark:bg-violet-800/25 dark:text-violet-200">
                  Selecciona un ejecutivo para ver o editar su asignacion.
                </p>
              } @else {
                <div class="space-y-3">
                  <h3 class="m-0 text-sm font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">Departamentos activos</h3>
                  <div class="grid gap-2 sm:grid-cols-2">
                    @for (departamento of departamentosActivos(); track departamento.id) {
                      <button
                        type="button"
                        (click)="toggleDepartamentoAsignacion(departamento.id)"
                        class="rounded-xl border px-3 py-2 text-left text-sm transition"
                        [class.border-violet-500]="isDepartamentoAsignado(departamento.id)"
                        [class.bg-violet-600]="isDepartamentoAsignado(departamento.id)"
                        [class.text-white]="isDepartamentoAsignado(departamento.id)"
                        [class.border-violet-300/60]="!isDepartamentoAsignado(departamento.id)"
                        [class.text-violet-800]="!isDepartamentoAsignado(departamento.id)"
                        [class.dark:text-violet-100]="!isDepartamentoAsignado(departamento.id)"
                      >
                        <span class="block font-semibold">{{ departamento.nombre }}</span>
                        <span class="text-xs opacity-90">{{ departamento.codigo }}</span>
                      </button>
                    } @empty {
                      <p class="rounded-xl border border-amber-300/40 bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
                        No existen departamentos activos para asignar.
                      </p>
                    }
                  </div>

                  @if (asignacionActual()) {
                    <p class="text-xs text-violet-700 dark:text-violet-300">
                      Asignacion actual: {{ asignacionActual()!.departamentoIds.length }} departamento(s).
                    </p>
                  }

                  <button
                    type="button"
                    (click)="guardarAsignacion()"
                    [disabled]="loadingAsignacion()"
                    class="h-11 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-semibold text-white hover:brightness-110 disabled:opacity-60"
                  >
                    {{ loadingAsignacion() ? 'Guardando asignacion...' : 'Guardar asignacion departamental' }}
                  </button>
                </div>
              }
            </div>
          </div>

          <hr class="my-5 border-violet-300/40 dark:border-violet-500/20" />

          <div class="space-y-3">
            <h3 class="m-0 text-sm font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
              Departamentos y ejecutivos asignados
            </h3>
            <div class="space-y-3">
              @for (departamento of departamentos(); track departamento.id) {
                <article class="rounded-xl border border-violet-300/50 bg-white/70 p-3 dark:border-violet-400/20 dark:bg-violet-900/30">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p class="m-0 text-sm font-semibold text-violet-900 dark:text-violet-100">{{ departamento.nombre }}</p>
                      <p class="m-0 text-xs text-violet-700 dark:text-violet-300">{{ departamento.codigo }} - {{ departamento.estadoDepartamento }}</p>
                    </div>
                    <button
                      type="button"
                      (click)="iniciarAgregarEjecutivo(departamento.id)"
                      [disabled]="departamento.estadoDepartamento !== 'ACTIVO'"
                      class="h-9 rounded-lg border border-violet-300/70 px-3 text-xs font-semibold text-violet-800 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-400/30 dark:text-violet-100 dark:hover:bg-violet-800/35"
                    >
                      Anadir ejecutivo
                    </button>
                  </div>

                  <p class="m-0 mt-2 text-xs text-violet-700 dark:text-violet-300">
                    Ejecutivos:
                    @if (ejecutivosAsignadosA(departamento.id).length === 0) {
                      <span>Ninguno</span>
                    } @else {
                      <span>{{ ejecutivosAsignadosA(departamento.id).join(', ') }}</span>
                    }
                  </p>

                  @if (addingDepartamentoId() === departamento.id) {
                    <div class="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                      <select
                        [value]="ejecutivoParaAgregarId()"
                        (change)="ejecutivoParaAgregarId.set($any($event.target).value)"
                        class="h-10 w-full rounded-lg border border-violet-300/60 bg-white/90 px-3 text-sm text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50"
                      >
                        @for (ejecutivo of ejecutivosNoAsignadosA(departamento.id); track ejecutivo.id) {
                          <option [value]="ejecutivo.id">{{ ejecutivo.nombreCompleto }}</option>
                        }
                      </select>
                      <button
                        type="button"
                        (click)="confirmarAgregarEjecutivo(departamento.id)"
                        [disabled]="loadingAgregarEjecutivo() || ejecutivosNoAsignadosA(departamento.id).length === 0"
                        class="h-10 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                      >
                        {{ loadingAgregarEjecutivo() ? 'Guardando...' : 'Agregar' }}
                      </button>
                      <button
                        type="button"
                        (click)="cancelarAgregarEjecutivo()"
                        class="h-10 rounded-lg border border-violet-300/70 px-3 text-xs font-semibold text-violet-800 hover:bg-violet-100 dark:border-violet-400/30 dark:text-violet-100 dark:hover:bg-violet-800/35"
                      >
                        Cancelar
                      </button>
                    </div>
                    @if (ejecutivosNoAsignadosA(departamento.id).length === 0) {
                      <p class="m-0 mt-2 text-xs text-amber-300">Todos los ejecutivos ya estan asignados a este departamento.</p>
                    }
                  }
                </article>
              } @empty {
                <p class="rounded-xl border border-violet-300/50 bg-violet-100/60 px-3 py-3 text-sm text-violet-800 dark:border-violet-400/20 dark:bg-violet-800/25 dark:text-violet-200">
                  No hay departamentos para mostrar.
                </p>
              }
            </div>
          </div>
        </section>
      }

      @if (showConfirmacionModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/45 p-4">
          <section class="w-full max-w-lg rounded-2xl border border-violet-300/60 bg-white p-5 shadow-2xl dark:border-violet-500/20 dark:bg-violet-950">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">{{ confirmacionModalTitulo() }}</h3>
                <p class="m-0 mt-1 text-sm text-violet-700 dark:text-violet-300">{{ confirmacionModalMensaje() }}</p>
              </div>
              <button
                type="button"
                (click)="cancelarConfirmacionModal()"
                class="rounded-lg border border-violet-300/70 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-400/30 dark:text-violet-100 dark:hover:bg-violet-800/35"
              >
                Cerrar
              </button>
            </div>

            <div class="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                (click)="cancelarConfirmacionModal()"
                class="h-10 rounded-xl border border-violet-300/70 px-3 text-sm font-semibold text-violet-800 hover:bg-violet-100 dark:border-violet-400/30 dark:text-violet-100 dark:hover:bg-violet-800/35"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirmarAccionModal()"
                class="h-10 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 text-sm font-semibold text-white hover:brightness-110"
              >
                {{ confirmacionModalTextoConfirmar() }}
              </button>
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class GestionDepartamentosPageComponent implements OnInit {
  readonly activeTab = signal<'departamentos' | 'asignaciones'>('departamentos');
  readonly estadosDepartamento: EstadoDepartamentoAdmin[] = ['ACTIVO', 'INACTIVO'];

  readonly departamentos = signal<DepartamentoResponse[]>([]);
  readonly selectedDepartamentoId = signal<string | null>(null);
  readonly selectedDepartamento = signal<DepartamentoResponse | null>(null);

  readonly usuarios = signal<UsuarioResumenResponse[]>([]);
  readonly selectedEjecutivoId = signal<string | null>(null);
  readonly asignacionActual = signal<AsignacionDepartamentosResponse | null>(null);
  readonly asignacionSeleccion = signal<string[]>([]);
  readonly asignacionesPorUsuario = signal<Record<string, string[]>>({});
  readonly addingDepartamentoId = signal<string | null>(null);
  readonly ejecutivoParaAgregarId = signal('');

  readonly loadingDepartamentos = signal(false);
  readonly loadingCrearDepto = signal(false);
  readonly loadingEditarDepto = signal(false);
  readonly loadingEstadoDepto = signal(false);
  readonly loadingUsuarios = signal(false);
  readonly loadingAsignacion = signal(false);
  readonly loadingAgregarEjecutivo = signal(false);

  readonly globalError = signal('');
  readonly globalMessage = signal('');
  readonly showConfirmacionModal = signal(false);
  readonly confirmacionModalTitulo = signal('');
  readonly confirmacionModalMensaje = signal('');
  readonly confirmacionModalTextoConfirmar = signal('Confirmar');
  readonly confirmacionModalAccion = signal<'estado_departamento' | 'asignacion_departamental' | null>(null);

  readonly ejecutivos = computed(() => this.usuarios().filter((usuario) => usuario.rol === 'EJECUTIVO'));
  readonly departamentosActivos = computed(() =>
    this.departamentos().filter((departamento) => departamento.estadoDepartamento === 'ACTIVO'),
  );

  readonly crearForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required]],
    codigo: ['', [Validators.required]],
    descripcion: [''],
  });

  readonly editarForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
  });

  readonly estadoDeptoForm = this.formBuilder.nonNullable.group({
    estadoDepartamento: ['ACTIVO' as EstadoDepartamentoAdmin, [Validators.required]],
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly departamentosAdminService: DepartamentosAdminService,
    private readonly usuariosAdminService: UsuariosAdminService,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const usuario = this.authService.getUsuarioSesion();
    if (!usuario || usuario.rol !== 'ADMINISTRADOR') {
      this.globalError.set('Esta pantalla solo esta disponible para rol ADMINISTRADOR.');
      this.router.navigateByUrl('/dashboard');
      return;
    }
    this.cargarDepartamentos();
    this.cargarUsuarios();
  }

  cargarDepartamentos(): void {
    this.loadingDepartamentos.set(true);
    this.globalError.set('');
    this.departamentosAdminService.listarDepartamentos().subscribe({
      next: (departamentos) => {
        this.departamentos.set(departamentos);
        if (this.selectedDepartamentoId()) {
          const vigente = departamentos.find((d) => d.id === this.selectedDepartamentoId());
          if (!vigente) {
            this.selectedDepartamentoId.set(null);
            this.selectedDepartamento.set(null);
          }
        }
        this.loadingDepartamentos.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo cargar la lista de departamentos.'));
        this.loadingDepartamentos.set(false);
      },
    });
  }

  cargarUsuarios(): void {
    this.loadingUsuarios.set(true);
    this.usuariosAdminService.listarUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.cargarAsignacionesEjecutivos();
        if (this.selectedEjecutivoId() && !usuarios.some((u) => u.id === this.selectedEjecutivoId())) {
          this.selectedEjecutivoId.set(null);
          this.asignacionActual.set(null);
          this.asignacionSeleccion.set([]);
        }
        this.loadingUsuarios.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo cargar el listado de usuarios.'));
        this.loadingUsuarios.set(false);
      },
    });
  }

  seleccionarDepartamento(departamentoId: string): void {
    this.globalError.set('');
    this.globalMessage.set('');
    this.selectedDepartamentoId.set(departamentoId);
    this.departamentosAdminService.obtenerDepartamento(departamentoId).subscribe({
      next: (departamento) => this.cargarDepartamentoSeleccionado(departamento),
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo cargar el detalle del departamento.'));
      },
    });
  }

  crearDepartamento(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    if (this.crearForm.invalid) {
      this.crearForm.markAllAsTouched();
      this.globalError.set('Completa los campos requeridos para registrar el departamento.');
      return;
    }

    this.loadingCrearDepto.set(true);
    this.departamentosAdminService.crearDepartamento(this.crearForm.getRawValue()).subscribe({
      next: (departamento) => {
        this.globalMessage.set('La operacion fue realizada correctamente.');
        this.crearForm.reset({ nombre: '', codigo: '', descripcion: '' });
        this.cargarDepartamentos();
        this.seleccionarDepartamento(departamento.id);
        this.loadingCrearDepto.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo crear el departamento.'));
        this.loadingCrearDepto.set(false);
      },
    });
  }

  guardarEdicionDepartamento(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const departamentoId = this.selectedDepartamentoId();
    if (!departamentoId) {
      this.globalError.set('Selecciona un departamento para editar.');
      return;
    }
    if (this.editarForm.invalid) {
      this.editarForm.markAllAsTouched();
      this.globalError.set('Completa los campos obligatorios del departamento.');
      return;
    }

    this.loadingEditarDepto.set(true);
    this.departamentosAdminService.actualizarDepartamento(departamentoId, this.editarForm.getRawValue()).subscribe({
      next: (departamento) => {
        this.globalMessage.set('La operacion fue realizada correctamente.');
        this.cargarDepartamentoSeleccionado(departamento);
        this.cargarDepartamentos();
        this.loadingEditarDepto.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo actualizar el departamento.'));
        this.loadingEditarDepto.set(false);
      },
    });
  }

  guardarEstadoDepartamento(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const departamentoId = this.selectedDepartamentoId();
    if (!departamentoId) {
      this.globalError.set('Selecciona un departamento para actualizar su estado.');
      return;
    }
    this.abrirConfirmacionModal(
      'estado_departamento',
      'Confirmar cambio de estado',
      'Confirma que deseas actualizar el estado del departamento seleccionado.',
      'Guardar estado',
    );
  }

  seleccionarEjecutivo(usuarioId: string): void {
    this.globalError.set('');
    this.globalMessage.set('');
    this.selectedEjecutivoId.set(usuarioId);
    this.departamentosAdminService.obtenerAsignacion(usuarioId).subscribe({
      next: (asignacion) => {
        this.asignacionActual.set(asignacion);
        this.asignacionSeleccion.set([...asignacion.departamentoIds]);
        this.asignacionesPorUsuario.update((actual) => ({ ...actual, [usuarioId]: [...asignacion.departamentoIds] }));
      },
      error: (error: unknown) => {
        this.asignacionActual.set(null);
        this.asignacionSeleccion.set([]);
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo cargar la asignacion del ejecutivo.'));
      },
    });
  }

  toggleDepartamentoAsignacion(departamentoId: string): void {
    const actual = this.asignacionSeleccion();
    const siguiente = actual.includes(departamentoId)
      ? actual.filter((id) => id !== departamentoId)
      : [...actual, departamentoId];
    this.asignacionSeleccion.set(siguiente);
  }

  isDepartamentoAsignado(departamentoId: string): boolean {
    return this.asignacionSeleccion().includes(departamentoId);
  }

  guardarAsignacion(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const usuarioId = this.selectedEjecutivoId();
    if (!usuarioId) {
      this.globalError.set('Selecciona un ejecutivo para guardar su asignacion.');
      return;
    }
    if (this.asignacionSeleccion().length === 0) {
      this.globalError.set('Debes seleccionar al menos un departamento activo.');
      return;
    }
    this.abrirConfirmacionModal(
      'asignacion_departamental',
      'Confirmar asignacion',
      'Confirma la asignacion de departamentos para el ejecutivo seleccionado.',
      'Guardar asignacion',
    );
  }

  confirmarAccionModal(): void {
    const accion = this.confirmacionModalAccion();
    this.cancelarConfirmacionModal();

    if (accion === 'estado_departamento') {
      const departamentoId = this.selectedDepartamentoId();
      if (departamentoId) {
        this.ejecutarGuardarEstadoDepartamento(departamentoId);
      }
      return;
    }

    if (accion === 'asignacion_departamental') {
      const usuarioId = this.selectedEjecutivoId();
      if (usuarioId) {
        this.ejecutarGuardarAsignacion(usuarioId);
      }
    }
  }

  cancelarConfirmacionModal(): void {
    this.showConfirmacionModal.set(false);
    this.confirmacionModalAccion.set(null);
    this.confirmacionModalTitulo.set('');
    this.confirmacionModalMensaje.set('');
    this.confirmacionModalTextoConfirmar.set('Confirmar');
  }

  iniciarAgregarEjecutivo(departamentoId: string): void {
    this.addingDepartamentoId.set(departamentoId);
    const candidatos = this.ejecutivosNoAsignadosA(departamentoId);
    this.ejecutivoParaAgregarId.set(candidatos[0]?.id ?? '');
  }

  cancelarAgregarEjecutivo(): void {
    this.addingDepartamentoId.set(null);
    this.ejecutivoParaAgregarId.set('');
  }

  confirmarAgregarEjecutivo(departamentoId: string): void {
    this.globalError.set('');
    this.globalMessage.set('');

    const ejecutivoId = this.ejecutivoParaAgregarId();
    if (!ejecutivoId) {
      this.globalError.set('Selecciona un ejecutivo para agregar.');
      return;
    }

    const asignaciones = this.asignacionesPorUsuario();
    const actuales = asignaciones[ejecutivoId] ?? [];
    if (actuales.includes(departamentoId)) {
      this.globalError.set('Ese ejecutivo ya esta asignado a este departamento.');
      return;
    }

    this.loadingAgregarEjecutivo.set(true);
    this.departamentosAdminService
      .asignarDepartamentos(ejecutivoId, { departamentoIds: [...actuales, departamentoId] })
      .subscribe({
        next: (asignacion) => {
          this.asignacionesPorUsuario.update((actual) => ({ ...actual, [ejecutivoId]: [...asignacion.departamentoIds] }));
          if (this.selectedEjecutivoId() === ejecutivoId) {
            this.asignacionActual.set(asignacion);
            this.asignacionSeleccion.set([...asignacion.departamentoIds]);
          }
          this.globalMessage.set('Ejecutivo agregado al departamento correctamente.');
          this.loadingAgregarEjecutivo.set(false);
          this.cancelarAgregarEjecutivo();
        },
        error: (error: unknown) => {
          this.globalError.set(this.extraerMensajeError(error, 'No se pudo agregar el ejecutivo al departamento.'));
          this.loadingAgregarEjecutivo.set(false);
        },
      });
  }

  ejecutivosAsignadosA(departamentoId: string): string[] {
    const asignaciones = this.asignacionesPorUsuario();
    return this.ejecutivos()
      .filter((ejecutivo) => (asignaciones[ejecutivo.id] ?? []).includes(departamentoId))
      .map((ejecutivo) => ejecutivo.nombreCompleto);
  }

  ejecutivosNoAsignadosA(departamentoId: string): UsuarioResumenResponse[] {
    const asignaciones = this.asignacionesPorUsuario();
    return this.ejecutivos().filter((ejecutivo) => !(asignaciones[ejecutivo.id] ?? []).includes(departamentoId));
  }

  cargarAsignacionesEjecutivos(): void {
    const ejecutivos = this.ejecutivos();
    if (ejecutivos.length === 0) {
      this.asignacionesPorUsuario.set({});
      return;
    }

    const peticiones = ejecutivos.map((ejecutivo) =>
      this.departamentosAdminService.obtenerAsignacion(ejecutivo.id).pipe(
        map((asignacion) => ({ usuarioId: ejecutivo.id, departamentoIds: asignacion.departamentoIds })),
        catchError(() => of({ usuarioId: ejecutivo.id, departamentoIds: [] as string[] })),
      ),
    );

    forkJoin(peticiones).subscribe((resultados) => {
      const mapa: Record<string, string[]> = {};
      for (const resultado of resultados) {
        mapa[resultado.usuarioId] = resultado.departamentoIds;
      }
      this.asignacionesPorUsuario.set(mapa);
    });
  }

  private cargarDepartamentoSeleccionado(departamento: DepartamentoResponse): void {
    this.selectedDepartamento.set(departamento);
    this.editarForm.patchValue({
      nombre: departamento.nombre ?? '',
      descripcion: departamento.descripcion ?? '',
    });
    this.estadoDeptoForm.patchValue({ estadoDepartamento: departamento.estadoDepartamento });
  }

  private abrirConfirmacionModal(
    accion: 'estado_departamento' | 'asignacion_departamental',
    titulo: string,
    mensaje: string,
    textoConfirmar: string,
  ): void {
    this.confirmacionModalAccion.set(accion);
    this.confirmacionModalTitulo.set(titulo);
    this.confirmacionModalMensaje.set(mensaje);
    this.confirmacionModalTextoConfirmar.set(textoConfirmar);
    this.showConfirmacionModal.set(true);
  }

  private ejecutarGuardarEstadoDepartamento(departamentoId: string): void {
    this.loadingEstadoDepto.set(true);
    this.departamentosAdminService
      .cambiarEstadoDepartamento(departamentoId, this.estadoDeptoForm.getRawValue())
      .subscribe({
        next: (response) => {
          this.globalMessage.set(response.mensaje);
          this.seleccionarDepartamento(departamentoId);
          this.cargarDepartamentos();
          this.loadingEstadoDepto.set(false);
        },
        error: (error: unknown) => {
          this.globalError.set(this.extraerMensajeError(error, 'No se pudo actualizar el estado del departamento.'));
          this.loadingEstadoDepto.set(false);
        },
      });
  }

  private ejecutarGuardarAsignacion(usuarioId: string): void {
    this.loadingAsignacion.set(true);
    this.departamentosAdminService
      .asignarDepartamentos(usuarioId, { departamentoIds: this.asignacionSeleccion() })
      .subscribe({
        next: (asignacion) => {
          this.asignacionActual.set(asignacion);
          this.asignacionSeleccion.set([...asignacion.departamentoIds]);
          this.asignacionesPorUsuario.update((actual) => ({ ...actual, [usuarioId]: [...asignacion.departamentoIds] }));
          this.globalMessage.set('La operacion fue realizada correctamente.');
          this.loadingAsignacion.set(false);
        },
        error: (error: unknown) => {
          this.globalError.set(this.extraerMensajeError(error, 'No se pudo guardar la asignacion departamental.'));
          this.loadingAsignacion.set(false);
        },
      });
  }

  private extraerMensajeError(error: unknown, fallback: string): string {
    const httpError = error as HttpErrorResponse;
    const backendMessage =
      httpError?.error && typeof httpError.error === 'object' ? (httpError.error as { message?: string }).message : undefined;
    return backendMessage ?? fallback;
  }
}
