import { Routes } from '@angular/router';

export const CONFIGURACOES_ROUTES: Routes = [
  {
    path: 'configuracoes',
    pathMatch: 'full',
    title: 'Configurações | Radar Financeiro',
    loadComponent: () =>
      import('./pages/central-configuracoes/central-configuracoes.page')
        .then(m => m.CentralConfiguracoesPage),
  },
  {
    path: 'configuracoes/perfil',
    title: 'Meu perfil | Radar Financeiro',
    loadComponent: () =>
      import('./pages/meu-perfil/meu-perfil.page')
        .then(m => m.MeuPerfilPage),
  },
];
