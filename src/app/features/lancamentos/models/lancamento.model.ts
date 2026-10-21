import { ValorFinanceiroApi } from '../../../shared/valor-monetario';
import { TipoCategoria } from '../../categorias/models/categoria.model';

export type SituacaoLancamento = 'PREVISTO' | 'CONFIRMADO';

export interface Lancamento {
  id: number;
  contaFinanceiraId: number;
  contaFinanceiraNome: string;
  categoriaId: number;
  categoriaNome: string;
  tipo: TipoCategoria;
  descricao: string;
  valor: ValorFinanceiroApi;
  dataLancamento: string;
  situacao: SituacaoLancamento;
  valorEfetivo: ValorFinanceiroApi | null;
  dataEfetiva: string | null;
  recorrenciaLancamentoId: number | null;
  dataReferenciaRecorrencia: string | null;
  observacao: string | null;
  parcelamentoLancamentoId: number | null;
  numeroParcela: number | null;
  quantidadeParcelas: number | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriarLancamento {
  contaFinanceiraId: number;
  categoriaId: number;
  descricao: string;
  /** Valor monetário estritamente textual: BigDecimal(19,4) é resolvido no Spring. */
  valor: string;
  dataLancamento: string;
  observacao: string | null;
  situacaoInicial: SituacaoLancamento;
}

export interface CriarRecorrenciaLancamento {
  contaFinanceiraId: number;
  categoriaId: number;
  descricao: string;
  valor: string;
  dataInicio: string;
  dataFim: string | null;
  observacao: string | null;
}

export interface CriarParcelamentoLancamento {
  contaFinanceiraId: number;
  categoriaId: number;
  descricao: string;
  valorTotal: string;
  quantidadeParcelas: number;
  primeiroVencimento: string;
  observacao: string | null;
}

/** Filtros comuns à listagem e ao resumo calculado no backend. */
export interface FiltroLancamentosPeriodo {
  contaFinanceiraId: number | null;
  tipo: TipoCategoria | null;
  dataInicio: string;
  dataFim: string;
}

export interface ResumoLancamentosPeriodo {
  dataInicio: string;
  dataFim: string;
  tipo: TipoCategoria | null;
  contaFinanceiraId: number | null;
  /** Soma bruta dos valores originais, previstos e confirmados. */
  totalLancado: ValorFinanceiroApi;
}

export interface AtualizarLancamento {
  contaFinanceiraId: number;
  categoriaId: number;
  descricao: string;
  valor: string;
  dataLancamento: string;
  observacao: string | null;
}

export interface ConfirmacaoLancamento {
  valorEfetivo: string;
  dataEfetiva: string;
}

export interface RealizacaoLancamento {
  id: number;
  valor: ValorFinanceiroApi;
  dataRealizacao: string;
  criadoEm: string;
}

export interface ResumoRealizacoesLancamento {
  lancamentoId: number;
  valorPrevisto: ValorFinanceiroApi;
  totalRealizado: ValorFinanceiroApi;
  saldoRestante: ValorFinanceiroApi;
  situacao: SituacaoLancamento;
  realizacoes: RealizacaoLancamento[];
}

export type EscopoSequencia = 'ATUAL' | 'SEGUINTES';

/** A decisão visual nunca substitui as verificações no Spring Boot. */
export function permiteSequencia(l: Lancamento, hoje: string): boolean {
  return l.ativo && l.situacao === 'PREVISTO'
    && l.dataLancamento >= hoje
    && (l.recorrenciaLancamentoId != null || l.parcelamentoLancamentoId != null);
}

export function modalidadeLancamento(l: Lancamento): 'UNICO' | 'RECORRENTE' | 'PARCELADO' {
  return l.parcelamentoLancamentoId != null ? 'PARCELADO'
    : l.recorrenciaLancamentoId != null ? 'RECORRENTE' : 'UNICO';
}
