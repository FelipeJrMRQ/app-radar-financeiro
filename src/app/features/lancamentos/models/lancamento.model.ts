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
