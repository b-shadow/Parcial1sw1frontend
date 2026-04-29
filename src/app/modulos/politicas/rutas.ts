import { Routes } from '@angular/router';

export const RUTAS_POLITICAS: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./vistas/diseno-flujos-page.component').then((m) => m.DisenoFlujosPageComponent),
  },
];
