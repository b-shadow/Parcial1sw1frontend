import { Routes } from '@angular/router';

export const RUTAS_TAREAS: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./vistas/bandeja-tareas-page.component').then((m) => m.BandejaTareasPageComponent),
  },
];
