import { ValorFinanceiroApi } from '../../../shared/valor-monetario';
import { TipoCategoria } from '../../categorias/models/categoria.model';

export interface SaldoContaPainel {
  contaFinanceiraId: number;
  nome: string;
  saldoConfirmado: ValorFinanceiroApi;
  saldoProjetado: ValorFinanceiroApi;
}
export interface PendenciaPainel {
  lancamentoId: number;
  contaFinanceiraId: number;
  contaFinanceiraNome: string;
  descricao: string;
  categoriaNome: string;
  tipo: TipoCategoria;
  vencimento: string;
  valorOriginal: ValorFinanceiroApi;
  valorRestante: ValorFinanceiroApi;
  atrasado: boolean;
}
export interface FaturaPendentePainel {
  cartaoCreditoId: number;
  cartaoCreditoNome: string;
  competencia: string;
  vencimento: string;
  valorOriginal: ValorFinanceiroApi;
  valorRestante: ValorFinanceiroApi;
  atrasado: boolean;
  previa: boolean;
}
export interface PainelFinanceiro {
  dataInicio: string;
  dataFim: string;
  aReceberPeriodo: ValorFinanceiroApi;
  aPagarPeriodo: ValorFinanceiroApi;
  receberAtrasado: ValorFinanceiroApi;
  pagarAtrasado: ValorFinanceiroApi;
  saldoConfirmado: ValorFinanceiroApi;
  saldoProjetado: ValorFinanceiroApi;
  contas: SaldoContaPainel[];
  proximosVencimentos: PendenciaPainel[];
  /** Faturas previstas/pendentes, por cartão, sem lançamento bancário artificial. */
  faturasPagar?: FaturaPendentePainel[];
}
export interface PontoFluxo {
  data: string;
  saldoConfirmado: ValorFinanceiroApi;
  saldoProjetado: ValorFinanceiroApi;
}
export interface FluxoCaixaConta {
  contaFinanceiraId: number;
  dataInicio: string;
  dataFim: string;
  saldoConfirmadoAnterior: ValorFinanceiroApi;
  saldoConfirmadoFinal: ValorFinanceiroApi;
  saldoProjetadoFinal: ValorFinanceiroApi;
  pontos: PontoFluxo[];
}
export interface TotalCategoria {
  categoriaId: number;
  categoriaNome: string;
  valor: ValorFinanceiroApi;
}

/** Saldo diário consolidado calculado integralmente pelo backend. */
export interface PontoFluxoConsolidado {
  data: string;
  saldo: ValorFinanceiroApi;
  situacao: 'REALIZADO' | 'PROJETADO';
}
export interface ContaFluxoConsolidado {
  contaFinanceiraId: number;
  nome: string;
  saldoHoje: ValorFinanceiroApi;
  saldoFinal: ValorFinanceiroApi;
}
export interface FluxoCaixaConsolidado {
  dataInicio: string;
  dataFim: string;
  dataHoje: string;
  saldoHoje: ValorFinanceiroApi;
  saldoFinal: ValorFinanceiroApi;
  contas: ContaFluxoConsolidado[];
  pontos: PontoFluxoConsolidado[];
}
