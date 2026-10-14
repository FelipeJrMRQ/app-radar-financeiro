import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';

import { mensagemDeErro } from '../../../../core/http/api-error';
import {
  ContaFinanceira,
  ExtratoContaFinanceira,
  SaldoContaFinanceira,
  MovimentoExtrato,
  descricaoTipoConta,
} from '../../models/contas-financeiras.model';
import { ContasFinanceirasService } from '../../services/contas-financeiras.service';
import { dataLocalIso, exibirData, exibirMoeda, valorNegativo } from '../../utils/formatacao-contas';

@Component({
  selector: 'app-conta-detalhe-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './conta-detalhe.page.html',
  styleUrl: './conta-detalhe.page.scss',
})
export class ContaDetalhePage implements OnInit {
  private readonly api = inject(ContasFinanceirasService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly contaId = Number(this.route.snapshot.paramMap.get('contaId'));
  private destruido = false;
  private numeroConsulta = 0;

  readonly conta = signal<ContaFinanceira | null>(null);
  readonly saldo = signal<SaldoContaFinanceira | null>(null);
  readonly extrato = signal<ExtratoContaFinanceira | null>(null);
  readonly carregandoConta = signal(true);
  readonly carregandoExtrato = signal(true);
  readonly erroConta = signal<string | null>(null);
  readonly erroExtrato = signal<string | null>(null);
  readonly mes = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly mesDescricao = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.mes()),
  );

  readonly moeda = exibirMoeda;
  readonly negativo = valorNegativo;
  readonly data = exibirData;
  readonly tipoConta = descricaoTipoConta;

  constructor() {
    this.destroyRef.onDestroy(() => { this.destruido = true; this.numeroConsulta++; });
  }

  ngOnInit(): void {
    const parametro = this.route.snapshot.paramMap.get('contaId');
    if (!parametro || !/^[1-9]\d*$/.test(parametro) || !Number.isSafeInteger(this.contaId)) {
      this.erroConta.set('Identificador de conta inválido.');
      this.carregandoConta.set(false);
      this.carregandoExtrato.set(false);
      return;
    }
    void this.carregarConta();
    void this.carregarExtrato();
  }

  async carregarConta(): Promise<void> {
    this.carregandoConta.set(true);
    this.erroConta.set(null);
    try {
      const resultado = await firstValueFrom(forkJoin({
        conta: this.api.buscar(this.contaId),
        saldo: this.api.consultarSaldo(this.contaId),
      }));
      if (this.destruido) return;
      this.conta.set(resultado.conta);
      this.saldo.set(resultado.saldo);
    } catch (erro) {
      if (this.destruido) return;
      this.erroConta.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruido) this.carregandoConta.set(false);
    }
  }

  alterarMes(deslocamento: number): void {
    const atual = this.mes();
    this.mes.set(new Date(atual.getFullYear(), atual.getMonth() + deslocamento, 1));
    void this.carregarExtrato();
  }

  async carregarExtrato(): Promise<void> {
    const consulta = ++this.numeroConsulta;
    this.carregandoExtrato.set(true);
    this.erroExtrato.set(null);
    this.extrato.set(null);
    const atual = this.mes();
    const inicio = dataLocalIso(new Date(atual.getFullYear(), atual.getMonth(), 1));
    const fim = dataLocalIso(new Date(atual.getFullYear(), atual.getMonth() + 1, 0));
    try {
      const resultado = await firstValueFrom(this.api.consultarExtrato(this.contaId, inicio, fim));
      if (this.destruido || consulta !== this.numeroConsulta) return;
      this.extrato.set(resultado);
    } catch (erro) {
      if (this.destruido || consulta !== this.numeroConsulta) return;
      this.erroExtrato.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruido && consulta === this.numeroConsulta) this.carregandoExtrato.set(false);
    }
  }

  descricaoMovimento(movimento: MovimentoExtrato): string {
    switch (movimento.tipoMovimento) {
      case 'TRANSFERENCIA_ENTRADA': return 'Transferência recebida';
      case 'TRANSFERENCIA_SAIDA': return 'Transferência enviada';
      case 'PAGAMENTO_FATURA': return 'Pagamento de fatura';
      case 'REALIZACAO_LANCAMENTO': return 'Realização de lançamento';
      default: return 'Lançamento';
    }
  }
}
