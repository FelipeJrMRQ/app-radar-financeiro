import { grupoNavegacao } from './navegacao-grupos';

describe('Destaque das seções de navegação', () => {
  it('mantém Cadastros ativo ao navegar pelas contas e categorias', () => {
    expect(grupoNavegacao('/cadastros')).toBe('cadastros');
    expect(grupoNavegacao('/contas')).toBe('cadastros');
    expect(grupoNavegacao('/contas/nova')).toBe('cadastros');
    expect(grupoNavegacao('/contas/42?mes=10')).toBe('cadastros');
    expect(grupoNavegacao('/categorias')).toBe('cadastros');
  });

  it('mantém Configurações ativo ao navegar por perfil e personalização', () => {
    expect(grupoNavegacao('/configuracoes')).toBe('configuracoes');
    expect(grupoNavegacao('/configuracoes/painel')).toBe('configuracoes');
    expect(grupoNavegacao('/configuracoes/perfil')).toBe('configuracoes');
  });

  it('não classifica lançamentos como cadastros', () => {
    expect(grupoNavegacao('/')).toBe('principal');
    expect(grupoNavegacao('/lancamentos')).toBe('principal');
    expect(grupoNavegacao('/lancamentos/novo')).toBe('principal');
  });
});
