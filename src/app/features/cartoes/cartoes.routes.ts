import { Routes } from '@angular/router';

export const CARTOES_ROUTES: Routes = [
  {
    path: 'cartoes',
    pathMatch: 'full',
    title: 'Cartões de crédito | Radar Financeiro',
    loadComponent: () => import('./pages/lista/cartoes.page').then(m => m.CartoesPage),
  },
  {
    path: 'cartoes/novo',
    title: 'Novo cartão | Radar Financeiro',
    loadComponent: () => import('./pages/formulario/cartao-form.page').then(m => m.CartaoFormPage),
  },
  {
    path: 'cartoes/:cartaoId/editar',
    title: 'Editar cartão | Radar Financeiro',
    loadComponent: () => import('./pages/formulario/cartao-form.page').then(m => m.CartaoFormPage),
  },
  {
    path: 'cartoes/:cartaoId',
    title: 'Detalhes do cartão | Radar Financeiro',
    loadComponent: () => import('./pages/detalhe/cartao-detalhe.page').then(m => m.CartaoDetalhePage),
  },
  {
    path: 'cartoes/:cartaoId/faturas/:competencia/pagar',
    title: 'Registrar pagamento de fatura | Radar Financeiro',
    loadComponent: () => import('./pages/pagamento/pagamento-fatura.page').then(m => m.PagamentoFaturaPage),
  },
  {
    path: 'cartoes/:cartaoId/compras/nova',
    title: 'Nova compra no cartão | Radar Financeiro',
    loadComponent: () => import('./pages/compra/compra-form.page').then(m => m.CompraCartaoFormPage),
  },
  {
    path: 'cartoes/:cartaoId/compras/:compraId/editar',
    title: 'Editar compra no cartão | Radar Financeiro',
    loadComponent: () => import('./pages/compra/compra-form.page').then(m => m.CompraCartaoFormPage),
  },
];
