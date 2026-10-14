import { Routes } from '@angular/router';

export const CATEGORIAS_ROUTES: Routes = [
  { path: 'categorias', title: 'Categorias | Radar Financeiro', loadComponent: () => import('./pages/categorias/categorias.page').then(m => m.CategoriasPage) },
];
