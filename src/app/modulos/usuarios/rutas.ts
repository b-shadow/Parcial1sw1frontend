import { Routes } from '@angular/router';

export const RUTAS_USUARIOS: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./vistas/gestion-usuarios-page.component').then((m) => m.GestionUsuariosPageComponent),
  },
];
