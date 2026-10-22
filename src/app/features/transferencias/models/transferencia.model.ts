import { ValorFinanceiroApi } from '../../../shared/valor-monetario';

export type SituacaoTransferencia = 'PREVISTO' | 'CONFIRMADO';

export interface Transferencia {
  id: number;
  contaOrigemId: number;
  contaOrigemNome: string;
  contaDestinoId: number;
  contaDestinoNome: string;
  valor: ValorFinanceiroApi;
  dataTransferencia: string;
  situacao: SituacaoTransferencia;
  valorEfetivo: ValorFinanceiroApi | null;
  dataEfetiva: string | null;
  descricao: string;
  observacao: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface GravarTransferencia {
  contaOrigemId: number;
  contaDestinoId: number;
  /** Decimal exato normalizado; o backend utiliza BigDecimal. */
  valor: string;
  dataTransferencia: string;
  descricao: string;
  observacao: string | null;
}

export interface ConfirmarTransferencia {
  valorEfetivo: string;
  dataEfetiva: string;
}
