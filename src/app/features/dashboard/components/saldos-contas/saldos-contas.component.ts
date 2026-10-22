import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ValorFinanceiroApi, formatarMoeda } from '../../../../shared/valor-monetario';
import { SaldoContaPainel } from '../../models/painel-financeiro.model';
import { formatarSomaSaldos, somarSaldos } from '../../utils/saldos-selecionados';

@Component({
  selector: 'app-saldos-contas-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './saldos-contas.component.html',
  styleUrl: './saldos-contas.component.scss',
})
export class SaldosContasCardComponent {
  readonly contas = input.required<SaldoContaPainel[]>();
  readonly valoresVisiveis = input(false);

  // O saldo confirmado (atual) é exibido inicialmente. A projeção é
  // uma alternativa de consulta, sem alterar a seleção das contas.
  readonly tipoSaldo = signal<'CONFIRMADO' | 'PROJETADO'>('CONFIRMADO');
  readonly nomeTipoSaldo = computed(() => this.tipoSaldo() === 'CONFIRMADO' ? 'Confirmado' : 'Projetado');
  readonly proximoTipoSaldo = computed(() => this.tipoSaldo() === 'CONFIRMADO' ? 'projetado' : 'confirmado');

  alternarTipoSaldo(): void {
    this.tipoSaldo.update(tipo => tipo === 'CONFIRMADO' ? 'PROJETADO' : 'CONFIRMADO');
  }

  valorExibido(conta: SaldoContaPainel): ValorFinanceiroApi {
    return this.tipoSaldo() === 'CONFIRMADO' ? conta.saldoConfirmado : conta.saldoProjetado;
  }


  // Seleção local e exclusiva dos totais deste card; não interfere no fluxo de caixa.
  private readonly desmarcadas = signal<ReadonlySet<number>>(new Set<number>());
  readonly contasSelecionadas = computed(() => this.contas()
    .filter(conta => !this.desmarcadas().has(conta.contaFinanceiraId)));
  readonly todasSelecionadas = computed(() =>
    this.contas().length > 0 && this.contasSelecionadas().length === this.contas().length);
  readonly parcialmenteSelecionadas = computed(() =>
    this.contasSelecionadas().length > 0 && !this.todasSelecionadas());

  readonly totalConfirmado = computed(() =>
    somarSaldos(this.contasSelecionadas().map(conta => conta.saldoConfirmado)));
  readonly totalProjetado = computed(() =>
    somarSaldos(this.contasSelecionadas().map(conta => conta.saldoProjetado)));
  readonly totalExibido = computed(() =>
    this.tipoSaldo() === 'CONFIRMADO' ? this.totalConfirmado() : this.totalProjetado());
  readonly totalExibidoPositivo = computed(() => this.totalExibido() > 0n);
  readonly totalExibidoNegativo = computed(() => this.totalExibido() < 0n);

  readonly confirmadoPositivo = computed(() => this.totalConfirmado() > 0n);
  readonly confirmadoNegativo = computed(() => this.totalConfirmado() < 0n);
  readonly projetadoPositivo = computed(() => this.totalProjetado() > 0n);
  readonly projetadoNegativo = computed(() => this.totalProjetado() < 0n);

  readonly moeda = formatarMoeda;
  readonly moedaTotal = formatarSomaSaldos;

  estaSelecionada(id: number): boolean {
    return !this.desmarcadas().has(id);
  }

  alterarConta(id: number, evento: Event): void {
    const novaSelecao = new Set(this.desmarcadas());
    if ((evento.target as HTMLInputElement).checked) novaSelecao.delete(id);
    else novaSelecao.add(id);
    this.desmarcadas.set(novaSelecao);
  }

  alternarTodas(evento: Event): void {
    const marcar = (evento.target as HTMLInputElement).checked;
    this.desmarcadas.set(new Set(marcar ? [] : this.contas().map(conta => conta.contaFinanceiraId)));
  }

  valorNegativo(valor: ValorFinanceiroApi): boolean {
    return Number(valor) < 0;
  }

  valorPositivo(valor: ValorFinanceiroApi): boolean {
    return Number(valor) > 0;
  }
}
