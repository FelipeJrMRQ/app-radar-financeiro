import { Component, computed, EventEmitter, input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ValorFinanceiroApi, formatarMoeda } from '../../../../shared/valor-monetario';
import { SaldoContaPainel } from '../../models/painel-financeiro.model';

@Component({
  selector: 'app-saldos-contas-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './saldos-contas.component.html',
  styleUrl: './saldos-contas.component.scss',
})
export class SaldosContasCardComponent {
  readonly contas = input.required<SaldoContaPainel[]>();
  readonly saldoConfirmado = input.required<ValorFinanceiroApi>();
  readonly saldoProjetado = input.required<ValorFinanceiroApi>();
  readonly valoresVisiveis = input(false);

  // Reutiliza as preferências do gráfico de fluxo de caixa: não cria seleção paralela.
  readonly contasSelecionadas = input<number[]>([]);
  readonly contasSelecionaveis = input<number[]>([]);
  @Output() readonly selecaoAlterada = new EventEmitter<number[]>();

  readonly todasSelecionadas = computed(() => {
    const permitidas = this.contasSelecionaveis();
    return permitidas.length > 0 &&
      permitidas.every(id => this.contasSelecionadas().includes(id));
  });
  readonly parcialmenteSelecionadas = computed(() => {
    const selecionadas = this.contasSelecionadas();
    const permitidas = this.contasSelecionaveis();
    return permitidas.some(id => selecionadas.includes(id)) && !this.todasSelecionadas();
  });

  readonly moeda = formatarMoeda;

  estaSelecionada(id: number): boolean {
    return this.contasSelecionadas().includes(id);
  }

  podeSelecionar(id: number): boolean {
    return this.contasSelecionaveis().includes(id);
  }

  alterarConta(id: number, evento: Event): void {
    if (!this.podeSelecionar(id)) return;
    const selecionadas = new Set(this.contasSelecionadas());
    if ((evento.target as HTMLInputElement).checked) selecionadas.add(id);
    else selecionadas.delete(id);
    this.selecaoAlterada.emit([...selecionadas]);
  }

  alternarTodas(evento: Event): void {
    const selecionadas = new Set(this.contasSelecionadas());
    const marcar = (evento.target as HTMLInputElement).checked;
    for (const id of this.contasSelecionaveis()) {
      if (marcar) selecionadas.add(id);
      else selecionadas.delete(id);
    }
    this.selecaoAlterada.emit([...selecionadas]);
  }

  valorNegativo(valor: ValorFinanceiroApi): boolean {
    return Number(valor) < 0;
  }

  valorPositivo(valor: ValorFinanceiroApi): boolean {
    return Number(valor) > 0;
  }
}
