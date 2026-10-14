/** Exibição apenas: cálculos financeiros permanecem no backend BigDecimal. */
export type ValorFinanceiroApi = number | string;
const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export function formatarMoeda(valor: ValorFinanceiroApi): string {
  const numero = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(numero) ? formatter.format(numero) : 'Valor indisponível';
}

/**
 * pt-BR -> decimal textual sem usar Number ou parseFloat.
 * Aceita agrupamento por ponto, sinal opcional e até 4 casas decimais.
 * No máximo 15 dígitos inteiros conforme DECIMAL(19,4).
 */
export function normalizarDecimalBr(valor: string): string | null {
  const partes = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,4}))?$/.exec(valor.trim());
  if (!partes) return null;
  const inteira = partes[2].replace(/\./g, '').replace(/^0+(?=\d)/, '');
  if (inteira.length > 15) return null;
  return partes[1] + inteira + (partes[3] ? '.' + partes[3] : '');
}

export function decimalPositivo(valor: string): string | null {
  const normalizado = normalizarDecimalBr(valor);
  if (normalizado === null || normalizado.startsWith('-') || !/[1-9]/.test(normalizado)) {
    return null;
  }
  return normalizado;
}

export function formatarDataLocal(dataIso: string): string {
  const data = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataIso);
  return data ? data[3] + '/' + data[2] + '/' + data[1] : dataIso;
}

export function dataHojeLocal(): string {
  const data = new Date();
  return data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0')
    + '-' + String(data.getDate()).padStart(2, '0');
}
