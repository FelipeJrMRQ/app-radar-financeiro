import { Routes } from '@angular/router';

export const TRANSFERENCIAS_ROUTES: Routes = [
  {
    path: 'transferencias',
    title: 'Transferências | Radar Financeiro',
    loadComponent: () => import('./pages/lista/transferencias.page').then(m => m.TransferenciasPage),
  },
  {
    path: 'transferencias/novo',
    title: 'Nova transferência | Radar Financeiro',
    loadComponent: () => import('./pages/formulario/transferencia-form.page').then(m => m.TransferenciaFormPage),
  },
  {
    path: 'transferencias/:transferenciaId/editar',
    title: 'Editar transferência | Radar Financeiro',
    loadComponent: () => import('./pages/formulario/transferencia-form.page').then(m => m.TransferenciaFormPage),
  },
];
