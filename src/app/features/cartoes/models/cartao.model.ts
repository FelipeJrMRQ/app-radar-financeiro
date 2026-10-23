import { ValorFinanceiroApi } from '../../../shared/valor-monetario';

export interface CartaoCredito {
  id: number;
  nome: string;
  limiteCredito: ValorFinanceiroApi;
  diaFechamento: number;
  diaVencimento: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}
export interface DadosCartaoCredito {
  nome: string;
  limiteCredito: string;
  diaFechamento: number;
  diaVencimento: number;
}
export interface CompraCartao {
  id: number;
  cartaoCreditoId: number;
  cartaoCreditoNome: string;
  categoriaId: number;
  categoriaNome: string;
  descricao: string;
  valorTotal: ValorFinanceiroApi;
  dataCompra: string;
  quantidadeParcelas: number;
  origem?: 'COMPRA' | 'CONCILIACAO';
  parcelaInicial?: number | null;
  observacao: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}
export interface DadosCompraCartao {
  categoriaId: number;
  descricao: string;
  valorTotal: string;
  dataCompra: string;
  observacao: string | null;
}
export interface DadosCompraParcelada extends DadosCompraCartao {
  quantidadeParcelas: number;
}
export interface ParcelaCompra {
  id: number;
  numeroParcela: number;
  quantidadeParcelas: number;
  valor: ValorFinanceiroApi;
  dataReferencia: string;
  ativo: boolean;
}
export interface CompraParceladaResultado {
  compra: CompraCartao;
  parcelas: ParcelaCompra[];
}
export interface ItemFatura {
  origem: string;
  compraCartaoId: number | null;
  parcelaCompraCartaoId: number | null;
  numeroParcela: number | null;
  quantidadeParcelas: number | null;
  categoriaId: number;
  categoriaNome: string;
  descricao: string;
  valor: ValorFinanceiroApi;
  dataReferencia: string;
}
export interface FaturaResumo {
  id: number | null;
  competencia: string;
  dataFechamento: string;
  dataVencimento: string;
  total: ValorFinanceiroApi;
}
export interface FaturaCartao extends FaturaResumo {
  cartaoCreditoId: number;
  cartaoCreditoNome: string;
  itens: ItemFatura[];
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}
export interface PagamentoFatura {
  id: number;
  faturaCartaoId: number;
  competencia: string;
  contaFinanceiraId: number;
  contaFinanceiraNome: string;
  valorPago: ValorFinanceiroApi;
  dataPagamento: string;
  criadoEm: string;
}
export interface ResumoPagamentos {
  faturaCartaoId: number | null;
  competencia: string;
  totalFatura: ValorFinanceiroApi;
  totalPago: ValorFinanceiroApi;
  saldoRestante: ValorFinanceiroApi;
  quitada: boolean;
  pagamentos: PagamentoFatura[];
}

// Onboarding manual: as parcelas anteriores à competência inicial já foram pagas
// fora do Radar e não devem gerar novas obrigações ou movimentações bancárias.
export interface ItemConciliacaoInicial {
  descricao: string;
  categoriaId: number;
  valorParcela: string;
  numeroParcela: number;
  quantidadeParcelas: number;
}
export interface AjusteConciliacaoInicial {
  descricao: string;
  categoriaId: number;
  valor: string; // sinal positivo = débito, negativo = crédito informado
}
export interface DadosConciliacaoInicial {
  chaveIdempotencia: string;
  competencia: string; // yyyy-MM
  valorFaturaBanco: string;
  itens: ItemConciliacaoInicial[];
  ajuste: AjusteConciliacaoInicial | null;
}
export interface PreviaConciliacaoInicial {
  competencia: string;
  valorFaturaBanco: ValorFinanceiroApi;
  valorAtualRadar: ValorFinanceiroApi;
  valorItensImportados: ValorFinanceiroApi;
  valorAjusteDeclarado: ValorFinanceiroApi;
  totalConciliado: ValorFinanceiroApi;
  diferenca: ValorFinanceiroApi;
  proximasFaturas: { competencia: string; totalPrevisto: ValorFinanceiroApi }[];
}
export interface ConfirmacaoConciliacaoInicial {
  jaConfirmada: boolean;
  competencia: string;
  totalConciliado: ValorFinanceiroApi;
}

// Correção segura, exclusiva para itens 1/1 da conciliação inicial.
export interface CorrecaoParcelamentoInicial {
  parcelaAtual: number;
  totalParcelas: number;
}
export interface ResultadoCorrecaoParcelamento {
  compraId: number;
  competencia: string;
  parcelaAtual: number;
  totalParcelas: number;
  valorParcela: ValorFinanceiroApi;
  compromissoRestante: ValorFinanceiroApi;
}
