import { Routes } from '@angular/router';

export const CONTAS_FINANCEIRAS_ROUTES: Routes = [
  { path: 'contas', title: 'Contas financeiras | Radar Financeiro', loadComponent: () => import('./pages/contas-lista/contas-lista.page').then(m => m.ContasListaPage) },
  { path: 'contas/nova', title: 'Nova conta | Radar Financeiro', loadComponent: () => import('./pages/conta-cadastro/conta-nova.page').then(m => m.ContaNovaPage) },
  { path: 'contas/:contaId', title: 'Detalhes da conta | Radar Financeiro', loadComponent: () => import('./pages/conta-detalhe/conta-detalhe.page').then(m => m.ContaDetalhePage) },
];
