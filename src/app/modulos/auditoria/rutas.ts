import { Routes } from '@angular/router';

export const RUTAS_AUDITORIA: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./paginas/auditoria-page.component').then((m) => m.AuditoriaPageComponent),
  },
];
