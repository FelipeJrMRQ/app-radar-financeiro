import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';

import { mensagemDeErro } from '../../../../core/http/api-error';
import { PrivacidadeValoresService } from '../../../../core/privacidade/privacidade-valores.service';
import {
  ContaFinanceira,
  ExtratoContaFinanceira,
  SaldoContaFinanceira,
  MovimentoExtrato,
  UsoContaFinanceira,
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
  readonly privacidade = inject(PrivacidadeValoresService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly contaId = Number(this.route.snapshot.paramMap.get('contaId'));
  private destruido = false;
  private numeroConsulta = 0;

  readonly conta = signal<ContaFinanceira | null>(null);
  readonly saldo = signal<SaldoContaFinanceira | null>(null);
  readonly extrato = signal<ExtratoContaFinanceira | null>(null);
  readonly uso = signal<UsoContaFinanceira | null>(null);
  readonly carregandoUso = signal(true);
  readonly erroUso = signal<string | null>(null);
  readonly acaoPendente = signal<'EXCLUIR' | 'INATIVAR' | 'REATIVAR' | null>(null);
  readonly executandoAcao = signal(false);
  readonly erroAcao = signal<string | null>(null);
  readonly avisoSucesso = this.route.snapshot.queryParamMap.get('resultado') === 'atualizada'
    ? 'Dados da conta atualizados com sucesso.'
    : this.route.snapshot.queryParamMap.get('resultado') === 'criada'
      ? 'Conta cadastrada com sucesso.' : null;
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
      this.carregandoUso.set(false);
      return;
    }
    void this.carregarConta();
    void this.carregarExtrato();
    void this.carregarUso();
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

  async carregarUso(): Promise<void> {
    this.carregandoUso.set(true);
    this.erroUso.set(null);
    this.uso.set(null);
    try {
      const resultado = await firstValueFrom(this.api.consultarUso(this.contaId));
      if (this.destruido) return;
      this.uso.set(resultado);
    } catch (erro) {
      if (!this.destruido) this.erroUso.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruido) this.carregandoUso.set(false);
    }
  }

  escolherAcao(acao: 'EXCLUIR' | 'INATIVAR' | 'REATIVAR'): void {
    const conta = this.conta();
    const uso = this.uso();
    if (!conta || !uso || this.executandoAcao()) return;
    if (acao === 'EXCLUIR' && !uso.podeExcluirDefinitivamente) return;
    if (acao === 'INATIVAR' && (!conta.ativo || !uso.utilizada)) return;
    if (acao === 'REATIVAR' && conta.ativo) return;
    this.erroAcao.set(null);
    this.acaoPendente.set(acao);
  }

  async executarAcao(): Promise<void> {
    const acao = this.acaoPendente();
    const conta = this.conta();
    const uso = this.uso();
    if (!acao || !conta || !uso || this.executandoAcao()) return;
    if (acao === 'EXCLUIR' && !uso.podeExcluirDefinitivamente) return;
    if (acao === 'INATIVAR' && (!conta.ativo || !uso.utilizada)) return;
    if (acao === 'REATIVAR' && conta.ativo) return;

    this.executandoAcao.set(true);
    this.erroAcao.set(null);
    try {
      if (acao === 'EXCLUIR') {
        await firstValueFrom(this.api.excluirDefinitivamente(conta.id));
      } else if (acao === 'INATIVAR') {
        await firstValueFrom(this.api.inativar(conta.id));
      } else {
        await firstValueFrom(this.api.reativar(conta.id));
      }
      if (this.destruido) return;
      const resultado = acao === 'EXCLUIR' ? 'excluida'
        : acao === 'INATIVAR' ? 'inativada' : 'reativada';
      await this.router.navigate(['/contas'], {
        queryParams: { resultado, visualizar: acao === 'INATIVAR' ? 'inativas' : 'ativas' },
      });
    } catch (erro) {
      if (!this.destruido) {
        this.erroAcao.set(mensagemDeErro(erro));
        this.acaoPendente.set(null);
        await this.carregarUso();
      }
    } finally {
      if (!this.destruido) this.executandoAcao.set(false);
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
