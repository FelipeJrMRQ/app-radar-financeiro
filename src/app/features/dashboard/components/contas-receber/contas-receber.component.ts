import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ValorFinanceiroApi, formatarDataLocal, formatarMoeda } from '../../../../shared/valor-monetario';
import { PendenciaPainel } from '../../models/painel-financeiro.model';

@Component({ selector: 'app-contas-receber-card', standalone: true, imports: [RouterLink],
  templateUrl: './contas-receber.component.html' })
export class ContasReceberCardComponent {
  readonly itens = input.required<PendenciaPainel[]>();
  readonly total = input.required<ValorFinanceiroApi>();
  readonly moeda = formatarMoeda;
  readonly data = formatarDataLocal;
}
