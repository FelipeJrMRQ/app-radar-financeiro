import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  { path: '', pathMatch: 'full', title: 'Início | Radar Financeiro', loadComponent: () => import('./pages/dashboard/inicio.page').then(m => m.InicioPage) },
  { path: 'configuracoes/painel', title: 'Personalizar painel | Radar Financeiro', loadComponent: () => import('./pages/personalizar-painel/personalizar-painel.page').then(m => m.PersonalizarPainelPage) },
];
