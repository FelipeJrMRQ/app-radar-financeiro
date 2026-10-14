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
