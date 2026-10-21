import { PontoFluxo } from '../models/painel-financeiro.model';

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
/**
 * Pontos adicionais são exclusivamente geométricos para o Chart.js:
 * dividem o segmento exatamente no cruzamento do eixo zero.
 * O saldo monetário por dia continua vindo integralmente da API.
 */
export function criarSerieConsolidadaParaGrafico(pontos: Array<{ saldo: number | string }>) {
  const serie: Array<{ x: number; y: number; cruzamento: boolean }> = [];
  pontos.forEach((ponto, indice) => {
    const atual = Number(ponto.saldo);
    if (indice > 0) {
      const anterior = Number(pontos[indice - 1].saldo);
      if (Number.isFinite(anterior) && Number.isFinite(atual) && anterior * atual < 0) {
        const fracao = Math.abs(anterior) / (Math.abs(anterior) + Math.abs(atual));
        serie.push({ x: indice - 1 + fracao, y: 0, cruzamento: true });
      }
    }
    serie.push({ x: indice, y: atual, cruzamento: false });
  });
  return serie;
}
