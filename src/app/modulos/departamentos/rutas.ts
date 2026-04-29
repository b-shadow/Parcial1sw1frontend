import { Routes } from '@angular/router';

export const RUTAS_DEPARTAMENTOS: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./vistas/gestion-departamentos-page.component').then((m) => m.GestionDepartamentosPageComponent),
  },
];
