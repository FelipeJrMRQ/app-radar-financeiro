import { ValorFinanceiroApi } from '../../../shared/valor-monetario';

/** Calculado exclusivamente pelo Java a partir de compras e pagamentos registrados. */
export interface CartaoPainel {
  cartaoCreditoId: number;
  nome: string;
  competencia: string;
  dataFechamento: string;
  dataVencimento: string;
  limiteTotal: ValorFinanceiroApi;
  limiteComprometidoEstimado: ValorFinanceiroApi;
  limiteDisponivelEstimado: ValorFinanceiroApi;
  percentualUtilizacao: number;
  totalFatura: ValorFinanceiroApi;
  totalPago: ValorFinanceiroApi;
  saldoRestante: ValorFinanceiroApi;
  situacaoFatura: 'EM_ABERTO' | 'FECHADA' | 'QUITADA' | 'SEM_MOVIMENTACAO';
}
