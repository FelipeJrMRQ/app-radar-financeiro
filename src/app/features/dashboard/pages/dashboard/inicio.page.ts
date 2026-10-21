import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { PreferenciasFluxoCaixaService } from '../../services/preferencias-fluxo-caixa.service';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { PrivacidadeValoresService } from '../../../../core/privacidade/privacidade-valores.service';
import { mensagemDeErro } from '../../../../core/http/api-error';
import { interpretarErroDoPainel } from '../../utils/painel-erro';
import { dataLocalIso } from '../../../contas-financeiras/utils/formatacao-contas';
import { formatarDiaMes, formatarMoeda } from '../../../../shared/valor-monetario';
import { FluxoCaixaConsolidado, PainelFinanceiro, TotalCategoria } from '../../models/painel-financeiro.model';
import { PainelFinanceiroService } from '../../services/painel-financeiro.service';
import { PainelPreferenciasService } from '../../services/painel-preferencias.service';
import { ContasReceberCardComponent } from '../../components/contas-receber/contas-receber.component';
import { ContasPagarCardComponent } from '../../components/contas-pagar/contas-pagar.component';
import { SaldosContasCardComponent } from '../../components/saldos-contas/saldos-contas.component';
import { FluxoCaixaCardComponent } from '../../components/fluxo-caixa/fluxo-caixa.component';
import { DespesasCategoriaCardComponent } from '../../components/despesas-categoria/despesas-categoria.component';
import { MosaicoPainelItemDirective } from '../../directives/mosaico-painel-item.directive';

@Component({
  selector: 'app-inicio-page',
  standalone: true,
  imports: [RouterLink, ContasReceberCardComponent, ContasPagarCardComponent, SaldosContasCardComponent, FluxoCaixaCardComponent, DespesasCategoriaCardComponent, MosaicoPainelItemDirective],
  templateUrl: './inicio.page.html',
  styleUrl: './inicio.page.scss',
})
export class InicioPage implements OnInit {
  private readonly sessao = inject(AuthService);
  private readonly api = inject(PainelFinanceiroService);
  readonly privacidade = inject(PrivacidadeValoresService);
  readonly preferencias = inject(PainelPreferenciasService);
  readonly preferenciasFluxo = inject(PreferenciasFluxoCaixaService);
  private readonly destroyRef = inject(DestroyRef);
  private destruido = false;
  private versao = 0;
  private versaoGrafico = 0;

