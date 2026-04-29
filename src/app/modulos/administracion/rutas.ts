import { Routes } from '@angular/router';

export const RUTAS_ADMINISTRACION: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'perfil',
  },
  {
    path: 'perfil',
    loadComponent: () =>
      import('./vistas/perfil-preferencias-page.component').then((m) => m.PerfilPreferenciasPageComponent),
  },
];
