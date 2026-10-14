import { Component, computed, EventEmitter, input, Output } from '@angular/core';
import { formatarDiaMes, formatarDataLocal, formatarMoeda } from '../../../../shared/valor-monetario';
import { FluxoCaixaConta, SaldoContaPainel } from '../../models/painel-financeiro.model';
import { criarPontosGrafico, pontosSvg } from '../../utils/painel-visuais';

@Component({ selector: 'app-fluxo-caixa-card', standalone: true,
  templateUrl: './fluxo-caixa.component.html' })
export class FluxoCaixaCardComponent {
  readonly contas = input.required<SaldoContaPainel[]>();
  readonly contaId = input<number | null>(null);
  readonly fluxo = input<FluxoCaixaConta | null>(null);
  readonly carregandoFluxo = input(false);
  readonly erroFluxo = input<string | null>(null);
  @Output() readonly contaAlterada = new EventEmitter<number | null>();
  readonly saldoConfirmadoSvg = computed(() => pontosSvg(criarPontosGrafico(this.fluxo()?.pontos ?? [], 'saldoConfirmado')));
  readonly saldoProjetadoSvg = computed(() => pontosSvg(criarPontosGrafico(this.fluxo()?.pontos ?? [], 'saldoProjetado')));
  readonly moeda = formatarMoeda;
  readonly data = formatarDiaMes;
  readonly dataCompleta = formatarDataLocal;
  alterarConta(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    this.contaAlterada.emit(Number.isSafeInteger(id) && id > 0 ? id : null);
  }
}
