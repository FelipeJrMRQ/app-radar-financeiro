export const CODIGOS_COMPONENTES = [
  'CONTAS_RECEBER',
  'CONTAS_PAGAR',
  'SALDOS_CONTAS',
  'FLUXO_CAIXA',
  'DESPESAS_CATEGORIA',
  'MEUS_CARTOES',
] as const;

export type CodigoComponentePainel = typeof CODIGOS_COMPONENTES[number];

export interface PreferenciaComponentePainel {
  codigoComponente: CodigoComponentePainel;
  ordemExibicao: number;
  visivel: boolean;
}

export const TITULOS_COMPONENTES: Readonly<Record<CodigoComponentePainel, string>> = {
  CONTAS_RECEBER: 'Contas a receber',
  CONTAS_PAGAR: 'Contas a pagar',
  SALDOS_CONTAS: 'Saldo das contas',
  FLUXO_CAIXA: 'Fluxo de caixa',
  DESPESAS_CATEGORIA: 'Despesas por categoria',
  MEUS_CARTOES: 'Meus cartões',
};

export function preferenciasPadrao(): PreferenciaComponentePainel[] {
  return CODIGOS_COMPONENTES.map((codigoComponente, ordemExibicao) =>
    ({ codigoComponente, ordemExibicao, visivel: true }));
}

/** Reconcilia novos componentes sem permitir códigos arbitrários do servidor. */
export function normalizarPreferencias(
  recebidas: ReadonlyArray<PreferenciaComponentePainel>,
): PreferenciaComponentePainel[] {
  const conhecidos = new Set<CodigoComponentePainel>(CODIGOS_COMPONENTES);
  const vistas = new Set<CodigoComponentePainel>();

  const validas = [...recebidas].filter(item => {
    if (!conhecidos.has(item.codigoComponente) || vistas.has(item.codigoComponente)) return false;
    vistas.add(item.codigoComponente);
    return true;
  }).sort((a, b) => a.ordemExibicao - b.ordemExibicao);
  const faltantes = CODIGOS_COMPONENTES
    .filter(codigo => !vistas.has(codigo))
    .map(codigoComponente => ({ codigoComponente, ordemExibicao: 0, visivel: true }));
  return [...validas, ...faltantes].map((item, ordemExibicao) =>
    ({ codigoComponente: item.codigoComponente, ordemExibicao, visivel: item.visivel }));
}

export function moverComponente(
  itens: ReadonlyArray<PreferenciaComponentePainel>,
  de: number, para: number,
): PreferenciaComponentePainel[] {
  if (de < 0 || para < 0 || de >= itens.length || para >= itens.length || de === para) {
    return [...itens];
  }
  const movidos = [...itens];
  const [item] = movidos.splice(de, 1);
  movidos.splice(para, 0, item);
  return movidos.map((atual, ordemExibicao) => ({ ...atual, ordemExibicao }));
}
