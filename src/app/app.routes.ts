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
    ],
  },
  { path: '**', redirectTo: '' },
];
