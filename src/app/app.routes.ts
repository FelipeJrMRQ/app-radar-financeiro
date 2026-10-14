import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'entrar',
    title: 'Entrar | Radar Financeiro',
    loadComponent: () =>
      import('./features/autenticacao/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'cadastro',
    title: 'Criar conta | Radar Financeiro',
    loadComponent: () =>
      import('./features/autenticacao/cadastro.page').then((m) => m.CadastroPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Início | Radar Financeiro',
        loadComponent: () =>
          import('./features/dashboard/inicio.page').then((m) => m.InicioPage),
      },
      {
        path: 'categorias',
        title: 'Categorias | Radar Financeiro',
        loadComponent: () =>
          import('./features/categorias/categorias.page').then(m => m.CategoriasPage),
      },
      {
        path: 'lancamentos',
        title: 'Lançamentos | Radar Financeiro',
        loadComponent: () =>
          import('./features/lancamentos/lancamentos.page').then(m => m.LancamentosPage),
      },
      {
        path: 'lancamentos/novo',
        title: 'Novo lançamento | Radar Financeiro',
        loadComponent: () =>
          import('./features/lancamentos/lancamento-novo.page').then(m => m.LancamentoNovoPage),
      },
      {
        path: 'contas',
        title: 'Contas financeiras | Radar Financeiro',
        loadComponent: () =>
          import('./features/contas-financeiras/contas-lista.page').then((m) => m.ContasListaPage),
      },
      {
        path: 'contas/nova',
        title: 'Nova conta | Radar Financeiro',
        loadComponent: () =>
          import('./features/contas-financeiras/conta-nova.page').then((m) => m.ContaNovaPage),
      },
      {
        path: 'contas/:contaId',
        title: 'Detalhes da conta | Radar Financeiro',
        loadComponent: () =>
          import('./features/contas-financeiras/conta-detalhe.page').then((m) => m.ContaDetalhePage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
