import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { mensagemDeErro } from '../../../../core/http/api-error';
import { PrivacidadeValoresService } from '../../../../core/privacidade/privacidade-valores.service';
import { dataHojeLocal, formatarDataLocal, formatarMoeda } from '../../../../shared/valor-monetario';
import { CartaoCredito, CompraCartao, FaturaCartao, PagamentoFatura, ResumoPagamentos } from '../../models/cartao.model';
import { CartoesService } from '../../services/cartoes.service';

@Component({
  selector: 'app-cartao-detalhe',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cartao-detalhe.page.html',
})
export class CartaoDetalhePage implements OnInit {
  private readonly api = inject(CartoesService);
  private readonly rota = inject(ActivatedRoute);
  private readonly destruir = inject(DestroyRef);
  private readonly cartaoTexto = this.rota.snapshot.paramMap.get('cartaoId');
  readonly cartaoId = Number(this.cartaoTexto);
  private revisaoFatura = 0;
  readonly privacidade = inject(PrivacidadeValoresService);
  readonly moeda = formatarMoeda;
  readonly data = formatarDataLocal;

  /** Datas compactas nas listas; data ISO e ano completo permanecem disponíveis. */
  dataCurta(data: string): string {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
    return partes ? `${partes[3]}/${partes[2]}/${partes[1].slice(-2)}` : this.data(data);
  }
  readonly hoje = dataHojeLocal();

  readonly carregando = signal(true);
  readonly carregandoFatura = signal(false);
  readonly operando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly erroFatura = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);
  readonly cartao = signal<CartaoCredito | null>(null);
  readonly compras = signal<CompraCartao[]>([]);
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
  readonly temValorNaFatura = computed(() => Number(this.pagamentos()?.totalFatura ?? 0) > 0);
  readonly pagamentoParcial = computed(() =>
    Number(this.pagamentos()?.totalPago ?? 0) > 0 && this.saldoPendente());
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
  readonly comprasImportadas = computed(() =>
    this.compras().some(compra => compra.origem === 'CONCILIACAO'));
  readonly cancelarCompra = signal<CompraCartao | null>(null);
  readonly estornar = signal<PagamentoFatura | null>(null);

  ngOnInit(): void {
    const competenciaSolicitada = this.rota.snapshot.queryParamMap.get('competencia');
    if (competenciaSolicitada && /^\d{4}-(0[1-9]|1[0-2])$/.test(competenciaSolicitada)) {
      this.competencia.set(competenciaSolicitada);
    }
    const resultado = this.rota.snapshot.queryParamMap.get('resultado');
    if (resultado === 'compra-criada') this.sucesso.set('Compra registrada com sucesso.');
    if (resultado === 'compra-editada') this.sucesso.set('Compra atualizada com sucesso.');
    if (resultado === 'parcelas-corrigidas')
      this.sucesso.set('Parcelas corrigidas. O limite comprometido e as próximas faturas foram atualizados.');
    if (resultado === 'conciliacao-concluida')
      this.sucesso.set('Conciliação inicial concluída. Confira as parcelas desta e das próximas faturas.');
    if (resultado === 'pagamento-registrado')
      this.sucesso.set('Pagamento registrado. O saldo da fatura e da conta financeira foi atualizado.');
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
      }));
      if (this.destruir.destroyed) return;
      this.cartao.set(dados.cartao);
      this.compras.set(dados.compras.filter(c => c.ativo)
        .sort((a, b) => b.dataCompra.localeCompare(a.dataCompra) || b.id - a.id));
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
