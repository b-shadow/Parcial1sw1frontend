import { Routes } from '@angular/router';

export const RUTAS_TIPOS_TRAMITE: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./vistas/gestion-tipos-tramite-page.component').then((m) => m.GestionTiposTramitePageComponent),
  },
];
