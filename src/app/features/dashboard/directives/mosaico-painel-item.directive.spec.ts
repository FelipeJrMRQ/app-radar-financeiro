import { calcularLinhasMosaico } from './mosaico-painel-item.directive';

describe('Mosaico adaptativo do painel', () => {
  it('calcula linhas suficientes para cards de alturas diferentes', () => {
    // Passo efetivo de 17px (linha de 4px e espaçamento de 13px).
    expect(calcularLinhasMosaico(700, 4, 13)).toBe(42);
    expect(calcularLinhasMosaico(160, 4, 13)).toBe(11);
    expect(calcularLinhasMosaico(190, 4, 13)).toBe(12);
  });

  it('ajusta o span quando uma lista ou gráfico altera a altura', () => {
    const inicialmente = calcularLinhasMosaico(160, 4, 13);
    const comMaisItens = calcularLinhasMosaico(380, 4, 13);
    expect(comMaisItens).toBeGreaterThan(inicialmente);
    expect(comMaisItens).toBe(24);
  });

  it('não cria spans inválidos com elementos vazios ou medidas indisponíveis', () => {
    expect(calcularLinhasMosaico(0, 4, 13)).toBe(1);
    expect(calcularLinhasMosaico(Number.NaN, 4, 13)).toBe(1);
    expect(calcularLinhasMosaico(350, 0, 13)).toBe(1);
    expect(calcularLinhasMosaico(350, 4, Number.NaN)).toBe(1);
    expect(calcularLinhasMosaico(350, 4, -3)).toBe(1);
  });

  it('sempre reserva espaço suficiente sem inflar a altura do card', () => {
    for (const altura of [38, 159, 270, 650, 885]) {
      const linhas = calcularLinhasMosaico(altura, 4, 13);
      const espacoReservado = linhas * 4 + (linhas - 1) * 13;
      expect(espacoReservado).toBeGreaterThanOrEqual(altura);
      expect(espacoReservado - altura).toBeLessThan(17);
    }
  });
});
