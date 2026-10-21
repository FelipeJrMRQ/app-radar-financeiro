import { formatarSomaSaldos, somarSaldos } from './saldos-selecionados';

describe('Totalização exata de saldos selecionados', () => {
  it('soma valores positivos e negativos sem erros de ponto flutuante', () => {
    expect(somarSaldos(['0.10', '0.20', '-0.05'])).toBe(2500n);
    expect(formatarSomaSaldos(2500n)).toContain('0,25');
    expect(formatarSomaSaldos(somarSaldos(['169.59', '-891.08']))).toContain('-R$');
    expect(formatarSomaSaldos(somarSaldos(['169.59', '-891.08']))).toContain('721,49');
  });

  it('considera nenhuma conta como saldo zero', () => {
    expect(somarSaldos([])).toBe(0n);
    expect(formatarSomaSaldos(0n)).toContain('0,00');
  });

  it('preserva quatro casas decimais e valores elevados sem perder centavos', () => {
    expect(somarSaldos(['0.0001', '0.0002', '0.0003'])).toBe(6n);
    expect(somarSaldos(['999999999999999.9999', '0.0001']))
      .toBe(10000000000000000000n);
    expect(formatarSomaSaldos(somarSaldos(['999999999999999.9999', '0.0001'])))
      .toContain('1.000.000.000.000.000,00');
  });

  it('arredonda para centavos apenas na formatação', () => {
    expect(formatarSomaSaldos(12345n)).toContain('1,23');
    expect(formatarSomaSaldos(12350n)).toContain('1,24');
    expect(formatarSomaSaldos(-12350n)).toContain('1,24');
  });

  it('não interpreta como zero um valor monetário malformado', () => {
    expect(() => somarSaldos(['NaN'])).toThrowError(/saldo inválido/i);
  });
});
