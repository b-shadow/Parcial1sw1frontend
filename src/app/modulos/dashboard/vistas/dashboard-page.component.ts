import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService, type UsuarioSesion } from '../../../nucleo/autenticacion/auth.service';

type RolDashboard = 'ADMINISTRATIVO' | 'EJECUTIVO';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-5">
      <section
        class="rounded-2xl border border-violet-300/60 bg-white/80 p-6 shadow-sm dark:border-violet-500/20 dark:bg-violet-900/30"
      >
        <p class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">
          Dashboard
        </p>
        <h1 class="m-0 text-3xl font-semibold text-violet-950 dark:text-violet-50">
          {{ roleTitle() }}
        </h1>
        <p class="mt-3 text-violet-700 dark:text-violet-200">
          {{ roleDescription() }}
        </p>
      </section>

      <section class="grid gap-4 md:grid-cols-2">
        @for (card of infoCards(); track card.title) {
          <article
            class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25"
          >
            <div class="mb-3 flex items-center gap-3">
              <span
                class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-700/40 dark:text-violet-200"
              >
                <i [class]="card.icon"></i>
              </span>
              <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">{{ card.title }}</h3>
            </div>
            <p class="m-0 text-sm leading-6 text-violet-800 dark:text-violet-200">{{ card.text }}</p>
          </article>
        }
      </section>

      <section
        class="rounded-2xl border border-violet-300/50 bg-white/85 p-5 dark:border-violet-500/20 dark:bg-violet-900/25"
      >
        <h3 class="m-0 text-lg font-semibold text-violet-900 dark:text-violet-100">Sugerencias del dia</h3>
        <ul class="mt-3 space-y-2">
          @for (tip of tips(); track tip) {
            <li class="flex items-start gap-2 text-sm text-violet-800 dark:text-violet-200">
              <span class="pi pi-check-circle mt-1 text-violet-600 dark:text-violet-300"></span>
              <span>{{ tip }}</span>
            </li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class DashboardPageComponent implements OnInit {
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

  readonly roleTitle = computed(() =>
    this.normalizedRole() === 'ADMINISTRATIVO' ? 'Panel Administrativo' : 'Panel Ejecutivo',
  );

  readonly roleDescription = computed(() =>
    this.normalizedRole() === 'ADMINISTRATIVO'
      ? 'Disena flujos, administra usuarios y controla la operacion global de la plataforma.'
      : 'Gestiona tus tareas por departamento, cumple tiempos de atencion y registra avances.',
  );

  readonly infoCards = computed(() =>
    this.normalizedRole() === 'ADMINISTRATIVO'
      ? [
          {
            title: 'Creacion de flujos',
            icon: 'pi pi-share-alt',
            text: 'Define nodos iniciales/finales, reglas de transicion y versiones publicadas para cada tipo de tramite.',
          },
          {
            title: 'Uso de herramientas',
            icon: 'pi pi-cog',
            text: 'Aprovecha formularios dinamicos, notificaciones por evento y supervision para reducir tiempos de proceso.',
          },
          {
            title: 'Control de calidad',
            icon: 'pi pi-verified',
            text: 'Revisa auditorias y reportes para detectar cuellos de botella y aplicar mejoras de diseno.',
          },
          {
            title: 'Gobierno de acceso',
            icon: 'pi pi-shield',
            text: 'Mantiene roles y departamentos alineados con responsabilidades reales de la organizacion.',
          },
        ]
      : [
          {
            title: 'Tareas asignadas',
            icon: 'pi pi-list-check',
            text: 'Consulta prioridad, vencimientos y estado para avanzar cada actividad sin bloqueos.',
          },
          {
            title: 'Trabajo por departamento',
            icon: 'pi pi-building',
            text: 'Coordina tu carga operativa con responsables del area y evita retrasos en la atencion.',
          },
          {
            title: 'Seguimiento diario',
            icon: 'pi pi-clock',
            text: 'Documenta cada avance con evidencias y observaciones para mantener trazabilidad.',
          },
          {
            title: 'Comunicacion operativa',
            icon: 'pi pi-megaphone',
            text: 'Usa notificaciones y bandejas para actuar rapido frente a nuevas asignaciones.',
          },
        ],
  );

  readonly tips = computed(() =>
    this.normalizedRole() === 'ADMINISTRATIVO'
      ? [
          'Publica cambios de flujo en horarios de baja demanda.',
          'Valida configuraciones de notificacion antes de activar nuevas reglas.',
          'Monitorea auditoria semanal para detectar errores recurrentes.',
        ]
      : [
          'Prioriza tareas con fecha de vencimiento cercana.',
          'Registra evidencias en cada paso para evitar retrabajos.',
          'Marca observaciones claras cuando una actividad requiera devolucion.',
        ],
  );

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUsuarioSesion();
    if (!user || !this.authService.isRolPermitidoFrontend(user.rol)) {
      this.authService.clearSession();
      this.router.navigateByUrl('/autenticacion/login');
      return;
    }
    this.currentUser.set(user);
  }
}

