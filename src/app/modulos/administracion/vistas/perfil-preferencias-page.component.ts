import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  type CanalNotificacion,
  type FrecuenciaNotificacion,
  PerfilPreferenciasService,
  type PreferenciasNotificacionResponse,
  type TipoNotificacion,
} from '../../../nucleo/administracion/perfil-preferencias.service';

@Component({
  selector: 'app-perfil-preferencias-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-5">
      <section class="rounded-2xl border border-violet-300/60 bg-white/85 p-6 dark:border-violet-500/20 dark:bg-violet-900/30">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Administracion</p>
        <h1 class="m-0 mt-1 text-3xl font-semibold text-violet-950 dark:text-violet-50">Perfil y notificaciones</h1>
        <p class="m-0 mt-2 text-violet-700 dark:text-violet-200">
          Gestiona tus datos personales y configura como recibir alertas del sistema.
        </p>
      </section>

      <section class="space-y-5">
        <article class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
          <h2 class="m-0 text-xl font-semibold text-violet-900 dark:text-violet-100">Perfil propio</h2>
          <p class="m-0 mt-1 text-sm text-violet-700 dark:text-violet-300">Actualiza tu informacion principal.</p>

          <form class="mt-4 space-y-4" [formGroup]="perfilForm" (ngSubmit)="guardarPerfil()">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Nombres</span>
                <input
                  formControlName="nombres"
                  class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50"
                />
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Apellidos</span>
                <input
                  formControlName="apellidos"
                  class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50"
                />
              </label>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Telefono</span>
                <input
                  formControlName="telefono"
                  class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50"
                />
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Correo (solo lectura)</span>
                <input
                  [value]="correoUsuario()"
                  disabled
                  class="h-11 w-full rounded-xl border border-violet-200/80 bg-slate-100/80 px-3 text-slate-600 dark:border-violet-300/10 dark:bg-violet-950/60 dark:text-violet-300"
                />
              </label>
            </div>

            <label class="space-y-1 text-sm">
              <span class="font-medium text-violet-800 dark:text-violet-100">Direccion</span>
              <input
                formControlName="direccion"
                class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50"
              />
            </label>

            @if (perfilMensaje()) {
              <p class="rounded-xl border border-emerald-300/50 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100">{{ perfilMensaje() }}</p>
            }
            @if (perfilError()) {
              <p class="rounded-xl border border-rose-300/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{{ perfilError() }}</p>
            }

            <button
              type="submit"
              [disabled]="perfilLoading()"
              class="h-11 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              {{ perfilLoading() ? 'Guardando...' : 'Guardar perfil' }}
            </button>
          </form>

          <hr class="my-5 border-violet-300/40 dark:border-violet-500/20" />

          <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Cambiar contrasena</h3>
          <form class="mt-4 space-y-4" [formGroup]="contrasenaForm" (ngSubmit)="guardarContrasena()">
            <label class="space-y-1 text-sm">
              <span class="font-medium text-violet-800 dark:text-violet-100">Contrasena actual</span>
              <input
                type="password"
                formControlName="contrasenaActual"
                class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50"
              />
            </label>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Nueva contrasena</span>
                <input
                  type="password"
                  formControlName="nuevaContrasena"
                  class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50"
                />
              </label>
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Confirmar nueva contrasena</span>
                <input
                  type="password"
                  formControlName="confirmacionNuevaContrasena"
                  class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50"
                />
              </label>
            </div>

            @if (contrasenaMensaje()) {
              <p class="rounded-xl border border-emerald-300/50 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100">{{ contrasenaMensaje() }}</p>
            }
            @if (contrasenaError()) {
              <p class="rounded-xl border border-rose-300/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{{ contrasenaError() }}</p>
            }

            <button
              type="submit"
              [disabled]="contrasenaLoading()"
              class="h-11 w-full rounded-xl bg-violet-700 font-semibold text-white hover:bg-violet-600 disabled:opacity-60"
            >
              {{ contrasenaLoading() ? 'Actualizando...' : 'Actualizar contrasena' }}
            </button>
          </form>
        </article>

        <article class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
          <h2 class="m-0 text-xl font-semibold text-violet-900 dark:text-violet-100">Preferencias de notificacion</h2>
          <p class="m-0 mt-1 text-sm text-violet-700 dark:text-violet-300">Canales, tipo de avisos y frecuencia.</p>

          @if (!preferenciasDisponibles()) {
            <div class="mt-4 rounded-xl border border-amber-300/40 bg-amber-500/15 p-3 text-sm text-amber-200">
              Tu rol actual no tiene configuracion de preferencias en este backend.
            </div>
          } @else {
            <form class="mt-4 space-y-4" [formGroup]="preferenciasForm" (ngSubmit)="guardarPreferencias()">
              <div class="space-y-2">
                <p class="m-0 text-sm font-medium text-violet-800 dark:text-violet-100">Canales habilitados</p>
                <div class="grid gap-2 sm:grid-cols-3">
                  @for (canal of canalesOptions; track canal.value) {
                    <button
                      type="button"
                      (click)="toggleCanal(canal.value)"
                      class="rounded-xl border px-3 py-2 text-sm"
                      [class.border-violet-500]="isCanalSelected(canal.value)"
                      [class.bg-violet-600]="isCanalSelected(canal.value)"
                      [class.text-white]="isCanalSelected(canal.value)"
                      [class.border-violet-300/50]="!isCanalSelected(canal.value)"
                      [class.text-violet-800]="!isCanalSelected(canal.value)"
                      [class.dark:text-violet-100]="!isCanalSelected(canal.value)"
                    >
                      {{ canal.label }}
                    </button>
                  }
                </div>
              </div>

              <div class="space-y-2">
                <p class="m-0 text-sm font-medium text-violet-800 dark:text-violet-100">Tipos de notificacion</p>
                <div class="grid gap-2 sm:grid-cols-2">
                  @for (tipo of tiposOptions; track tipo.value) {
                    <button
                      type="button"
                      (click)="toggleTipo(tipo.value)"
                      class="rounded-xl border px-3 py-2 text-sm text-left"
                      [class.border-violet-500]="isTipoSelected(tipo.value)"
                      [class.bg-violet-600]="isTipoSelected(tipo.value)"
                      [class.text-white]="isTipoSelected(tipo.value)"
                      [class.border-violet-300/50]="!isTipoSelected(tipo.value)"
                      [class.text-violet-800]="!isTipoSelected(tipo.value)"
                      [class.dark:text-violet-100]="!isTipoSelected(tipo.value)"
                    >
                      {{ tipo.label }}
                    </button>
                  }
                </div>
              </div>

              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Frecuencia</span>
                <select
                  formControlName="frecuencia"
                  class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50"
                >
                  @for (frecuencia of frecuenciaOptions; track frecuencia.value) {
                    <option [value]="frecuencia.value">{{ frecuencia.label }}</option>
                  }
                </select>
              </label>

              <label class="flex items-center gap-2 text-sm text-violet-800 dark:text-violet-100">
                <input type="checkbox" formControlName="agruparNoCriticas" class="h-4 w-4 rounded border-violet-400" />
                Agrupar no criticas
              </label>

              <p class="text-xs text-violet-600 dark:text-violet-300">
                Recibir obligatorias:
                <strong>{{ recibirObligatorias() ? 'SI' : 'NO' }}</strong>
              </p>

              @if (preferenciasMensaje()) {
                <p class="rounded-xl border border-emerald-300/50 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100">{{ preferenciasMensaje() }}</p>
              }
              @if (preferenciasError()) {
                <p class="rounded-xl border border-rose-300/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{{ preferenciasError() }}</p>
              }

              <button
                type="submit"
                [disabled]="preferenciasLoading()"
                class="h-11 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                {{ preferenciasLoading() ? 'Guardando...' : 'Guardar preferencias' }}
              </button>
            </form>
          }
        </article>
      </section>
    </div>
  `,
})
export class PerfilPreferenciasPageComponent implements OnInit {
  readonly perfilLoading = signal(false);
  readonly perfilMensaje = signal('');
  readonly perfilError = signal('');

  readonly contrasenaLoading = signal(false);
  readonly contrasenaMensaje = signal('');
  readonly contrasenaError = signal('');

  readonly preferenciasLoading = signal(false);
  readonly preferenciasMensaje = signal('');
  readonly preferenciasError = signal('');
  readonly preferenciasDisponibles = signal(true);
  readonly recibirObligatorias = signal(false);
  readonly correoUsuario = signal('');

  readonly canalesOptions: { value: CanalNotificacion; label: string }[] = [
    { value: 'PLATAFORMA', label: 'Plataforma' },
    { value: 'CORREO', label: 'Correo' },
    { value: 'PUSH', label: 'Push' },
  ];

  readonly tiposOptions: { value: TipoNotificacion; label: string }[] = [
    { value: 'ACTUALIZACION_TRAMITE', label: 'Actualizacion de tramite' },
    { value: 'ASIGNACION_TAREA', label: 'Asignacion de tarea' },
    { value: 'OBSERVACION', label: 'Observacion' },
    { value: 'RECHAZO', label: 'Rechazo' },
    { value: 'APROBACION', label: 'Aprobacion' },
  ];

  readonly frecuenciaOptions: { value: FrecuenciaNotificacion; label: string }[] = [
    { value: 'INMEDIATA', label: 'Inmediata' },
    { value: 'AGRUPADA', label: 'Agrupada' },
    { value: 'DIARIA', label: 'Diaria' },
  ];

  readonly perfilForm = this.formBuilder.nonNullable.group({
    nombres: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    telefono: [''],
    direccion: [''],
  });

  readonly contrasenaForm = this.formBuilder.nonNullable.group({
    contrasenaActual: ['', [Validators.required]],
    nuevaContrasena: ['', [Validators.required, Validators.minLength(8)]],
    confirmacionNuevaContrasena: ['', [Validators.required]],
  });

  readonly preferenciasForm = this.formBuilder.nonNullable.group({
    canalesHabilitados: [[] as CanalNotificacion[], [Validators.required]],
    tiposNotificacionHabilitados: [[] as TipoNotificacion[]],
    frecuencia: ['INMEDIATA' as FrecuenciaNotificacion, [Validators.required]],
    agruparNoCriticas: [false],
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly perfilPreferenciasService: PerfilPreferenciasService,
  ) {}

  ngOnInit(): void {
    this.cargarPerfil();
    this.cargarPreferencias();
  }

  guardarPerfil(): void {
    this.perfilMensaje.set('');
    this.perfilError.set('');
    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      return;
    }

    this.perfilLoading.set(true);
    this.perfilPreferenciasService.actualizarPerfil(this.perfilForm.getRawValue()).subscribe({
      next: (perfil) => {
        this.cargarPerfilDesdeResponse(perfil);
        this.perfilMensaje.set('Perfil actualizado correctamente.');
        this.perfilLoading.set(false);
      },
      error: (error: unknown) => {
        this.perfilError.set(this.extraerMensajeError(error, 'No se pudo actualizar el perfil.'));
        this.perfilLoading.set(false);
      },
    });
  }

  guardarContrasena(): void {
    this.contrasenaMensaje.set('');
    this.contrasenaError.set('');
    if (this.contrasenaForm.invalid) {
      this.contrasenaForm.markAllAsTouched();
      return;
    }

    const raw = this.contrasenaForm.getRawValue();
    if (raw.nuevaContrasena !== raw.confirmacionNuevaContrasena) {
      this.contrasenaError.set('La confirmacion de la nueva contrasena no coincide.');
      return;
    }

    this.contrasenaLoading.set(true);
    this.perfilPreferenciasService.cambiarContrasena(raw).subscribe({
      next: () => {
        this.contrasenaForm.reset();
        this.contrasenaMensaje.set('Contrasena actualizada correctamente.');
        this.contrasenaLoading.set(false);
      },
      error: (error: unknown) => {
        this.contrasenaError.set(this.extraerMensajeError(error, 'No se pudo actualizar la contrasena.'));
        this.contrasenaLoading.set(false);
      },
    });
  }

  guardarPreferencias(): void {
    this.preferenciasMensaje.set('');
    this.preferenciasError.set('');
    if (this.preferenciasForm.invalid) {
      this.preferenciasForm.markAllAsTouched();
      this.preferenciasError.set('Selecciona al menos un canal.');
      return;
    }

    this.preferenciasLoading.set(true);
    this.perfilPreferenciasService.actualizarPreferencias(this.preferenciasForm.getRawValue()).subscribe({
      next: (prefs) => {
        this.cargarPreferenciasDesdeResponse(prefs);
        this.preferenciasMensaje.set('Preferencias actualizadas correctamente.');
        this.preferenciasLoading.set(false);
      },
      error: (error: unknown) => {
        this.preferenciasError.set(this.extraerMensajeError(error, 'No se pudieron actualizar las preferencias.'));
        this.preferenciasLoading.set(false);
      },
    });
  }

  toggleCanal(value: CanalNotificacion): void {
    const current = this.preferenciasForm.controls.canalesHabilitados.value;
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    this.preferenciasForm.controls.canalesHabilitados.setValue(next);
  }

  toggleTipo(value: TipoNotificacion): void {
    const current = this.preferenciasForm.controls.tiposNotificacionHabilitados.value;
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    this.preferenciasForm.controls.tiposNotificacionHabilitados.setValue(next);
  }

  isCanalSelected(value: CanalNotificacion): boolean {
    return this.preferenciasForm.controls.canalesHabilitados.value.includes(value);
  }

  isTipoSelected(value: TipoNotificacion): boolean {
    return this.preferenciasForm.controls.tiposNotificacionHabilitados.value.includes(value);
  }

  private cargarPerfil(): void {
    this.perfilPreferenciasService.obtenerPerfil().subscribe({
      next: (perfil) => this.cargarPerfilDesdeResponse(perfil),
      error: (error: unknown) => {
        this.perfilError.set(this.extraerMensajeError(error, 'No se pudo cargar el perfil.'));
      },
    });
  }

  private cargarPerfilDesdeResponse(perfil: {
    nombres: string;
    apellidos: string;
    telefono: string | null;
    direccion: string | null;
    correo: string;
  }): void {
    this.correoUsuario.set(perfil.correo);
    this.perfilForm.patchValue({
      nombres: perfil.nombres ?? '',
      apellidos: perfil.apellidos ?? '',
      telefono: perfil.telefono ?? '',
      direccion: perfil.direccion ?? '',
    });
  }

  private cargarPreferencias(): void {
    this.perfilPreferenciasService.obtenerPreferencias().subscribe({
      next: (prefs) => this.cargarPreferenciasDesdeResponse(prefs),
      error: (error: unknown) => {
        const httpError = error as HttpErrorResponse;
        if (httpError.status === 403) {
          this.preferenciasDisponibles.set(true);
          this.preferenciasError.set(
            'El backend respondio 403 al consultar preferencias. Si ya habilitaste ADMINISTRADOR en backend, recompila y reinicia el servicio.',
          );
          return;
        }
        this.preferenciasError.set(this.extraerMensajeError(error, 'No se pudieron cargar las preferencias.'));
      },
    });
  }

  private cargarPreferenciasDesdeResponse(prefs: PreferenciasNotificacionResponse): void {
    this.preferenciasDisponibles.set(true);
    this.recibirObligatorias.set(prefs.recibirObligatorias);
    this.preferenciasForm.patchValue({
      canalesHabilitados: prefs.canalesHabilitados ?? [],
      tiposNotificacionHabilitados: prefs.tiposNotificacionHabilitados ?? [],
      frecuencia: prefs.frecuencia ?? 'INMEDIATA',
      agruparNoCriticas: prefs.agruparNoCriticas ?? false,
    });
  }

  private extraerMensajeError(error: unknown, fallback: string): string {
    const httpError = error as HttpErrorResponse;
    const backendMessage = httpError?.error && typeof httpError.error === 'object' ? (httpError.error as { message?: string }).message : undefined;
    return backendMessage ?? fallback;
  }
}
