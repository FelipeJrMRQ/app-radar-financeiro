import { moverComponente, normalizarPreferencias, preferenciasPadrao } from './painel-preferencias.model';

describe('Organização do dashboard', () => {
  it('usa os cinco cards visíveis por padrão', () => {
    const p = preferenciasPadrao();
    expect(p.length).toBe(5);
    expect(p.every(item => item.visivel)).toBeTrue();
    expect(p[0].codigoComponente).toBe('CONTAS_RECEBER');
  });

  it('move itens e mantém ocultos na sequência', () => {
    const p = preferenciasPadrao();
    const ocultos = p.map(item => ({
      ...item, visivel: item.codigoComponente !== 'CONTAS_PAGAR',
    }));
    const movidos = moverComponente(ocultos, 1, 4);
    expect(movidos[4].codigoComponente).toBe('CONTAS_PAGAR');
    expect(movidos[4].visivel).toBeFalse();
    expect(movidos.map(item => item.ordemExibicao)).toEqual([0,1,2,3,4]);
  });

  it('mantém defaults para códigos novos e preserva preferências salvas', () => {
    const configuracao = normalizarPreferencias([
      { codigoComponente: 'FLUXO_CAIXA', visivel: false, ordemExibicao: 0 },
    ]);
    expect(configuracao[0].codigoComponente).toBe('FLUXO_CAIXA');
    expect(configuracao[0].visivel).toBeFalse();
    expect(configuracao[1].codigoComponente).toBe('CONTAS_RECEBER');
  });

  it('não cria códigos ou duplicações arbitrárias', () => {
    const configuracao = normalizarPreferencias([
      { codigoComponente: 'CONTAS_PAGAR', visivel: false, ordemExibicao: 0 },
      { codigoComponente: 'CONTAS_PAGAR', visivel: true, ordemExibicao: 1 },
    ]);
    expect(configuracao.length).toBe(5);
    expect(configuracao[0].visivel).toBeFalse();
  });
});
