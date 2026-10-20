import { criarPontosGrafico, criarSerieConsolidadaParaGrafico, largurasCategorias, pontosSvg } from './painel-visuais';

describe('Visualização de dados do painel', () => {
  it('não cria pontos falsos se a API não enviar movimento', () => {
    expect(criarPontosGrafico([], 'saldoProjetado')).toEqual([]);
    expect(pontosSvg([])).toBe('');
  });

  it('projeta saldo confirmado e projetado separadamente no SVG', () => {
    const dados = [
      { data: '2026-10-01', saldoConfirmado: 100, saldoProjetado: 90 },
      { data: '2026-10-02', saldoConfirmado: 100, saldoProjetado: 50 },
    ];
    const proj = criarPontosGrafico(dados, 'saldoProjetado');
    const conf = criarPontosGrafico(dados, 'saldoConfirmado');
    expect(proj).toHaveSize(2);
    expect(proj[1].y).toBeGreaterThan(conf[1].y);
  });

  it('muda a cor apenas no ponto real de cruzamento com zero', () => {
    const serie = criarSerieConsolidadaParaGrafico([
      { saldo: '100' }, { saldo: '-100' }, { saldo: '300' },
    ]);
    expect(serie).toEqual([
      { x: 0, y: 100, cruzamento: false },
      { x: 0.5, y: 0, cruzamento: true },
      { x: 1, y: -100, cruzamento: false },
      { x: 1.25, y: 0, cruzamento: true },
      { x: 2, y: 300, cruzamento: false },
    ]);
  });

  it('não cria cruzamentos extras entre dias de saldo positivo, zero e negativo', () => {
    const serie = criarSerieConsolidadaParaGrafico([
      { saldo: '100' }, { saldo: '0' }, { saldo: '-100' },
    ]);
    expect(serie).toHaveSize(3);
    expect(serie.every(ponto => !ponto.cruzamento)).toBeTrue();
  });

  it('calcula apenas percentual visual, sem redefinir total da API', () => {
    const dados = largurasCategorias([
      { categoriaId: 1, categoriaNome: 'Moradia', valor: 30 },
      { categoriaId: 2, categoriaNome: 'Saúde', valor: 70 },
    ]);
    expect(dados.map(c => c.percentual)).toEqual([30, 70]);
  });
});
