import { Routes } from '@angular/router';

export const LANCAMENTOS_ROUTES: Routes = [
  { path: 'lancamentos', title: 'Lançamentos | Radar Financeiro', loadComponent: () => import('./pages/lancamentos/lancamentos.page').then(m => m.LancamentosPage) },
  { path: 'lancamentos/:lancamentoId/editar', title: 'Editar lançamento | Radar Financeiro', loadComponent: () => import('./pages/lancamento-edicao/lancamento-edicao.page').then(m => m.LancamentoEdicaoPage) },
  { path: 'lancamentos/novo', title: 'Novo lançamento | Radar Financeiro', loadComponent: () => import('./pages/lancamento-cadastro/lancamento-novo.page').then(m => m.LancamentoNovoPage) },
];
