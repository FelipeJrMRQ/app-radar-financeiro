import { decimalPositivo, formatarDataLocal, normalizarDecimalBr } from './valor-monetario';

describe('Conversão monetária sem arredondamento no formulário', () => {
  it('aceita centavos, milhar e quatro casas exatas', () => {
    expect(normalizarDecimalBr('1.234,5678')).toBe('1234.5678');
    expect(normalizarDecimalBr('-20,05')).toBe('-20.05');
    expect(decimalPositivo('0,0001')).toBe('0.0001');
    expect(decimalPositivo('1.000,00')).toBe('1000.00');
  });

  it('rejeita quantidades inválidas ou lançamentos não positivos', () => {
    expect(decimalPositivo('0,00')).toBeNull();
    expect(decimalPositivo('-1,00')).toBeNull();
    expect(decimalPositivo('1,00001')).toBeNull();
    expect(decimalPositivo('2.50')).toBeNull();
    expect(normalizarDecimalBr('1234567890123456,00')).toBeNull();
  });

  it('não altera uma data financeira por fuso', () => {
    expect(formatarDataLocal('2026-10-14')).toBe('14/10/2026');
  });
});
