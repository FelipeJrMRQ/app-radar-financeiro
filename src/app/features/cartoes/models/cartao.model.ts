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
  compraCartaoId: number;
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
