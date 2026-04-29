import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';

import { ThemeToggleButtonComponent } from '../../compartido/componentes/theme-toggle-button.component';
import { AuthService, type UsuarioSesion } from '../autenticacion/auth.service';
import { ThemeService } from '../ui/theme.service';

type RolDashboard = 'ADMINISTRATIVO' | 'EJECUTIVO';

type SidebarItem = {
  label: string;
  route: string;
  icon: string;
  description: string;
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, ThemeToggleButtonComponent],
  template: `
    <div class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <header
        class="sticky top-0 z-30 border-b border-violet-300/60 bg-white/70 px-4 py-3 backdrop-blur dark:border-violet-500/20 dark:bg-violet-950/50"
      >
        <div class="mx-auto flex w-full max-w-7xl items-center justify-between">
          <button
            type="button"
            class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/60 bg-white/80 text-violet-700 transition hover:bg-violet-100 dark:border-violet-400/40 dark:bg-violet-600/20 dark:text-violet-100 dark:hover:bg-violet-600/30"
            (click)="sidebarOpen.set(!sidebarOpen())"
            aria-label="Desplegar sidebar"
          >
            <span class="pi pi-bars"></span>
          </button>

          <div class="text-center">
            <p class="m-0 text-sm font-semibold text-violet-900 dark:text-violet-100">{{ fullName() }}</p>
            <p class="m-0 text-xs uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">
              {{ userRole() }}
            </p>
          </div>

          <app-theme-toggle-button
            buttonClass="border-violet-400/60 bg-white/80 text-violet-700 hover:bg-violet-100 dark:border-violet-400/40 dark:bg-violet-600/20 dark:text-violet-100 dark:hover:bg-violet-600/30"
          />
        </div>
      </header>

      <div class="mx-auto w-full max-w-7xl px-4 py-4 lg:px-6">
        <aside
          class="fixed bottom-4 left-4 top-[88px] z-40 flex w-80 max-w-[82vw] flex-col rounded-2xl border border-violet-300/50 bg-white/90 p-4 shadow-xl backdrop-blur transition-transform duration-300 dark:border-violet-500/20 dark:bg-violet-950/90"
          [class.-translate-x-full]="!sidebarOpen()"
          [class.translate-x-0]="sidebarOpen()"
        >
          <div class="mb-4">
            <h2 class="m-0 text-base font-semibold text-violet-900 dark:text-violet-100">Navegacion</h2>
            <p class="m-0 text-sm text-violet-700 dark:text-violet-300">Accesos segun tu rol operativo.</p>
          </div>

          <nav class="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            @for (item of sidebarItems(); track item.label) {
              <a
                [routerLink]="item.route"
                (click)="sidebarOpen.set(false)"
                class="group block rounded-xl border border-violet-200/70 bg-white/80 px-3 py-3 transition hover:border-violet-400/70 hover:bg-violet-50 dark:border-violet-400/20 dark:bg-violet-800/20 dark:hover:border-violet-400/50 dark:hover:bg-violet-800/35"
              >
                <div class="flex items-start gap-3">
                  <span
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-700/40 dark:text-violet-200"
                  >
                    <i [class]="item.icon"></i>
                  </span>
                  <span>
                    <span class="block text-sm font-semibold text-violet-900 dark:text-violet-100">{{ item.label }}</span>
                    <span class="mt-1 block text-xs text-violet-700 dark:text-violet-300">{{ item.description }}</span>
                  </span>
                </div>
              </a>
            }
          </nav>

          <div class="mt-4 border-t border-violet-300/50 pt-3 dark:border-violet-500/20">
            <button
              type="button"
              (click)="cerrarSesion()"
              class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-300/70 bg-rose-500/15 font-semibold text-rose-700 transition hover:bg-rose-500/25 dark:border-rose-300/30 dark:text-rose-200"
            >
              <span class="pi pi-sign-out"></span>
              Cerrar sesion
            </button>
          </div>
        </aside>

        @if (sidebarOpen()) {
          <button
            type="button"
            class="fixed inset-0 z-30 bg-violet-950/30"
            (click)="sidebarOpen.set(false)"
            aria-label="Cerrar sidebar"
          ></button>
        }

        <main class="relative z-10 transition-all duration-300" [class.lg:pl-[19rem]]="sidebarOpen()">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AppShellComponent implements OnInit {
  readonly sidebarOpen = signal(false);
  readonly currentUser = signal<UsuarioSesion | null>(null);

  readonly normalizedRole = computed<RolDashboard | null>(() => {
    const user = this.currentUser();
    if (!user) {
      return null;
    }
    const normalized = this.authService.normalizeRol(user.rol);
    if (normalized === 'ADMINISTRATIVO' || normalized === 'EJECUTIVO') {
      return normalized;
    }
    return null;
  });

  readonly userRole = computed(() => this.normalizedRole() ?? 'SIN ROL');
  readonly fullName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.nombres} ${user.apellidos}` : 'Usuario';
  });

  readonly sidebarItems = computed<SidebarItem[]>(() => {
    if (this.normalizedRole() === 'ADMINISTRATIVO') {
      return [
        {
          label: 'Dashboard',
          route: '/dashboard',
          icon: 'pi pi-home',
          description: 'Resumen operativo por rol.',
        },
        {
          label: 'Tipos de tramite',
          route: '/tipos-tramite',
          icon: 'pi pi-briefcase',
          description: 'Alta, edicion y estado del catalogo de tramites.',
        },
        {
          label: 'Diseno de flujos',
          route: '/politicas',
          icon: 'pi pi-sitemap',
          description: 'Crear y mantener la estructura de tramites.',
        },
        {
          label: 'Administrar usuarios',
          route: '/usuarios',
          icon: 'pi pi-users',
          description: 'Gestion de cuentas, roles y permisos.',
        },
        {
          label: 'Configurar departamentos',
          route: '/departamentos',
          icon: 'pi pi-building',
          description: 'Organizar areas y cargas operativas.',
        },
        {
          label: 'Supervision y reportes',
          route: '/analitica',
          icon: 'pi pi-chart-line',
          description: 'Monitorear indicadores y auditorias.',
        },
        {
          label: 'Perfil y notificaciones',
          route: '/administracion/perfil',
          icon: 'pi pi-user-edit',
          description: 'Gestionar perfil propio y preferencias.',
        },
      ];
    }
    return [
      {
        label: 'Dashboard',
        route: '/dashboard',
        icon: 'pi pi-home',
        description: 'Resumen operativo por rol.',
      },
      {
        label: 'Bandeja de tareas',
        route: '/tareas',
        icon: 'pi pi-inbox',
        description: 'Revisar y priorizar tareas asignadas.',
      },
      {
        label: 'Gestion de tramites',
        route: '/tramites',
        icon: 'pi pi-briefcase',
        description: 'Registrar nuevas instancias de tramite.',
      },
      {
        label: 'Mis tramites',
        route: '/tramites/mis-tramites',
        icon: 'pi pi-list-check',
        description: 'Listado, detalle BPMN y eliminacion.',
      },
      {
        label: 'Documentos',
        route: '/archivos',
        icon: 'pi pi-file',
        description: 'Adjuntos y evidencias del proceso.',
      },
      {
        label: 'Notificaciones',
        route: '/notificaciones',
        icon: 'pi pi-bell',
        description: 'Alertas y recordatorios operativos.',
      },
      {
        label: 'Perfil y notificaciones',
        route: '/administracion/perfil',
        icon: 'pi pi-user-edit',
        description: 'Gestionar datos personales y alertas.',
      },
    ];
  });

  constructor(
    private readonly authService: AuthService,
    private readonly themeService: ThemeService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.themeService.init();
    const user = this.authService.getUsuarioSesion();
    if (!user || !this.authService.isRolPermitidoFrontend(user.rol)) {
      this.authService.clearSession();
      this.router.navigateByUrl('/autenticacion/login');
      return;
    }
    this.currentUser.set(user);
  }

  cerrarSesion(): void {
    this.authService
      .logout()
      .pipe(
        finalize(() => {
          this.authService.clearSession();
          this.router.navigateByUrl('/autenticacion/login');
        }),
      )
      .subscribe({
        next: () => undefined,
        error: () => undefined,
      });
  }
}
