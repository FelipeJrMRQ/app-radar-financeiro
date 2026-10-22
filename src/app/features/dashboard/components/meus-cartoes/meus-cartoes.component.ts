import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { formatarDataLocal, formatarMoeda } from '../../../../shared/valor-monetario';
import { CartaoPainel } from '../../models/painel-cartoes.model';

@Component({
  selector: 'app-meus-cartoes-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './meus-cartoes.component.html',
})
export class MeusCartoesCardComponent {
  readonly cartoes = input.required<CartaoPainel[]>();
  readonly carregando = input(false);
  readonly erro = input<string | null>(null);
  readonly valoresVisiveis = input(true);
  readonly competencia = input.required<string>();

  // Mantém o mesmo cartão selecionado após atualizar a competência e os dados
  // do painel. Se ele foi removido, retorna ao primeiro cartão disponível.
  private readonly cartaoSelecionadoId = signal<number | null>(null);
  readonly indiceAtual = computed(() => {
    const lista = this.cartoes();
    const indice = lista.findIndex(c => c.cartaoCreditoId === this.cartaoSelecionadoId());
    return indice >= 0 ? indice : 0;
  });
  readonly cartaoAtual = computed(() => this.cartoes()[this.indiceAtual()] ?? null);

  navegar(direcao: -1 | 1): void {
    const lista = this.cartoes();
    if (lista.length < 2) return;
    const proximoIndice = (this.indiceAtual() + direcao + lista.length) % lista.length;
    this.cartaoSelecionadoId.set(lista[proximoIndice].cartaoCreditoId);
  }

  readonly moeda = formatarMoeda;
  readonly data = formatarDataLocal;

  situacao(cartao: CartaoPainel): string {
    switch (cartao.situacaoFatura) {
      case 'QUITADA': return 'Quitada';
      case 'FECHADA': return 'Fechada';
      case 'SEM_MOVIMENTACAO': return 'Sem compras';
      default: return 'Em aberto';
    }
  }
}
