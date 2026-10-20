import { prepararDespesasRosca } from './despesas-rosca';

describe('Gráfico de rosca de despesas por categoria', () => {
  it('preserva o total realizado, a ordem por valor e percentuais da API', () => {
    const dados = prepararDespesasRosca([
      { categoriaId: 3, categoriaNome: 'Lazer', valor: '40.12' },
      { categoriaId: 1, categoriaNome: 'Compras', valor: '750.00' },
      { categoriaId: 2, categoriaNome: 'Moradia', valor: '90.12' },
    ]);

    expect(dados.total).toBe('880.2400');
    expect(dados.totalFormatado).toBe('R$\u00a0880,24');
    expect(dados.fatias.map(item => item.nome)).toEqual(['Compras', 'Moradia', 'Lazer']);
    expect(dados.fatias.map(item => item.percentual)).toEqual([85.2, 10.2, 4.6]);
    expect(dados.fatias.map(item => item.valorFormatado))
      .toEqual(['R$\u00a0750,00', 'R$\u00a090,12', 'R$\u00a040,12']);
  });

  it('exibe as cinco maiores categorias e reúne as demais em Outras sem perda de centavos', () => {
    const dados = prepararDespesasRosca([
      { categoriaId: 7, categoriaNome: 'G', valor: '0.0040' },
      { categoriaId: 6, categoriaNome: 'F', valor: '0.0060' },
      { categoriaId: 5, categoriaNome: 'E', valor: '25' },
      { categoriaId: 3, categoriaNome: 'C', valor: '100' },
      { categoriaId: 1, categoriaNome: 'A', valor: '600' },
      { categoriaId: 2, categoriaNome: 'B', valor: '200' },
      { categoriaId: 4, categoriaNome: 'D', valor: '50' },
    ]);

    expect(dados.total).toBe('975.0100');
    expect(dados.fatias).toHaveSize(6);
    expect(dados.fatias.map(item => item.nome)).toEqual(['A', 'B', 'C', 'D', 'E', 'Outras']);
    const outras = dados.fatias[5];
    expect(outras.chave).toBe('outras');
    expect(outras.quantidadeAgrupada).toBe(2);
    expect(outras.valor).toBe('0.0100');
    expect(outras.valorFormatado).toBe('R$\u00a00,01');
    expect(dados.fatias.map(item => item.cor).every((cor, i, todos) =>
      todos.indexOf(cor) === i)).toBeTrue();
  });

  it('não gera outras quando há exatamente cinco categorias', () => {
    const dados = prepararDespesasRosca(
      [5, 4, 3, 2, 1].map(id => ({
        categoriaId: id, categoriaNome: 'Categoria ' + id, valor: String(id),
      })),
    );

    expect(dados.fatias).toHaveSize(5);
    expect(dados.fatias.some(item => item.nome === 'Outras')).toBeFalse();
  });

  it('arredonda somente a exibição mantendo quatro decimais na soma', () => {
    const dados = prepararDespesasRosca([
      { categoriaId: 1, categoriaNome: 'A', valor: '0.0050' },
      { categoriaId: 2, categoriaNome: 'B', valor: '0.0050' },
    ]);
    expect(dados.total).toBe('0.0100');
    expect(dados.totalFormatado).toBe('R$\u00a00,01');
    expect(dados.fatias[0].valor).toBe('0.0050');
  });

  it('não apresenta gráfico fictício quando não há despesas positivas', () => {
    const dados = prepararDespesasRosca([
      { categoriaId: 1, categoriaNome: 'A', valor: '0' },
      { categoriaId: 2, categoriaNome: 'B', valor: '-10.00' },
      { categoriaId: 3, categoriaNome: 'C', valor: 'inválido' },
    ]);
    expect(dados.fatias).toEqual([]);
    expect(dados.totalFormatado).toBe('R$\u00a00,00');
    expect(prepararDespesasRosca([]).fatias).toEqual([]);
  });

  it('desempata valores iguais pelo nome para manter ordem estável', () => {
    const dados = prepararDespesasRosca([
      { categoriaId: 4, categoriaNome: 'Zebra', valor: 30 },
      { categoriaId: 3, categoriaNome: 'Água', valor: 30 },
    ]);
    expect(dados.fatias.map(item => item.nome)).toEqual(['Água', 'Zebra']);
    expect(dados.fatias.map(item => item.percentual)).toEqual([50, 50]);
  });
});
