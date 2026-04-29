import { Routes } from '@angular/router';
import { AppShellComponent } from './nucleo/layout/app-shell.component';

export const appRoutes: Routes = [
  {
    path: 'autenticacion',
    loadChildren: () => import('./modulos/autenticacion/rutas').then((m) => m.RUTAS_AUTENTICACION),
  },
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadChildren: () => import('./modulos/dashboard/rutas').then((m) => m.RUTAS_DASHBOARD),
      },
      {
        path: 'usuarios',
        loadChildren: () => import('./modulos/usuarios/rutas').then((m) => m.RUTAS_USUARIOS),
      },
      {
        path: 'departamentos',
        loadChildren: () => import('./modulos/departamentos/rutas').then((m) => m.RUTAS_DEPARTAMENTOS),
      },
      {
        path: 'politicas',
        loadChildren: () => import('./modulos/politicas/rutas').then((m) => m.RUTAS_POLITICAS),
      },
      {
        path: 'tipos-tramite',
        loadChildren: () => import('./modulos/tipos-tramite/rutas').then((m) => m.RUTAS_TIPOS_TRAMITE),
      },
      {
        path: 'tramites',
        loadChildren: () => import('./modulos/tramites/rutas').then((m) => m.RUTAS_TRAMITES),
      },
      {
        path: 'tareas',
        loadChildren: () => import('./modulos/tareas/rutas').then((m) => m.RUTAS_TAREAS),
      },
      {
        path: 'formularios',
        loadChildren: () => import('./modulos/formularios/rutas').then((m) => m.RUTAS_FORMULARIOS),
      },
      {
        path: 'seguimiento',
        loadChildren: () => import('./modulos/seguimiento/rutas').then((m) => m.RUTAS_SEGUIMIENTO),
      },
      {
        path: 'notificaciones',
        loadChildren: () => import('./modulos/notificaciones/rutas').then((m) => m.RUTAS_NOTIFICACIONES),
      },
      {
        path: 'archivos',
        loadChildren: () => import('./modulos/archivos/rutas').then((m) => m.RUTAS_ARCHIVOS),
      },
      {
        path: 'auditoria',
        loadChildren: () => import('./modulos/auditoria/rutas').then((m) => m.RUTAS_AUDITORIA),
      },
      {
        path: 'analitica',
        loadChildren: () => import('./modulos/analitica/rutas').then((m) => m.RUTAS_ANALITICA),
      },
      {
        path: 'administracion',
        loadChildren: () => import('./modulos/administracion/rutas').then((m) => m.RUTAS_ADMINISTRACION),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'autenticacion/login',
  },
];
