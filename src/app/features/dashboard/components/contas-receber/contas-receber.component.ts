import { Component, EventEmitter, input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatarDiaMes, formatarDataLocal, formatarMoeda } from '../../../../shared/valor-monetario';
import { PendenciaPainel } from '../../models/painel-financeiro.model';
import { LancamentoAcoesComponent } from '../../../lancamentos/components/lancamento-acoes/lancamento-acoes.component';

@Component({ selector: 'app-contas-receber-card', standalone: true, imports: [RouterLink, LancamentoAcoesComponent],
  templateUrl: './contas-receber.component.html' })
export class ContasReceberCardComponent {
  readonly itens = input.required<PendenciaPainel[]>();
  readonly valoresVisiveis = input(false);
  @Output() readonly alterado = new EventEmitter<void>();
  readonly mesReferencia = input<string | null>(null);
  readonly moeda = formatarMoeda;
  readonly data = formatarDiaMes;
  readonly dataCompleta = formatarDataLocal;
}
