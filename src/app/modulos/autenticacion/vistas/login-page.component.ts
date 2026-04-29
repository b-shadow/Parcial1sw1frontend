import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ThemeToggleButtonComponent } from '../../../compartido/componentes/theme-toggle-button.component';
import { AuthService, type LoginResponse } from '../../../nucleo/autenticacion/auth.service';
import { ThemeService } from '../../../nucleo/ui/theme.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ThemeToggleButtonComponent],
  template: `
    <div
      class="relative min-h-screen overflow-hidden bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)] transition-colors duration-300 sm:px-6 lg:px-8"
    >
      <div
        class="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl sm:h-80 sm:w-80"
      ></div>
      <div
        class="pointer-events-none absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl sm:h-96 sm:w-96"
      ></div>

      <div class="relative mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-xl space-y-4">
          <span
            class="inline-flex items-center gap-2 rounded-full border border-violet-400/60 bg-violet-200/45 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300"
          >
            Plataforma de Tramites
          </span>
          <h1 class="text-balance text-4xl font-semibold tracking-tight text-violet-950 dark:text-violet-50 sm:text-5xl">
            Ingreso Operativo
          </h1>
          <p class="max-w-lg text-base text-violet-700 dark:text-violet-200/90 sm:text-lg">
            Gestiona tareas y procesos en una sola consola. Solo perfiles administrativos y ejecutivos pueden ingresar.
          </p>
        </div>

        <app-theme-toggle-button
          buttonClass="self-start border-violet-400/60 bg-white/70 text-violet-700 hover:bg-violet-100 dark:border-violet-400/40 dark:bg-violet-500/10 dark:text-violet-100 dark:hover:bg-violet-500/20"
        />
      </div>

      <div class="relative mx-auto mt-8 max-w-6xl">
        <div class="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div
            class="hidden rounded-3xl border border-violet-300/60 bg-gradient-to-br from-violet-200/60 to-fuchsia-200/35 p-8 lg:block dark:border-violet-500/20 dark:from-violet-500/20 dark:to-fuchsia-500/10"
          >
            <div class="space-y-6">
              <p class="text-sm uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200">Seguridad</p>
              <ul class="space-y-4 text-violet-800 dark:text-violet-50/90">
                <li class="flex items-start gap-3">
                  <span class="pi pi-shield mt-1 text-violet-700 dark:text-violet-300"></span>
                  <span>Acceso validado contra backend real con JWT.</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="pi pi-bolt mt-1 text-violet-700 dark:text-violet-300"></span>
                  <span>Flujo de autenticacion preparado para escalar a rutas protegidas.</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="pi pi-check-circle mt-1 text-violet-700 dark:text-violet-300"></span>
                  <span>Control de rol: solo <strong>ADMINISTRATIVO</strong> y <strong>EJECUTIVO</strong>.</span>
                </li>
              </ul>
            </div>
          </div>

          <section
            class="rounded-3xl border border-violet-300/20 bg-[var(--card-bg)] p-6 shadow-2xl shadow-violet-950/25 backdrop-blur-xl sm:p-8"
          >
            <form [formGroup]="loginForm" (ngSubmit)="submit()" class="space-y-5" novalidate>
              <div class="space-y-1">
                <label for="correo" class="text-sm font-medium text-violet-800 dark:text-violet-100">Correo institucional</label>
                <input
                  id="correo"
                  type="email"
                  formControlName="correo"
                  placeholder="usuario@institucion.com"
                  class="h-12 w-full rounded-xl border border-violet-300/60 bg-white/80 px-4 text-violet-950 outline-none ring-violet-400 transition placeholder:text-violet-500/70 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50 dark:placeholder:text-violet-300/60"
                />
                @if (isInvalid('correo')) {
                  <p class="text-sm text-rose-300">Ingresa un correo valido.</p>
                }
              </div>

              <div class="space-y-1">
                <label for="contrasena" class="text-sm font-medium text-violet-800 dark:text-violet-100">Contrasena</label>
                <div class="relative">
                  <input
                    id="contrasena"
                    [type]="passwordVisible() ? 'text' : 'password'"
                    formControlName="contrasena"
                    placeholder="********"
                    class="h-12 w-full rounded-xl border border-violet-300/60 bg-white/80 px-4 pr-12 text-violet-950 outline-none ring-violet-400 transition placeholder:text-violet-500/70 focus:ring-2 dark:border-violet-300/20 dark:bg-violet-950/40 dark:text-violet-50 dark:placeholder:text-violet-300/60"
                  />
                  <button
                    type="button"
                    class="absolute inset-y-0 right-0 mr-2 inline-flex w-10 items-center justify-center rounded-lg text-violet-700 transition hover:bg-violet-100 dark:text-violet-200 dark:hover:bg-violet-500/20"
                    (click)="passwordVisible.set(!passwordVisible())"
                    [attr.aria-label]="passwordVisible() ? 'Ocultar contrasena' : 'Mostrar contrasena'"
                  >
                    <span class="pi" [class.pi-eye]="!passwordVisible()" [class.pi-eye-slash]="passwordVisible()"></span>
                  </button>
                </div>
                @if (isInvalid('contrasena')) {
                  <p class="text-sm text-rose-300">La contrasena es obligatoria.</p>
                }
              </div>

              @if (errorMessage()) {
                <div class="rounded-xl border border-rose-300/30 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
                  {{ errorMessage() }}
                </div>
              }

              <button
                type="submit"
                [disabled]="isLoading()"
                class="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                @if (isLoading()) {
                  <span class="pi pi-spin pi-spinner mr-2"></span>
                }
                Iniciar sesion
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  `,
})
export class LoginPageComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly passwordVisible = signal(false);

  readonly loginForm = this.formBuilder.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required]],
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.themeService.init();
  }

  submit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.isLoading.set(true);

    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: (response) => {
        if (!this.isAllowedRole(response)) {
          this.authService.clearSession();
          this.errorMessage.set('Tu rol no tiene permiso para ingresar en este frontend.');
          this.isLoading.set(false);
          return;
        }

        this.authService.saveSession(response);
        this.router.navigateByUrl('/dashboard').finally(() => {
          this.isLoading.set(false);
        });
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.authService.extractErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }

  isInvalid(controlName: 'correo' | 'contrasena'): boolean {
    const control = this.loginForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  private isAllowedRole(response: LoginResponse): boolean {
    return this.authService.isRolPermitidoFrontend(response.usuario.rol);
  }
}
