import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { mensagemDeErro } from '../../../../core/http/api-error';
import { PrivacidadeValoresService } from '../../../../core/privacidade/privacidade-valores.service';
import { MoedaBrInputDirective } from '../../../../shared/directives/moeda-br-input.directive';
import { dataHojeLocal, decimalPositivo, formatarDataLocal, formatarMoeda } from '../../../../shared/valor-monetario';
import { ContaFinanceira } from '../../../contas-financeiras/models/contas-financeiras.model';
import { ContasFinanceirasService } from '../../../contas-financeiras/services/contas-financeiras.service';
import { CartaoCredito, CompraCartao, FaturaCartao, PagamentoFatura, ResumoPagamentos } from '../../models/cartao.model';
import { CartoesService } from '../../services/cartoes.service';

function valorValido(c: AbstractControl): ValidationErrors | null {
  return typeof c.value === 'string' && decimalPositivo(c.value) ? null : { valorInvalido: true };
}

@Component({
  selector: 'app-cartao-detalhe',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MoedaBrInputDirective],
  templateUrl: './cartao-detalhe.page.html',
})
export class CartaoDetalhePage implements OnInit {
  private readonly api = inject(CartoesService);
  private readonly contasApi = inject(ContasFinanceirasService);
  private readonly rota = inject(ActivatedRoute);
  private readonly destruir = inject(DestroyRef);
  private readonly cartaoTexto = this.rota.snapshot.paramMap.get('cartaoId');
  readonly cartaoId = Number(this.cartaoTexto);
  private readonly fb = inject(FormBuilder).nonNullable;
  private revisaoFatura = 0;
  readonly privacidade = inject(PrivacidadeValoresService);
  readonly moeda = formatarMoeda;
  readonly data = formatarDataLocal;
  readonly hoje = dataHojeLocal();

