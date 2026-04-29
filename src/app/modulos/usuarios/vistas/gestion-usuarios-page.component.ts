import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../nucleo/autenticacion/auth.service';
import {
  type EstadoCuentaAdmin,
  type RolUsuarioAdmin,
  type UsuarioDetalleResponse,
  type UsuarioResumenResponse,
  UsuariosAdminService,
} from '../../../nucleo/administracion/usuarios-admin.service';

@Component({
  selector: 'app-gestion-usuarios-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-5">
      <section class="rounded-2xl border border-violet-300/60 bg-white/85 p-6 dark:border-violet-500/20 dark:bg-violet-900/30">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Administracion</p>
        <h1 class="m-0 mt-1 text-3xl font-semibold text-violet-950 dark:text-violet-50">Gestion de usuarios y roles</h1>
        <p class="m-0 mt-2 text-violet-700 dark:text-violet-200">
          Consulta, registra, edita, habilita/deshabilita y actualiza roles desde una sola pantalla.
        </p>
      </section>

      @if (globalError()) {
        <p class="rounded-xl border border-rose-300/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{{ globalError() }}</p>
      }
      @if (globalMessage()) {
        <p class="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">{{ globalMessage() }}</p>
      }

      <section class="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <article class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h2 class="m-0 text-xl font-semibold text-violet-900 dark:text-violet-100">Usuarios registrados</h2>
            <button
              type="button"
              (click)="cargarUsuarios()"
              [disabled]="loadingLista()"
              class="h-10 rounded-xl border border-violet-300/70 px-4 text-sm font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-60 dark:border-violet-400/30 dark:text-violet-100 dark:hover:bg-violet-800/35"
            >
              {{ loadingLista() ? 'Actualizando...' : 'Refrescar' }}
            </button>
          </div>

          <div class="space-y-2">
            @for (usuario of usuarios(); track usuario.id) {
              <button
                type="button"
                (click)="seleccionarUsuario(usuario.id)"
                class="w-full rounded-xl border p-3 text-left transition"
                [class.border-violet-500]="usuario.id === selectedUsuarioId()"
                [class.bg-violet-100/70]="usuario.id === selectedUsuarioId()"
                [class.dark:bg-violet-700/25]="usuario.id === selectedUsuarioId()"
                [class.border-violet-200/70]="usuario.id !== selectedUsuarioId()"
                [class.dark:border-violet-400/20]="usuario.id !== selectedUsuarioId()"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <strong class="text-sm text-violet-950 dark:text-violet-50">{{ usuario.nombreCompleto }}</strong>
                  <span class="rounded-lg bg-violet-600/80 px-2 py-1 text-xs font-semibold text-white">{{ usuario.rol }}</span>
                </div>
                <p class="m-0 mt-1 text-sm text-violet-700 dark:text-violet-300">{{ usuario.correo }}</p>
                <p class="m-0 mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-violet-600 dark:text-violet-400">
                  Estado: {{ usuario.estadoCuenta }}
                </p>
              </button>
            } @empty {
              <p class="rounded-xl border border-violet-300/50 bg-violet-100/60 px-3 py-3 text-sm text-violet-800 dark:border-violet-400/20 dark:bg-violet-800/25 dark:text-violet-200">
                No hay usuarios para mostrar.
              </p>
            }
          </div>
        </article>

        <article class="space-y-5">
          <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
            <h2 class="m-0 text-xl font-semibold text-violet-900 dark:text-violet-100">Registrar usuario</h2>
            <p class="m-0 mt-1 text-sm text-violet-700 dark:text-violet-300">Alta interna de cuentas en plataforma.</p>

            <form class="mt-4 space-y-3" [formGroup]="crearForm" (ngSubmit)="crearUsuario()">
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Nombres</span>
                  <input formControlName="nombres" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50" />
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Apellidos</span>
                  <input formControlName="apellidos" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50" />
                </label>
              </div>

              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Correo</span>
                <input formControlName="correo" type="email" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50" />
              </label>

              <div class="grid gap-3 sm:grid-cols-2">
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Telefono</span>
                  <input formControlName="telefono" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50" />
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Rol</span>
                  <select formControlName="rol" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50">
                    @for (rol of roles; track rol) {
                      <option [value]="rol">{{ rol }}</option>
                    }
                  </select>
                </label>
              </div>

              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Direccion</span>
                <input formControlName="direccion" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50" />
              </label>

              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Contrasena temporal</span>
                <input formControlName="contrasenaTemporal" type="password" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50" />
              </label>

              <button
                type="submit"
                [disabled]="loadingCrear()"
                class="h-11 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                {{ loadingCrear() ? 'Creando...' : 'Crear usuario' }}
              </button>
            </form>
          </section>
        </article>
      </section>

      <section class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25">
        <h2 class="m-0 text-xl font-semibold text-violet-900 dark:text-violet-100">Edicion y control del usuario seleccionado</h2>
        <p class="m-0 mt-1 text-sm text-violet-700 dark:text-violet-300">Incluye datos personales, rol y estado de cuenta.</p>

        @if (!selectedUsuario()) {
          <p class="mt-4 rounded-xl border border-violet-300/50 bg-violet-100/50 px-4 py-3 text-sm text-violet-800 dark:border-violet-400/20 dark:bg-violet-800/25 dark:text-violet-200">
            Selecciona un usuario del listado para editarlo.
          </p>
        } @else {
          <div class="mt-4 grid gap-5 xl:grid-cols-[1fr_320px]">
            <form class="space-y-3" [formGroup]="editarForm" (ngSubmit)="guardarEdicion()">
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Nombres</span>
                  <input formControlName="nombres" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50" />
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Apellidos</span>
                  <input formControlName="apellidos" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50" />
                </label>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Telefono</span>
                  <input formControlName="telefono" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50" />
                </label>
                <label class="space-y-1 text-sm">
                  <span class="font-medium text-violet-800 dark:text-violet-100">Correo</span>
                  <input [value]="selectedUsuario()!.correo" disabled class="h-11 w-full rounded-xl border border-violet-200/80 bg-slate-100/80 px-3 text-slate-600 dark:border-violet-300/10 dark:bg-violet-950/60 dark:text-violet-300" />
                </label>
              </div>

              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Direccion</span>
                <input formControlName="direccion" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50" />
              </label>

              <button
                type="submit"
                [disabled]="loadingEditar()"
                class="h-11 w-full rounded-xl bg-violet-700 font-semibold text-white hover:bg-violet-600 disabled:opacity-60"
              >
                {{ loadingEditar() ? 'Guardando...' : 'Guardar cambios de perfil' }}
              </button>
            </form>

            <div class="space-y-3">
              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Rol actual</span>
                <select [formControl]="rolForm.controls.rol" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50">
                  @for (rol of roles; track rol) {
                    <option [value]="rol">{{ rol }}</option>
                  }
                </select>
              </label>

              <button
                type="button"
                (click)="guardarRol()"
                [disabled]="loadingRol()"
                class="h-10 w-full rounded-xl border border-violet-300/70 bg-violet-100/70 font-semibold text-violet-800 hover:bg-violet-200 disabled:opacity-60 dark:border-violet-400/20 dark:bg-violet-800/35 dark:text-violet-100"
              >
                {{ loadingRol() ? 'Actualizando rol...' : 'Guardar rol' }}
              </button>

              <label class="space-y-1 text-sm">
                <span class="font-medium text-violet-800 dark:text-violet-100">Estado de cuenta</span>
                <select [formControl]="estadoForm.controls.estadoCuenta" class="h-11 w-full rounded-xl border border-violet-300/60 bg-white/90 px-3 text-violet-950 outline-none ring-violet-400 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50">
                  @for (estado of estados; track estado) {
                    <option [value]="estado">{{ estado }}</option>
                  }
                </select>
              </label>

              <button
                type="button"
                (click)="guardarEstado()"
                [disabled]="loadingEstado()"
                class="h-10 w-full rounded-xl border border-violet-300/70 bg-violet-100/70 font-semibold text-violet-800 hover:bg-violet-200 disabled:opacity-60 dark:border-violet-400/20 dark:bg-violet-800/35 dark:text-violet-100"
              >
                {{ loadingEstado() ? 'Actualizando estado...' : 'Guardar estado' }}
              </button>
            </div>
          </div>
        }
      </section>
    </div>
  `,
})
export class GestionUsuariosPageComponent implements OnInit {
  readonly roles: RolUsuarioAdmin[] = ['ADMINISTRADOR', 'EJECUTIVO', 'USUARIO'];
  readonly estados: EstadoCuentaAdmin[] = ['ACTIVA', 'INACTIVA', 'BLOQUEADA', 'PENDIENTE'];

  readonly usuarios = signal<UsuarioResumenResponse[]>([]);
  readonly selectedUsuarioId = signal<string | null>(null);
  readonly selectedUsuario = signal<UsuarioDetalleResponse | null>(null);

  readonly loadingLista = signal(false);
  readonly loadingCrear = signal(false);
  readonly loadingEditar = signal(false);
  readonly loadingRol = signal(false);
  readonly loadingEstado = signal(false);

  readonly globalError = signal('');
  readonly globalMessage = signal('');

  readonly crearForm = this.formBuilder.nonNullable.group({
    nombres: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    correo: ['', [Validators.required, Validators.email]],
    telefono: [''],
    direccion: [''],
    rol: ['USUARIO' as RolUsuarioAdmin, [Validators.required]],
    contrasenaTemporal: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly editarForm = this.formBuilder.nonNullable.group({
    nombres: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    telefono: [''],
    direccion: [''],
  });

  readonly rolForm = this.formBuilder.nonNullable.group({
    rol: ['USUARIO' as RolUsuarioAdmin, [Validators.required]],
  });

  readonly estadoForm = this.formBuilder.nonNullable.group({
    estadoCuenta: ['ACTIVA' as EstadoCuentaAdmin, [Validators.required]],
  });

  constructor(
    private readonly formBuilder: FormBuilder,
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
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.globalError.set('');
    this.loadingLista.set(true);
    this.usuariosAdminService.listarUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        if (this.selectedUsuarioId()) {
          const existe = usuarios.some((u) => u.id === this.selectedUsuarioId());
          if (!existe) {
            this.selectedUsuarioId.set(null);
            this.selectedUsuario.set(null);
          }
        }
        this.loadingLista.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo cargar el listado de usuarios.'));
        this.loadingLista.set(false);
      },
    });
  }

  seleccionarUsuario(usuarioId: string): void {
    this.globalError.set('');
    this.globalMessage.set('');
    this.selectedUsuarioId.set(usuarioId);
    this.usuariosAdminService.obtenerUsuario(usuarioId).subscribe({
      next: (usuario) => this.cargarUsuarioSeleccionado(usuario),
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo cargar el detalle del usuario.'));
      },
    });
  }

  crearUsuario(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    if (this.crearForm.invalid) {
      this.crearForm.markAllAsTouched();
      this.globalError.set('Completa los datos obligatorios para registrar el usuario.');
      return;
    }

    this.loadingCrear.set(true);
    this.usuariosAdminService.crearUsuario(this.crearForm.getRawValue()).subscribe({
      next: (response) => {
        this.globalMessage.set(response.mensaje);
        this.crearForm.reset({
          nombres: '',
          apellidos: '',
          correo: '',
          telefono: '',
          direccion: '',
          rol: 'USUARIO',
          contrasenaTemporal: '',
        });
        this.cargarUsuarios();
        this.seleccionarUsuario(response.idUsuario);
        this.loadingCrear.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo crear el usuario.'));
        this.loadingCrear.set(false);
      },
    });
  }

  guardarEdicion(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const usuarioId = this.selectedUsuarioId();
    if (!usuarioId) {
      this.globalError.set('Selecciona un usuario para editarlo.');
      return;
    }
    if (this.editarForm.invalid) {
      this.editarForm.markAllAsTouched();
      this.globalError.set('Completa los campos requeridos del usuario.');
      return;
    }

    this.loadingEditar.set(true);
    this.usuariosAdminService.actualizarUsuario(usuarioId, this.editarForm.getRawValue()).subscribe({
      next: (usuario) => {
        this.globalMessage.set('La operacion fue realizada correctamente.');
        this.cargarUsuarioSeleccionado(usuario);
        this.cargarUsuarios();
        this.loadingEditar.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo actualizar el usuario.'));
        this.loadingEditar.set(false);
      },
    });
  }

  guardarRol(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const usuarioId = this.selectedUsuarioId();
    if (!usuarioId) {
      this.globalError.set('Selecciona un usuario para cambiar su rol.');
      return;
    }
    if (!confirm('Confirmar cambio de rol para este usuario?')) {
      return;
    }

    this.loadingRol.set(true);
    this.usuariosAdminService.cambiarRol(usuarioId, this.rolForm.getRawValue()).subscribe({
      next: (response) => {
        this.globalMessage.set(response.mensaje);
        this.seleccionarUsuario(usuarioId);
        this.cargarUsuarios();
        this.loadingRol.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo actualizar el rol.'));
        this.loadingRol.set(false);
      },
    });
  }

  guardarEstado(): void {
    this.globalError.set('');
    this.globalMessage.set('');
    const usuarioId = this.selectedUsuarioId();
    if (!usuarioId) {
      this.globalError.set('Selecciona un usuario para cambiar su estado.');
      return;
    }
    if (!confirm('Confirmar cambio de estado de cuenta para este usuario?')) {
      return;
    }

    this.loadingEstado.set(true);
    this.usuariosAdminService.cambiarEstado(usuarioId, this.estadoForm.getRawValue()).subscribe({
      next: (response) => {
        this.globalMessage.set(response.mensaje);
        this.seleccionarUsuario(usuarioId);
        this.cargarUsuarios();
        this.loadingEstado.set(false);
      },
      error: (error: unknown) => {
        this.globalError.set(this.extraerMensajeError(error, 'No se pudo actualizar el estado de cuenta.'));
        this.loadingEstado.set(false);
      },
    });
  }

  private cargarUsuarioSeleccionado(usuario: UsuarioDetalleResponse): void {
    this.selectedUsuario.set(usuario);
    this.editarForm.patchValue({
      nombres: usuario.nombres ?? '',
      apellidos: usuario.apellidos ?? '',
      telefono: usuario.telefono ?? '',
      direccion: usuario.direccion ?? '',
    });
    this.rolForm.patchValue({ rol: usuario.rol });
    this.estadoForm.patchValue({ estadoCuenta: usuario.estadoCuenta });
  }

  private extraerMensajeError(error: unknown, fallback: string): string {
    const httpError = error as HttpErrorResponse;
    const backendMessage =
      httpError?.error && typeof httpError.error === 'object' ? (httpError.error as { message?: string }).message : undefined;
    return backendMessage ?? fallback;
  }
}
