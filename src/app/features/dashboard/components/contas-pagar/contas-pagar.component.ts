import { Component, computed, EventEmitter, input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatarDiaMes, formatarDataLocal, formatarMoeda } from '../../../../shared/valor-monetario';
import { FaturaPendentePainel, PendenciaPainel } from '../../models/painel-financeiro.model';
import { LancamentoAcoesComponent } from '../../../lancamentos/components/lancamento-acoes/lancamento-acoes.component';

type ItemAPagar =
  | { origem: 'LANCAMENTO'; chave: string; vencimento: string; descricao: string;
      valorRestante: PendenciaPainel['valorRestante']; atrasado: boolean; lancamentoId: number }
  | { origem: 'FATURA_CARTAO'; chave: string; vencimento: string; descricao: string;
      valorRestante: FaturaPendentePainel['valorRestante']; atrasado: boolean;
      cartaoCreditoId: number; competencia: string; previa: boolean };

@Component({ selector: 'app-contas-pagar-card', standalone: true, imports: [RouterLink, LancamentoAcoesComponent],
  templateUrl: './contas-pagar.component.html' })
export class ContasPagarCardComponent {
  readonly itens = input.required<PendenciaPainel[]>();
  readonly faturas = input<FaturaPendentePainel[]>([]);
  @Output() readonly alterado = new EventEmitter<void>();
  readonly mesReferencia = input<string | null>(null);
  readonly moeda = formatarMoeda;
  readonly data = formatarDiaMes;
  readonly dataCompleta = formatarDataLocal;

  /** Ordena obrigações de origens diferentes sem fundi-las artificialmente. */
  readonly obrigacoes = computed<ItemAPagar[]>(() => {
    const lancamentos: ItemAPagar[] = this.itens().map(item => ({
      origem: 'LANCAMENTO', chave: 'lancamento-' + item.lancamentoId,
      vencimento: item.vencimento, descricao: item.descricao,
      valorRestante: item.valorRestante, atrasado: item.atrasado,
      lancamentoId: item.lancamentoId,
    }));
    const faturas: ItemAPagar[] = this.faturas().map(item => ({
      origem: 'FATURA_CARTAO',
      chave: 'fatura-' + item.cartaoCreditoId + '-' + item.competencia,
      vencimento: item.vencimento,
      descricao: 'Fatura ' + item.cartaoCreditoNome,
      valorRestante: item.valorRestante, atrasado: item.atrasado,
      cartaoCreditoId: item.cartaoCreditoId,
      competencia: item.competencia.slice(0, 7),
      previa: item.previa,
    }));
    return [...lancamentos, ...faturas]
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.chave.localeCompare(b.chave))
      .slice(0, 5);
  });
}
