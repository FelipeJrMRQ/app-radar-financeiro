import { Routes } from '@angular/router';

export const CADASTROS_ROUTES: Routes = [
  {
    path: 'cadastros',
    title: 'Cadastros | Radar Financeiro',
    loadComponent: () =>
      import('./pages/central-cadastros/central-cadastros.page')
        .then(m => m.CentralCadastrosPage),
  },
];
