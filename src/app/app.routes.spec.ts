import { routes } from './app.routes';

describe('Navegação do aplicativo', () => {
  const autenticada = routes.find(item => item.path === '' && item.children)?.children ?? [];

  it('expõe centrais de cadastros e configurações protegidas pelo shell', () => {
    expect(autenticada.map(item => item.path)).toContain('cadastros');
    expect(autenticada.map(item => item.path)).toContain('configuracoes');
    expect(autenticada.map(item => item.path)).toContain('configuracoes/perfil');
  });

  it('preserva as rotas operacionais de contas, categorias, lançamentos e personalização', () => {
    const existentes = ['contas', 'contas/nova', 'contas/:contaId',
      'categorias', 'lancamentos', 'lancamentos/novo', 'configuracoes/painel'];
    for (const rota of existentes) {
      expect(autenticada.find(item => item.path === rota))
        .withContext('Rota preservada: ' + rota).toBeDefined();
    }
  });
});
