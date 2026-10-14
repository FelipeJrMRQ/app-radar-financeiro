import { ValorApi } from '../models/contas-financeiras.model';

const moedaBrasil = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Apenas representação visual, nunca operações contábeis. */
export function exibirMoeda(valor: ValorApi): string {
  const numero = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(numero) ? moedaBrasil.format(numero) : 'Valor indisponível';
}

export function valorNegativo(valor: ValorApi): boolean {
  return Number(valor) < 0;
}

/** Data LocalDate (yyyy-MM-dd) sem transformação por fuso horário. */
export function exibirData(data: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  return partes ? partes[3] + '/' + partes[2] + '/' + partes[1] : data;
}

/** Conversão textual pt-BR -> decimal exato (DECIMAL(19,4)), sem usar float. */
export function normalizarSaldoInicial(valor: string): string | null {
  const limpo = valor.trim();
  const formato = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,4}))?$/.exec(limpo);
  if (!formato) return null;
  const parteInteira = formato[2].replace(/\./g, '').replace(/^0+(?=\d)/, '');
  if (parteInteira.length > 15) return null;
  return formato[1] + parteInteira + (formato[3] ? '.' + formato[3] : '');
}

export function dataLocalIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return ano + '-' + mes + '-' + dia;
}
