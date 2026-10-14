import { ValorFinanceiroApi } from '../../shared/valor-monetario';
import { TipoCategoria } from '../categorias/categoria.model';

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
}
