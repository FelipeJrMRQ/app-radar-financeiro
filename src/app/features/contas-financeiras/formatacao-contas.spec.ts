import { dataLocalIso, exibirData, normalizarSaldoInicial } from './formatacao-contas';

describe('Formatadores de contas', () => {
  it('normaliza saldo pt-BR sem usar ponto flutuante', () => {
    expect(normalizarSaldoInicial('1.234,5678')).toBe('1234.5678');
    expect(normalizarSaldoInicial('-30,50')).toBe('-30.50');
    expect(normalizarSaldoInicial('0,00')).toBe('0.00');
    expect(normalizarSaldoInicial('10.000.000,00')).toBe('10000000.00');
    expect(normalizarSaldoInicial('1,23456')).toBeNull();
    expect(normalizarSaldoInicial('12.34,10')).toBeNull();
    expect(normalizarSaldoInicial('1234567890123456,00')).toBeNull();
    expect(normalizarSaldoInicial('abc')).toBeNull();
  });

  it('exibe datas financeiras sem deslocamento de fuso', () => {
    expect(exibirData('2026-10-14')).toBe('14/10/2026');
    expect(dataLocalIso(new Date(2026, 9, 14))).toBe('2026-10-14');
  });
});
