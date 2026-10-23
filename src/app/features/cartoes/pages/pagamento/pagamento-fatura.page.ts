import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';

import { mensagemDeErro } from '../../../../core/http/api-error';
import { PrivacidadeValoresService } from '../../../../core/privacidade/privacidade-valores.service';
import { MoedaBrInputDirective } from '../../../../shared/directives/moeda-br-input.directive';
import { dataHojeLocal, decimalPositivo, formatarDataLocal, formatarMoeda } from '../../../../shared/valor-monetario';
import { ContaFinanceira } from '../../../contas-financeiras/models/contas-financeiras.model';
import { ContasFinanceirasService } from '../../../contas-financeiras/services/contas-financeiras.service';
import { CartaoCredito, FaturaCartao, ResumoPagamentos } from '../../models/cartao.model';
import { CartoesService } from '../../services/cartoes.service';

type TipoPagamento = 'INTEGRAL' | 'PARCIAL';

/** Compara valores monetários até quatro casas sem usar arredondamento de Number. */
function valorEmDezMilesimos(valor: string): bigint | null {
  if (!/^\d{1,15}(?:\.\d{1,4})?$/.test(valor)) return null;
  const [inteira, fracao = ''] = valor.split('.');
  return BigInt(inteira) * 10000n + BigInt(fracao.padEnd(4, '0'));
}

function dataRealValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const [ano, mes, dia] = data.split('-').map(Number);
  const calendario = new Date(Date.UTC(ano, mes - 1, dia));
  return calendario.getUTCFullYear() === ano
    && calendario.getUTCMonth() + 1 === mes && calendario.getUTCDate() === dia;
}

@Component({
  selector: 'app-pagamento-fatura',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MoedaBrInputDirective],
  templateUrl: './pagamento-fatura.page.html',
})
export class PagamentoFaturaPage implements OnInit {
  private readonly api = inject(CartoesService);
  private readonly contasApi = inject(ContasFinanceirasService);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly privacidade = inject(PrivacidadeValoresService);
  readonly moeda = formatarMoeda;
  readonly data = formatarDataLocal;
  readonly hoje = dataHojeLocal();
  private readonly cartaoTexto = this.rota.snapshot.paramMap.get('cartaoId');
  readonly cartaoId = Number(this.cartaoTexto);
  readonly competencia = this.rota.snapshot.paramMap.get('competencia') ?? '';

  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly erroFormulario = signal<string | null>(null);
  readonly confirmando = signal(false);
  readonly cartao = signal<CartaoCredito | null>(null);
  readonly fatura = signal<FaturaCartao | null>(null);
  readonly resumo = signal<ResumoPagamentos | null>(null);
  readonly contas = signal<ContaFinanceira[]>([]);
  readonly modo = signal<TipoPagamento>('INTEGRAL');

  readonly mesDescricao = computed(() => {
    const [ano, mes] = this.competencia.split('-').map(Number);
    if (!ano || !mes || mes < 1 || mes > 12) return this.competencia;
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
      .format(new Date(ano, mes - 1, 1));
  });
  readonly saldoExato = computed(() => String(this.resumo()?.saldoRestante ?? '0'));
  readonly saldoPendente = computed(() => (valorEmDezMilesimos(this.saldoExato()) ?? 0n) > 0n);

  readonly form = this.fb.group({
    contaFinanceiraId: this.fb.control<number | null>(null, Validators.required),
    valorPago: [''],
    dataPagamento: [dataHojeLocal(), Validators.required],
  });

  ngOnInit(): void { void this.carregar(); }

