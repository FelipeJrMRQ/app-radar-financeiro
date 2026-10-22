import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

import { AUTENTICACAO_ROUTES } from './features/autenticacao/autenticacao.routes';
import { DASHBOARD_ROUTES } from './features/dashboard/dashboard.routes';
import { CONTAS_FINANCEIRAS_ROUTES } from './features/contas-financeiras/contas-financeiras.routes';
import { CATEGORIAS_ROUTES } from './features/categorias/categorias.routes';
import { LANCAMENTOS_ROUTES } from './features/lancamentos/lancamentos.routes';
import { TRANSFERENCIAS_ROUTES } from './features/transferencias/transferencias.routes';
import { CADASTROS_ROUTES } from './features/cadastros/cadastros.routes';
import { CONFIGURACOES_ROUTES } from './features/configuracoes/configuracoes.routes';

export const routes: Routes = [
  ...AUTENTICACAO_ROUTES,
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell').then(m => m.AppShell),
    children: [
      ...DASHBOARD_ROUTES,
      ...CADASTROS_ROUTES,
      ...CONFIGURACOES_ROUTES,
      ...CATEGORIAS_ROUTES,
      ...LANCAMENTOS_ROUTES,
      ...TRANSFERENCIAS_ROUTES,
      ...CONTAS_FINANCEIRAS_ROUTES,
    ],
  },
  { path: '**', redirectTo: '' },
];
