import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ValorFinanceiroApi, formatarMoeda } from '../../../../shared/valor-monetario';
import { SaldoContaPainel } from '../../models/painel-financeiro.model';

@Component({ selector: 'app-saldos-contas-card', standalone: true, imports: [RouterLink],
  templateUrl: './saldos-contas.component.html' })
export class SaldosContasCardComponent {
  readonly contas = input.required<SaldoContaPainel[]>();
  readonly valoresVisiveis = input(false);
  readonly saldoConfirmado = input.required<ValorFinanceiroApi>();
  readonly saldoProjetado = input.required<ValorFinanceiroApi>();
  readonly moeda = formatarMoeda;
}
