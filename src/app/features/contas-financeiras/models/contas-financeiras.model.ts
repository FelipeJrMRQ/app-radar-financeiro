/** Contratos conferidos nos DTOs do backend: radar-financeiro-api. */
export type TipoContaFinanceira =
  | 'CONTA_CORRENTE'
  | 'POUPANCA'
  | 'CARTEIRA'
  | 'CONTA_PAGAMENTO'
  | 'OUTROS';

export const TIPOS_CONTA: ReadonlyArray<{ valor: TipoContaFinanceira; descricao: string }> = [
  { valor: 'CONTA_CORRENTE', descricao: 'Conta corrente' },
  { valor: 'POUPANCA', descricao: 'Poupança' },
  { valor: 'CARTEIRA', descricao: 'Carteira / dinheiro' },
  { valor: 'CONTA_PAGAMENTO', descricao: 'Conta de pagamento' },
  { valor: 'OUTROS', descricao: 'Outros' },
];

/** BigDecimal do backend costuma ser serializado como JSON number. Não efetuar cálculos de negócio. */
export type ValorApi = number | string;

export interface ContaFinanceira {
  id: number;
  nome: string;
  tipo: TipoContaFinanceira;
  saldoInicial: ValorApi;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriarContaFinanceira {
  nome: string;
  tipo: TipoContaFinanceira;
  /** String decimal canônica para que o formulário não introduza arredondamento IEEE-754. */
  saldoInicial: string;
}

/** A API verifica inclusive vínculos financeiros inativos ou históricos. */
export interface UsoContaFinanceira {
  utilizada: boolean;
  podeExcluirDefinitivamente: boolean;
}

/** A edição utiliza o mesmo contrato financeiro exato do cadastro. */
export type AtualizarContaFinanceira = CriarContaFinanceira;

export interface SaldoContaFinanceira {
  contaFinanceiraId: number;
  contaFinanceiraNome: string;
  saldoInicial: ValorApi;
  totalReceitas: ValorApi;
  totalDespesas: ValorApi;
  totalTransferenciasRecebidas: ValorApi;
  totalTransferenciasEnviadas: ValorApi;
  totalPagamentosFaturas: ValorApi;
  saldoAtual: ValorApi;
  saldoConfirmado: ValorApi;
}

export type TipoMovimentoExtrato =
  | 'LANCAMENTO'
  | 'REALIZACAO_LANCAMENTO'
  | 'TRANSFERENCIA_ENTRADA'
  | 'TRANSFERENCIA_SAIDA'
  | 'PAGAMENTO_FATURA';

export type SituacaoMovimentoExtrato = 'CONFIRMADO' | 'PREVISTO';

export interface MovimentoExtrato {
  referenciaId: number;
  tipoMovimento: TipoMovimentoExtrato;
  situacao: SituacaoMovimentoExtrato;
  data: string;
  descricao: string;
  categoriaNome: string | null;
  valor: ValorApi;
  saldoConfirmadoApos: ValorApi;
  saldoProjetadoApos: ValorApi;
}

export interface ExtratoContaFinanceira {
  contaFinanceiraId: number;
  contaFinanceiraNome: string;
  dataInicio: string;
  dataFim: string;
  saldoConfirmadoAnterior: ValorApi;
  saldoProjetadoAnterior: ValorApi;
  saldoConfirmadoFinal: ValorApi;
  saldoProjetadoFinal: ValorApi;
  movimentos: MovimentoExtrato[];
}

export function descricaoTipoConta(tipo: TipoContaFinanceira): string {
  return TIPOS_CONTA.find((opcao) => opcao.valor === tipo)?.descricao ?? tipo;
}
