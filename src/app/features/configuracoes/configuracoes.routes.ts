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
    path: 'configuracoes/reiniciar-dados',
    title: 'Apagar dados financeiros | Radar Financeiro',
    loadComponent: () =>
      import('./pages/reiniciar-dados/reiniciar-dados.page')
        .then(m => m.ReiniciarDadosPage),
  },
  {
    path: 'configuracoes/perfil',
    title: 'Meu perfil | Radar Financeiro',
    loadComponent: () =>
      import('./pages/meu-perfil/meu-perfil.page')
        .then(m => m.MeuPerfilPage),
  },
];