  readonly carregando = signal(true);
  readonly carregandoFatura = signal(false);
  readonly operando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly erroFatura = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);
  readonly cartao = signal<CartaoCredito | null>(null);
  readonly compras = signal<CompraCartao[]>([]);
  readonly contas = signal<ContaFinanceira[]>([]);
  readonly competencia = signal(dataHojeLocal().slice(0, 7));
  readonly competenciaDescricao = computed(() => {
    const [ano, mes] = this.competencia().split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
      .format(new Date(ano, mes - 1, 1));
  });
  readonly cicloEmAberto = computed(() =>
    !!this.fatura()?.dataFechamento && this.fatura()!.dataFechamento >= this.hoje);
  readonly saldoRestanteExato = computed(() => {
    const restante = this.pagamentos()?.saldoRestante;
    return restante == null ? null : String(restante);
  });
  readonly saldoPendente = computed(() => {
    const exato = this.saldoRestanteExato();
    // A API usa decimal em formato JSON, não o formato monetário pt-BR.
    return exato != null && /^\d+(?:\.\d{1,4})?$/.test(exato)
      && /[1-9]/.test(exato);
  });
  readonly fatura = signal<FaturaCartao | null>(null);
  readonly pagamentos = signal<ResumoPagamentos | null>(null);
  readonly limiteCompras = signal(20);
  readonly comprasVisiveis = computed(() => this.compras().slice(0, this.limiteCompras()));
  readonly cancelarCompra = signal<CompraCartao | null>(null);
  readonly estornar = signal<PagamentoFatura | null>(null);
  readonly formPagamento = this.fb.group({
    contaFinanceiraId: this.fb.control<number | null>(null, Validators.required),
    valorPago: ['', valorValido],
    dataPagamento: [dataHojeLocal(), Validators.required],
  });

  ngOnInit(): void {
    const competenciaSolicitada = this.rota.snapshot.queryParamMap.get('competencia');
    if (competenciaSolicitada && /^\d{4}-(0[1-9]|1[0-2])$/.test(competenciaSolicitada)) {
      this.competencia.set(competenciaSolicitada);
    }
    const resultado = this.rota.snapshot.queryParamMap.get('resultado');
    if (resultado === 'compra-criada') this.sucesso.set('Compra registrada com sucesso.');
    if (resultado === 'compra-editada') this.sucesso.set('Compra atualizada com sucesso.');
    void this.carregar();
  }

  async carregar(): Promise<void> {
    if (!this.cartaoTexto || !/^[1-9]\d*$/.test(this.cartaoTexto) ||
      !Number.isSafeInteger(this.cartaoId)) {
      this.erro.set('Identificador de cartão inválido.');
      this.carregando.set(false); return;
    }
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const dados = await firstValueFrom(forkJoin({
        cartao: this.api.buscar(this.cartaoId),
        compras: this.api.listarCompras(this.cartaoId),
        contas: this.contasApi.listar(),
      }));
      if (this.destruir.destroyed) return;
      this.cartao.set(dados.cartao);
      this.compras.set(dados.compras.filter(c => c.ativo)
        .sort((a, b) => b.dataCompra.localeCompare(a.dataCompra) || b.id - a.id));
      this.contas.set(dados.contas.filter(c => c.ativo));
      const hoje = this.hoje;
      const [ano, mes] = hoje.slice(0, 7).split('-').map(Number);
      const diaFechamento = Math.min(dados.cartao.diaFechamento, new Date(ano, mes, 0).getDate());
      if (!this.rota.snapshot.queryParamMap.get('competencia')
          && Number(hoje.slice(8, 10)) > diaFechamento)
        this.competencia.set(this.competenciaComDeslocamento(1));
      await this.consultarFatura();
    } catch (e) {
      if (!this.destruir.destroyed) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruir.destroyed) this.carregando.set(false);
    }
  }

  mostrarMaisCompras(): void { this.limiteCompras.update(v => v + 20); }

  private competenciaComDeslocamento(passo: number): string {
    const [ano, mes] = this.competencia().split('-').map(Number);
    return new Date(Date.UTC(ano, mes - 1 + passo, 1)).toISOString().slice(0, 7);
  }

  mudarMes(passo: number): void {
    if (this.operando()) return;
    this.competencia.set(this.competenciaComDeslocamento(passo));
    this.fatura.set(null);
    this.pagamentos.set(null);
    this.erroFatura.set(null);
    void this.consultarFatura();
  }

  async consultarFatura(): Promise<void> {
    if (this.operando()) return;
    const revisao = ++this.revisaoFatura;
    this.carregandoFatura.set(true);
    this.erroFatura.set(null);
    const comp = this.competencia();
    try {
      const dados = await firstValueFrom(forkJoin({
        fatura: this.api.buscarFatura(this.cartaoId, comp),
        pagamentos: this.api.listarPagamentos(this.cartaoId, comp),
      }));
      if (this.destruir.destroyed || revisao !== this.revisaoFatura) return;
      this.fatura.set(dados.fatura);
      this.pagamentos.set(dados.pagamentos);
    } catch (e) {
      if (!this.destruir.destroyed && revisao === this.revisaoFatura) {
        this.fatura.set(null);
        this.pagamentos.set(null);
        this.erroFatura.set(mensagemDeErro(e));
      }
    } finally {
      if (!this.destruir.destroyed && revisao === this.revisaoFatura)
        this.carregandoFatura.set(false);
    }
  }

  async pagar(): Promise<void> {
    this.formPagamento.markAllAsTouched();
    const f = this.formPagamento.getRawValue();
    const valor = decimalPositivo(f.valorPago);
    if (this.operando() || !this.fatura() || this.formPagamento.invalid || !valor ||
      !f.contaFinanceiraId || f.dataPagamento > this.hoje ||
      !this.contas().some(c => c.id === f.contaFinanceiraId)) return;
    this.operando.set(true);
    this.erroFatura.set(null);
    const comp = this.competencia();
    try {
      const resultado = await firstValueFrom(this.api.pagarParcialmente(this.cartaoId, comp, {
        contaFinanceiraId: f.contaFinanceiraId, valorPago: valor, dataPagamento: f.dataPagamento,
      }));
      if (this.destruir.destroyed || comp !== this.competencia()) return;
      this.pagamentos.set(resultado);
      this.formPagamento.patchValue({ valorPago: '' });
      this.sucesso.set('Pagamento registrado pela API e refletido no saldo da conta financeira.');
    } catch (e) {
      if (!this.destruir.destroyed) this.erroFatura.set(mensagemDeErro(e));
    } finally {
      if (!this.destruir.destroyed) this.operando.set(false);
    }
  }

  async quitarSaldo(): Promise<void> {
    this.formPagamento.controls.contaFinanceiraId.markAsTouched();
    const dados = this.formPagamento.getRawValue();
    const restante = this.saldoRestanteExato();
    if (this.operando() || !this.saldoPendente() || !restante ||
      !dados.contaFinanceiraId || dados.dataPagamento > this.hoje ||
      !this.contas().some(c => c.id === dados.contaFinanceiraId)) return;

    this.operando.set(true);
    this.erroFatura.set(null);
    try {
      // Usa o saldo integral EXATO da API, nunca o valor arredondado na tela.
      const resumo = await firstValueFrom(this.api.pagarParcialmente(
        this.cartaoId, this.competencia(), {
          contaFinanceiraId: dados.contaFinanceiraId, valorPago: restante,
          dataPagamento: dados.dataPagamento,
        }));
      if (this.destruir.destroyed) return;
      this.pagamentos.set(resumo);
      this.formPagamento.patchValue({ valorPago: '' });
      this.sucesso.set('Pagamento integral registrado com valor exato.');
    } catch (e) {
      if (!this.destruir.destroyed) this.erroFatura.set(mensagemDeErro(e));
    } finally {
      if (!this.destruir.destroyed) this.operando.set(false);
    }
  }

  async confirmarEstorno(): Promise<void> {
    const pag = this.estornar();
    if (!pag || this.operando()) return;
    this.operando.set(true); this.erroFatura.set(null);
    try {
      await firstValueFrom(this.api.estornarPagamento(this.cartaoId, this.competencia(), pag.id));
      if (this.destruir.destroyed) return;
      this.estornar.set(null);
      this.sucesso.set('Pagamento estornado. Confira o novo saldo da fatura.');
    } catch (e) {
      if (!this.destruir.destroyed) this.erroFatura.set(mensagemDeErro(e));
    } finally {
      if (!this.destruir.destroyed) this.operando.set(false);
    }
    if (!this.destruir.destroyed && !this.erroFatura()) await this.consultarFatura();
  }

  async confirmarCancelamentoCompra(): Promise<void> {
    const compra = this.cancelarCompra();
    if (!compra || this.operando()) return;
    this.operando.set(true); this.erro.set(null);
    try {
      await firstValueFrom(this.api.inativarCompra(this.cartaoId, compra.id));
      if (this.destruir.destroyed) return;
      this.cancelarCompra.set(null);
      this.compras.update(lista => lista.filter(c => c.id !== compra.id));
      this.sucesso.set('Compra cancelada; valores da fatura atualizados.');
    } catch (e) {
      if (!this.destruir.destroyed) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruir.destroyed) this.operando.set(false);
    }
    if (!this.destruir.destroyed && !this.erro()) await this.consultarFatura();
  }
}
