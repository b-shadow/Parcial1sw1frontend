import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../autenticacion/auth.service';

type SidebarItem = {
  label: string;
  link: string;
  icon: string;
  description: string;
};

type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur xl:sticky xl:top-6">
      <div class="mb-4 rounded-[1.5rem] bg-slate-950 px-4 py-4 text-white">
        <p class="mb-1 text-xs font-semibold uppercase tracking-[0.3em] text-teal-300">Navegacion</p>
        <h2 class="m-0 text-lg font-semibold">Panel principal</h2>
        <p class="mt-2 text-sm leading-6 text-slate-300">
          Accesos agrupados por operacion para administrar tramites, flujo y supervision.
        </p>
      </div>

      <nav class="space-y-4">
        @for (section of sections; track section.title) {
          <section class="space-y-2">
            <p class="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              {{ section.title }}
            </p>

            <div class="grid gap-2">
              @for (item of section.items; track item.label) {
                <a
                  [routerLink]="item.link"
                  routerLinkActive="border-teal-500 bg-teal-50 text-teal-900 shadow-sm"
                  class="group flex items-start gap-3 rounded-2xl border border-transparent px-3 py-3 text-slate-700 transition hover:border-slate-200 hover:bg-slate-50"
                >
                  <span
                    class="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-slate-900 group-hover:text-white"
                  >
                    <i [class]="item.icon"></i>
                  </span>

                  <span class="min-w-0">
                    <span class="block text-sm font-semibold leading-5">{{ item.label }}</span>
                    <span class="mt-1 block text-xs leading-5 text-slate-500">{{ item.description }}</span>
                  </span>
                </a>
              }
            </div>
          </section>
        }
      </nav>
    </aside>
  `,
})
export class SidebarComponent {
  protected readonly sections: SidebarSection[];

  constructor(private readonly authService: AuthService) {
    const usuario = this.authService.getUsuarioSesion();
    const esAdmin = usuario?.rol === 'ADMINISTRADOR';
    this.sections = this.buildSections(esAdmin);
  }

  private buildSections(esAdmin: boolean): SidebarSection[] {
    const sections: SidebarSection[] = [
    {
      title: 'Dashboard',
      items: [
        {
          label: 'Dashboard',
          link: '/',
          icon: 'pi pi-home',
          description: 'Vista general del sistema y accesos rapidos.',
        },
      ],
    },
    {
      title: 'Administracion',
      items: [
        {
          label: 'Mi perfil',
          link: '/administracion',
          icon: 'pi pi-user',
          description: 'Datos personales, sesion y preferencias.',
        },
        {
          label: 'Usuarios y Roles',
          link: '/usuarios',
          icon: 'pi pi-users',
          description: 'Gestion de cuentas, permisos y perfiles.',
        },
        {
          label: 'Departamentos',
          link: '/departamentos',
          icon: 'pi pi-sitemap',
          description: 'Estructura de areas y responsables.',
        },
      ],
    },
    {
      title: 'Diseno de Tramites',
      items: [
        {
          label: 'Tipos de tramite',
          link: '/tipos-tramite',
          icon: 'pi pi-briefcase',
          description: 'Catalogo de procesos disponibles.',
        },
        {
          label: 'Flujos',
          link: '/politicas',
          icon: 'pi pi-share-alt',
          description: 'Definicion del flujo y reglas del proceso.',
        },
        {
          label: 'Formularios',
          link: '/formularios',
          icon: 'pi pi-file-edit',
          description: 'Campos dinamicos y plantillas del tramite.',
        },
        {
          label: 'Notificaciones del flujo',
          link: '/notificaciones',
          icon: 'pi pi-bell',
          description: 'Mensajes automaticos ligados a eventos.',
        },
      ],
    },
    {
      title: 'Tramites',
      items: [
        {
          label: 'Nuevo tramite',
          link: '/tramites',
          icon: 'pi pi-plus-circle',
          description: 'Inicio de una nueva solicitud.',
        },
        {
          label: 'Mis tramites',
          link: '/tramites',
          icon: 'pi pi-folder-open',
          description: 'Listado personal de tramites registrados.',
        },
        {
          label: 'Detalle de tramite',
          link: '/tramites',
          icon: 'pi pi-file',
          description: 'Seguimiento completo y acciones disponibles.',
        },
      ],
    },
    {
      title: 'Operacion',
      items: [
        {
          label: 'Bandeja de tareas',
          link: '/tareas',
          icon: 'pi pi-inbox',
          description: 'Trabajo pendiente por usuario o rol.',
        },
        {
          label: 'Carga del departamento',
          link: '/departamentos',
          icon: 'pi pi-chart-bar',
          description: 'Volumen operativo por area.',
        },
        {
          label: 'Detalle de tarea',
          link: '/tareas',
          icon: 'pi pi-list-check',
          description: 'Contexto, responsables y avance de ejecucion.',
        },
      ],
    },
    {
      title: 'Supervision',
      items: [
        {
          label: 'Monitoreo',
          link: '/seguimiento',
          icon: 'pi pi-eye',
          description: 'Estado vivo de casos y cuellos de botella.',
        },
        {
          label: 'Historial de notificaciones',
          link: '/notificaciones',
          icon: 'pi pi-history',
          description: 'Registro de alertas, envios y resultados.',
        },
        {
          label: 'Bitacora',
          link: '/auditoria',
          icon: 'pi pi-book',
          description: 'Traza de acciones y eventos del sistema.',
        },
        {
          label: 'Estadisticas y reportes',
          link: '/analitica',
          icon: 'pi pi-chart-line',
          description: 'Indicadores, tiempos y exportables.',
        },
      ],
    },
  ];
    if (!esAdmin) {
      return sections.map((section) => ({
        ...section,
        items: section.items.filter((item) => item.link !== '/auditoria'),
      }));
    }
    return sections;
  }
}
