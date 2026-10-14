import { Routes } from '@angular/router';

export const AUTENTICACAO_ROUTES: Routes = [
  { path: 'entrar', title: 'Entrar | Radar Financeiro', loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage) },
  { path: 'cadastro', title: 'Criar conta | Radar Financeiro', loadComponent: () => import('./pages/cadastro/cadastro.page').then(m => m.CadastroPage) },
];
