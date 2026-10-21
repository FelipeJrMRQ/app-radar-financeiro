import { ValorFinanceiroApi } from '../../../shared/valor-monetario';

/**
 * Soma de valores da API em unidades de 1/10000 de real.
 * Não usa Number/parseFloat, evitando perdas de precisão ao somar saldos.
 */
export function somarSaldos(valores: readonly ValorFinanceiroApi[]): bigint {
  return valores.reduce<bigint>((acumulado, valor) => {
    const partes = /^(-?)(\d+)(?:\.(\d{1,4}))?$/.exec(String(valor));
    if (!partes) throw new Error('Formato de saldo inválido na resposta da API.');
    const integral = BigInt(partes[2]);
    const decimal = BigInt((partes[3] ?? '').padEnd(4, '0'));
    const quantidade = integral * 10000n + decimal;
    return acumulado + (partes[1] === '-' ? -quantidade : quantidade);
  }, 0n);
}

/** Apresentação pt-BR com arredondamento exato para centavos. */
export function formatarSomaSaldos(unidades: bigint): string {
  const absoluto = unidades < 0n ? -unidades : unidades;
  const centavos = (absoluto + 50n) / 100n;
  const reais = (centavos / 100n).toLocaleString('pt-BR');
  const fracao = (centavos % 100n).toString().padStart(2, '0');
  return (unidades < 0n ? '-' : '') + 'R$\u00a0' + reais + ',' + fracao;
}
