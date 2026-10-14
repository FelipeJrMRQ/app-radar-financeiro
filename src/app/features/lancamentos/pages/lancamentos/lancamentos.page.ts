import { Component, computed, DestroyRef, inject, isDevMode, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, map, of } from 'rxjs';

import { mensagemDeErro } from '../../../../core/http/api-error';
import { ContaFinanceira } from '../../../contas-financeiras/models/contas-financeiras.model';
import { ContasFinanceirasService } from '../../../contas-financeiras/services/contas-financeiras.service';
import { formatarDataLocal, formatarMoeda } from '../../../../shared/valor-monetario';
import { dataLocalIso } from '../../../contas-financeiras/utils/formatacao-contas';
import { TipoCategoria } from '../../../categorias/models/categoria.model';
import { Lancamento, FiltroLancamentosPeriodo, ResumoLancamentosPeriodo } from '../../models/lancamento.model';
import { LancamentosService } from '../../services/lancamentos.service';

type FiltroTipo = 'TODOS' | TipoCategoria;

@Component({
  selector: 'app-lancamentos-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './lancamentos.page.html',
  styleUrl: './lancamentos.page.scss',
})
export class LancamentosPage implements OnInit {
  private readonly api = inject(LancamentosService);
  private readonly contasApi = inject(ContasFinanceirasService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private destruida = false;
  private versaoConsulta = 0;

  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly contas = signal<ContaFinanceira[]>([]);
  readonly lancamentos = signal<Lancamento[]>([]);
  readonly resumo = signal<ResumoLancamentosPeriodo | null>(null);
  readonly avisoResumo = signal<string | null>(null);
  readonly mes = signal(this.mesInicial());
  readonly mesDescricao = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.mes()));
  readonly filtroTipo = signal<FiltroTipo>(
    this.route.snapshot.queryParamMap.get('tipo') === 'RECEITA' ? 'RECEITA'
      : this.route.snapshot.queryParamMap.get('tipo') === 'DESPESA' ? 'DESPESA'
      : 'TODOS',
  );
  readonly contaSelecionada = signal<number | null>(this.contaInicial());
  readonly limiteExibicao = signal(30);
  readonly paginaCriada = this.route.snapshot.queryParamMap.get('criado') === 'ok';

  /**
   * Protege a apresentação caso uma API antiga ignore os filtros opcionais.
   * Nenhum cálculo de valores financeiros é realizado no Angular.
   */
  readonly filtrados = computed(() => {
    const { contaFinanceiraId, tipo, dataInicio, dataFim } = this.filtrosAtuais();
    return this.lancamentos().filter(lancamento =>
      (!tipo || lancamento.tipo === tipo)
      && (!contaFinanceiraId || lancamento.contaFinanceiraId === contaFinanceiraId)
      && lancamento.dataLancamento >= dataInicio
      && lancamento.dataLancamento <= dataFim);
  });
  readonly visiveis = computed(() => this.filtrados().slice(0, this.limiteExibicao()));
  readonly moeda = formatarMoeda;
  readonly data = formatarDataLocal;
  readonly rotuloTotal = computed(() =>
    this.filtroTipo() === 'RECEITA' ? 'Total de receitas lançadas'
      : this.filtroTipo() === 'DESPESA' ? 'Total de despesas lançadas'
      : 'Total de receitas e despesas lançadas');

  constructor() {
    this.destroyRef.onDestroy(() => { this.destruida = true; this.versaoConsulta++; });
  }

  ngOnInit(): void { void this.carregar(); }

  mostrarMais(): void { this.limiteExibicao.update(atual => atual + 30); }

  mudarMes(passo: number): void {
    const atual = this.mes();
    this.mes.set(new Date(atual.getFullYear(), atual.getMonth() + passo, 1));
    this.limiteExibicao.set(30);
    void this.carregar();
  }

  private mesInicial(): Date {
    const valor = this.route.snapshot.queryParamMap.get('mes');
    if (valor && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor)) {
      return new Date(Number(valor.slice(0, 4)), Number(valor.slice(5, 7)) - 1, 1);
    }
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), 1);
  }

  private contaInicial(): number | null {
    const valor = this.route.snapshot.queryParamMap.get('contaFinanceiraId');
    if (!valor || !/^\d+$/.test(valor)) return null;
    const id = Number(valor);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }

  private filtrosAtuais(): FiltroLancamentosPeriodo {
    const mes = this.mes();
    const tipo = this.filtroTipo();
    return {
      contaFinanceiraId: this.contaSelecionada(),
      tipo: tipo === 'TODOS' ? null : tipo,
      dataInicio: dataLocalIso(new Date(mes.getFullYear(), mes.getMonth(), 1)),
      dataFim: dataLocalIso(new Date(mes.getFullYear(), mes.getMonth() + 1, 0)),
    };
  }

  alterarTipo(tipo: FiltroTipo): void {
    this.filtroTipo.set(tipo);
    this.limiteExibicao.set(30);
    void this.carregar();
  }

  alterarConta(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    const id = Number(valor);
    this.contaSelecionada.set(valor === '' || !Number.isSafeInteger(id) || id <= 0 ? null : id);
    this.limiteExibicao.set(30);
    void this.carregar();
  }

  async carregar(): Promise<void> {
    const consulta = ++this.versaoConsulta;
    this.carregando.set(true);
    this.erro.set(null);
    this.resumo.set(null);
    this.avisoResumo.set(null);
    const filtros = this.filtrosAtuais();
    try {
      const resultado = await firstValueFrom(forkJoin({
        contas: this.contasApi.listar(),
        lancamentos: this.api.listarPeriodo(filtros),
        resumo: this.api.resumirPeriodo(filtros).pipe(
          map(dados => ({ dados, falha: null as unknown })),
          catchError(falha => of({ dados: null, falha })),
        ),
      }));
      if (this.destruida || consulta !== this.versaoConsulta) return;
      this.contas.set(resultado.contas);
      this.lancamentos.set(resultado.lancamentos);
      this.resumo.set(resultado.resumo.dados);
      if (resultado.resumo.falha) {
        this.avisoResumo.set(
          'O total do período está indisponível no momento. ' +
          'A lista continua acessível, sem estimar valores financeiros.' +
          (isDevMode() ? ' No ambiente de desenvolvimento, confira se a API ' +
            'foi atualizada para a branch chatgpt/resumo-periodo-lancamentos.' : ''),
        );
      }
    } catch (erro) {
      if (!this.destruida && consulta === this.versaoConsulta) {
        this.erro.set(mensagemDeErro(erro));
        this.lancamentos.set([]);
        this.resumo.set(null);
        this.avisoResumo.set(null);
      }
    } finally {
      if (!this.destruida && consulta === this.versaoConsulta) this.carregando.set(false);
    }
  }
}