  async carregar(): Promise<void> {
    if (!this.cartaoTexto || !/^[1-9]\d*$/.test(this.cartaoTexto)
      || !Number.isSafeInteger(this.cartaoId)
      || !/^\d{4}-(0[1-9]|1[0-2])$/.test(this.competencia)) {
      this.erro.set('Cartão ou competência inválidos.');
      this.carregando.set(false);
      return;
    }
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const dados = await firstValueFrom(forkJoin({
        cartao: this.api.buscar(this.cartaoId),
        fatura: this.api.buscarFatura(this.cartaoId, this.competencia),
        resumo: this.api.listarPagamentos(this.cartaoId, this.competencia),
        contas: this.contasApi.listar(),
      }));
      if (this.destruir.destroyed) return;
      this.cartao.set(dados.cartao);
      this.fatura.set(dados.fatura);
      this.resumo.set(dados.resumo);
      this.contas.set(dados.contas.filter(c => c.ativo));
    } catch (erro) {
      if (!this.destruir.destroyed) this.erro.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruir.destroyed) this.carregando.set(false);
    }
  }

  selecionarModo(modo: TipoPagamento): void {
    if (this.salvando() || this.confirmando()) return;
    this.modo.set(modo);
    this.erroFormulario.set(null);
  }

  private valorPagamento(): string | null {
    if (this.modo() === 'INTEGRAL') return this.saldoExato();
    return decimalPositivo(this.form.controls.valorPago.value);
  }

  prepararConfirmacao(): void {
    if (this.carregando() || this.salvando() || this.confirmando()) return;
    this.form.markAllAsTouched();
    this.erroFormulario.set(null);
    const dados = this.form.getRawValue();
    const valor = this.valorPagamento();
    const valorUnidades = valor === null ? null : valorEmDezMilesimos(valor);
    const pendente = valorEmDezMilesimos(this.saldoExato());

    if (!this.saldoPendente() || !this.fatura() || !this.cartao()) {
      this.erroFormulario.set('Esta fatura não possui saldo pendente para registrar pagamento.');
    } else if (!dados.contaFinanceiraId
      || !this.contas().some(conta => conta.id === dados.contaFinanceiraId)) {
      this.erroFormulario.set('Selecione uma conta financeira ativa.');
    } else if (!dataRealValida(dados.dataPagamento) || dados.dataPagamento > this.hoje) {
      this.erroFormulario.set('Informe a data em que o pagamento foi realizado, até hoje.');
    } else if (valorUnidades === null || valorUnidades <= 0n
      || pendente === null || valorUnidades > pendente) {
      this.erroFormulario.set('Informe um valor positivo que não ultrapasse o saldo pendente.');
    } else {
      this.confirmando.set(true);
    }
  }

  voltarEdicao(): void {
    if (this.salvando()) return;
    this.confirmando.set(false);
    this.erroFormulario.set(null);
  }

  contaSelecionada(): string {
    return this.contas().find(conta => conta.id === this.form.controls.contaFinanceiraId.value)?.nome ?? '';
  }

  valorConfirmacao(): string {
    return this.valorPagamento() ?? '0';
  }

  async confirmarPagamento(): Promise<void> {
    if (!this.confirmando() || this.salvando()) return;
    const dados = this.form.getRawValue();
    const valor = this.valorPagamento();
    if (!this.saldoPendente() || !dados.contaFinanceiraId || !valor) return;
    this.salvando.set(true);
    this.erroFormulario.set(null);
    try {
      // Apenas registra um pagamento JÁ REALIZADO. Não movimenta bancos.
      // O Java recalcula e valida os saldos e contabiliza a conta financeira.
      await firstValueFrom(this.api.pagarParcialmente(this.cartaoId, this.competencia, {
        contaFinanceiraId: dados.contaFinanceiraId,
        valorPago: valor, dataPagamento: dados.dataPagamento,
      }));
      if (!this.destruir.destroyed) {
        await this.router.navigate(['/cartoes', this.cartaoId], {
          queryParams: { competencia: this.competencia, resultado: 'pagamento-registrado' },
        });
      }
    } catch (erro) {
      if (!this.destruir.destroyed) {
        this.erroFormulario.set(mensagemDeErro(erro));
        // Permite a correção dos dados em caso de conflito ou validação da API.
        this.confirmando.set(false);
        await this.carregar();
      }
    } finally {
      if (!this.destruir.destroyed) this.salvando.set(false);
    }
  }
}
