import { Routes } from '@angular/router';

export const RUTAS_TRAMITES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./vistas/gestion-tramites-page.component').then((m) => m.GestionTramitesPageComponent),
  },
  {
    path: 'mis-tramites',
    loadComponent: () =>
      import('./vistas/mis-tramites-page.component').then((m) => m.MisTramitesPageComponent),
  },
];
