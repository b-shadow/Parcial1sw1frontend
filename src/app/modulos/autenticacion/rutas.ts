import { Routes } from '@angular/router';

export const RUTAS_AUTENTICACION: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./vistas/login-page.component').then((m) => m.LoginPageComponent),
  },
];
