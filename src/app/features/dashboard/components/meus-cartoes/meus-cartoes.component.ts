import { Component, input } from '@angular/core';
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
