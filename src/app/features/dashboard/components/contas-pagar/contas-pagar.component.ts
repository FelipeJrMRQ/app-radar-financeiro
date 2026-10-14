import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatarDiaMes, formatarDataLocal, formatarMoeda } from '../../../../shared/valor-monetario';
import { PendenciaPainel } from '../../models/painel-financeiro.model';

@Component({ selector: 'app-contas-pagar-card', standalone: true, imports: [RouterLink],
  templateUrl: './contas-pagar.component.html' })
export class ContasPagarCardComponent {
  readonly itens = input.required<PendenciaPainel[]>();
  readonly mesReferencia = input<string | null>(null);
  readonly moeda = formatarMoeda;
  readonly data = formatarDiaMes;
  readonly dataCompleta = formatarDataLocal;
}