  readonly primeiroNome = computed(() => this.sessao.usuario()?.nome.trim().split(/\s+/)[0] || 'você');
  readonly mes = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly mesReferencia = computed(() => dataLocalIso(this.mes()).slice(0, 7));
  readonly mesDescricao = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.mes()));
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly rotaNaoEncontrada = signal(false);
  readonly painel = signal<PainelFinanceiro | null>(null);
  // null = primeira carga; [] = usuário desmarcou todas as contas.
  readonly contasGraficoIds = signal<number[] | null>(null);
  readonly contasDesmarcadas = signal<number[]>([]);
  readonly ocultarContasZeradas = signal(false);
  readonly contasZeradas = computed(() => (this.painel()?.contas ?? [])
    .filter(conta => Number(conta.saldoConfirmado) === 0 &&
      Number(conta.saldoProjetado) === 0)
    .map(conta => conta.contaFinanceiraId));
  readonly contasVisiveis = computed(() => (this.painel()?.contas ?? [])
    .filter(conta => !this.ocultarContasZeradas() ||
      !this.contasZeradas().includes(conta.contaFinanceiraId)));
  readonly contasEfetivas = computed(() => this.contasVisiveis()
    .map(conta => conta.contaFinanceiraId)
    .filter(id => !this.contasDesmarcadas().includes(id)));
  readonly fluxo = signal<FluxoCaixaConsolidado | null>(null);
  readonly carregandoFluxo = signal(false);
  readonly erroFluxo = signal<string | null>(null);
  readonly aReceber = computed(() => this.painel()?.proximosVencimentos.filter(p => p.tipo === 'RECEITA').slice(0, 5) ?? []);
  readonly aPagar = computed(() => this.painel()?.proximosVencimentos.filter(p => p.tipo === 'DESPESA').slice(0, 5) ?? []);
  readonly categorias = signal<TotalCategoria[]>([]);
  readonly erroCategorias = signal<string | null>(null);
  readonly moeda = formatarMoeda;
  readonly dataCurta = formatarDiaMes;
  readonly saldoProjetadoNegativo = computed(() => Number(this.painel()?.saldoProjetado ?? 0) < 0);

  constructor() { this.destroyRef.onDestroy(() => { this.destruido = true; this.versao++; this.versaoGrafico++; }); }

  ngOnInit(): void { void this.iniciar(); }

  private async iniciar(): Promise<void> {
    const [_, filtros] = await Promise.all([
      this.preferencias.carregar(),
      this.preferenciasFluxo.carregar(),
    ]);
    if (this.destruido) return;
    this.ocultarContasZeradas.set(filtros.ocultarContasZeradas);
    this.contasDesmarcadas.set([...new Set(filtros.contasDesmarcadas)]);
    await this.carregar();
  }

  mudarMes(passo: number): void {
    const anterior = this.mes();
    this.mes.set(new Date(anterior.getFullYear(), anterior.getMonth() + passo, 1));
    void this.carregar();
  }

  private datasPeriodo(): { inicio: string; fim: string } {
    const mes = this.mes();
    return {
      inicio: dataLocalIso(new Date(mes.getFullYear(), mes.getMonth(), 1)),
      fim: dataLocalIso(new Date(mes.getFullYear(), mes.getMonth() + 1, 0)),
    };
  }

  async carregar(): Promise<void> {
    const versao = ++this.versao;
    this.versaoGrafico++;
    this.carregando.set(true);
    this.erro.set(null);
    this.rotaNaoEncontrada.set(false);
    this.fluxo.set(null);
    this.categorias.set([]);
    const { inicio, fim } = this.datasPeriodo();
    try {
      const dados = await firstValueFrom(this.api.consultar(inicio, fim));
      if (this.destruido || versao !== this.versao) return;
      this.painel.set(dados);
      this.contasGraficoIds.set(this.contasEfetivas());
      if (this.preferencias.estaVisivel('FLUXO_CAIXA')) void this.carregarFluxo();
      if (this.preferencias.estaVisivel('DESPESAS_CATEGORIA')) {
        void this.carregarCategorias(versao, inicio, fim);
      }
    } catch (erro) {
      if (this.destruido || versao !== this.versao) return;
      this.painel.set(null);
      const falha = interpretarErroDoPainel(erro);
      this.rotaNaoEncontrada.set(falha.rotaNaoEncontrada);
      this.erro.set(falha.mensagem);
    } finally {
      if (!this.destruido && versao === this.versao) this.carregando.set(false);
    }
  }

  alterarContasGrafico(ids: number[]): void {
    const selecionadas = new Set(ids);
    const desmarcadas = new Set(this.contasDesmarcadas());
    for (const conta of this.contasVisiveis()) {
      if (selecionadas.has(conta.contaFinanceiraId)) desmarcadas.delete(conta.contaFinanceiraId);
      else desmarcadas.add(conta.contaFinanceiraId);
    }
    this.contasDesmarcadas.set([...desmarcadas]);
    this.atualizarFluxo();
  }

  alternarContasZeradas(): void {
    this.ocultarContasZeradas.update(valor => !valor);
    this.atualizarFluxo();
  }

  private atualizarFluxo(): void {
    this.contasGraficoIds.set(this.contasEfetivas());
    this.preferenciasFluxo.salvar({
      ocultarContasZeradas: this.ocultarContasZeradas(),
      contasDesmarcadas: this.contasDesmarcadas(),
    });
    void this.carregarFluxo();
  }

  async carregarFluxo(): Promise<void> {
    const versao = ++this.versaoGrafico;
    this.fluxo.set(null);
    this.erroFluxo.set(null);
    const ids = this.contasGraficoIds() ?? [];
    if (!ids.length) {
      this.carregandoFluxo.set(false);
      return;
    }
    this.carregandoFluxo.set(true);
    const { inicio, fim } = this.datasPeriodo();
    try {
      const fluxo = await firstValueFrom(this.api.fluxoCaixaConsolidado(ids, inicio, fim));
      if (!this.destruido && versao === this.versaoGrafico) this.fluxo.set(fluxo);
    } catch (erro) {
      if (!this.destruido && versao === this.versaoGrafico) this.erroFluxo.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruido && versao === this.versaoGrafico) this.carregandoFluxo.set(false);
    }
  }

  private async carregarCategorias(versao: number, inicio: string, fim: string): Promise<void> {
    const hoje = dataLocalIso(new Date());
    this.erroCategorias.set(null);
    // O resumo por categoria considera somente despesas realizadas; a API não aceita data futura.
    if (inicio > hoje) return;
    try {
      const categorias = await firstValueFrom(this.api.despesasPorCategoria(inicio, fim > hoje ? hoje : fim));
      if (!this.destruido && versao === this.versao) this.categorias.set(categorias);
    } catch (erro) {
      if (!this.destruido && versao === this.versao) this.erroCategorias.set(mensagemDeErro(erro));
    }
  }

}
