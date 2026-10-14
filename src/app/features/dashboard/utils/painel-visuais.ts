import { PontoFluxo, TotalCategoria } from '../models/painel-financeiro.model';

/** Coordenadas para SVG, apenas visualização, nunca cálculos contábeis. */
export interface PontoGrafico {
  x: number;
  y: number;
  data: string;
}
export function criarPontosGrafico(pontos: PontoFluxo[], campo: 'saldoConfirmado' | 'saldoProjetado'): PontoGrafico[] {
  if (!pontos.length) return [];
  const valores = pontos.flatMap(p => [Number(p.saldoConfirmado), Number(p.saldoProjetado)]);
  const validos = valores.filter(Number.isFinite);
  if (!validos.length) return [];
  const minimo = Math.min(...validos);
  const maximo = Math.max(...validos);
  const amplitude = maximo - minimo || 1;
  return pontos.map((p, indice) => ({
    x: 14 + (indice / Math.max(1, pontos.length - 1)) * 680,
    y: 172 - ((Number(p[campo]) - minimo) / amplitude) * 150,
    data: p.data,
  }));
}
export function pontosSvg(pontos: PontoGrafico[]): string {
  return pontos.map(p => p.x.toFixed(2) + ',' + p.y.toFixed(2)).join(' ');
}
export function largurasCategorias(categorias: TotalCategoria[]): Array<TotalCategoria & { percentual: number }> {
  const numeros = categorias.map(c => Math.max(0, Number(c.valor)));
  const total = numeros.reduce((acumulado, atual) => acumulado + atual, 0);
  return categorias.map((c, i) => ({
    ...c,
    percentual: total > 0 ? Math.round(numeros[i] / total * 1000) / 10 : 0,
  }));
}
