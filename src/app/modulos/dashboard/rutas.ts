import { Routes } from '@angular/router';

export const RUTAS_DASHBOARD: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./vistas/dashboard-page.component').then((m) => m.DashboardPageComponent),
  },
];

