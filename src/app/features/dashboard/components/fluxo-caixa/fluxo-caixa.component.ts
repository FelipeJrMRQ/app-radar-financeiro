import {
  Component, computed, DestroyRef, effect, ElementRef, EventEmitter,
  inject, input, Output, viewChild,
} from '@angular/core';
import type { Chart, ScriptableContext } from 'chart.js';

import { formatarDataLocal, formatarMoeda } from '../../../../shared/valor-monetario';
import { FluxoCaixaConsolidado, SaldoContaPainel } from '../../models/painel-financeiro.model';
import { criarSerieConsolidadaParaGrafico } from '../../utils/painel-visuais';

@Component({
  selector: 'app-fluxo-caixa-card',
  standalone: true,
  templateUrl: './fluxo-caixa.component.html',
})
export class FluxoCaixaCardComponent {
  readonly contas = input.required<SaldoContaPainel[]>();
  readonly contasSelecionadas = input.required<number[]>();
  readonly fluxo = input<FluxoCaixaConsolidado | null>(null);
  readonly carregandoFluxo = input(false);
  readonly erroFluxo = input<string | null>(null);
  readonly ocultarContasZeradas = input(false);
  readonly quantidadeOcultas = input(0);
  readonly erroPreferencias = input<string | null>(null);
  @Output() readonly alternarZeradas = new EventEmitter<void>();
  @Output() readonly selecaoAlterada = new EventEmitter<number[]>();

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('graficoFluxo');
  private readonly destroyRef = inject(DestroyRef);
  private grafico: Chart | null = null;
  private versao = 0;

  readonly moeda = formatarMoeda;
  readonly dataCompleta = formatarDataLocal;
  readonly temPendenciasAteHoje = computed(() => {
    const dados = this.fluxo();
    // A previsão só pode apresentar alteração no dia seguinte em períodos com hoje incluído.
    return !!dados && dados.dataInicio <= dados.dataHoje && dados.dataHoje < dados.dataFim;
  });

  constructor() {
    effect(() => {
      const canvas = this.canvas()?.nativeElement;
      const dados = this.fluxo();
      const versao = ++this.versao;
      this.grafico?.destroy();
      this.grafico = null;
      if (canvas && dados?.pontos?.length) void this.desenhar(canvas, dados, versao);
    });
    this.destroyRef.onDestroy(() => {
      this.versao++;
      this.grafico?.destroy();
      this.grafico = null;
    });
  }

  estaSelecionada(id: number): boolean {
    return this.contasSelecionadas().includes(id);
  }

  alterarConta(id: number, evento: Event): void {
    const marcada = (evento.target as HTMLInputElement).checked;
    const selecao = new Set(this.contasSelecionadas());
    if (marcada) selecao.add(id);
    else selecao.delete(id);
    this.selecaoAlterada.emit([...selecao]);
  }

  selecionarTodas(): void {
    this.selecaoAlterada.emit(this.contas().map(c => c.contaFinanceiraId));
  }

  async desenhar(
    canvas: HTMLCanvasElement, dados: FluxoCaixaConsolidado, versao: number,
  ): Promise<void> {
    // Lazy load: Chart.js não faz parte do bundle inicial do painel.
    const { default: ChartJs } = await import('chart.js/auto');
    if (this.destroyRef.destroyed || versao !== this.versao ||
        this.canvas()?.nativeElement !== canvas) return;

    const hoje = dados.pontos.findIndex(ponto => ponto.data === dados.dataHoje);
    const escalaReais = new Intl.NumberFormat('pt-BR', {
      notation: 'compact', maximumFractionDigits: 1,
    });
    const marcarHoje = {
      id: 'marcarHoje',
      afterDraw(grafico: Chart): void {
        if (hoje < 0 || !grafico.scales['x']) return;
        const x = grafico.scales['x'].getPixelForValue(hoje);
        const { top, bottom, right } = grafico.chartArea;
        if (!Number.isFinite(x)) return;
        const ctx = grafico.ctx;
        ctx.save();
        ctx.strokeStyle = 'rgba(8, 125, 115, 0.56)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#087d73';
        ctx.font = '600 11px sans-serif';
        ctx.fillText('Hoje', Math.min(x + 6, right - 30), top + 13);
        ctx.restore();
      },
    };
    const valores = criarSerieConsolidadaParaGrafico(dados.pontos);

    this.grafico = new ChartJs(canvas, {
      type: 'line',
      data: {
        datasets: [{
          label: 'Saldo consolidado',
          data: valores,
          parsing: false,
          borderColor: '#278f7d',
          backgroundColor: '#b7ded4',
          borderWidth: 2.7,
          tension: 0,
          fill: false,
          pointRadius: (ctx: ScriptableContext<'line'>) =>
            valores[ctx.dataIndex]?.x === hoje ? 4 : 0,
          pointHoverRadius: 6,
          pointHitRadius: 14,
          pointBackgroundColor: '#e5f7f1',
          pointBorderColor: '#12836f',
          pointBorderWidth: 1.5,
          segment: {
            borderColor: (ctx) =>
              (ctx.p0.parsed.y ?? 0) < 0 || (ctx.p1.parsed.y ?? 0) < 0 ? '#d04a58' : '#278f7d',
            borderDash: (ctx) =>
              (ctx.p0.parsed.x ?? -1) >= hoje && hoje >= 0 ? [5, 4] : [],
          },
        }],
      },
      plugins: [marcarHoje],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            // Cruzamentos interpolados não são datas financeiras nem valores realizados.
            filter: (item) => Number.isInteger(item.parsed.x ?? NaN),
            displayColors: false,
            backgroundColor: '#faffff',
            titleColor: '#173447',
            bodyColor: '#173447',
            borderColor: '#cee1e3',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              title: (itens) => {
                const indice = Math.round(itens[0]?.parsed.x ?? 0);
                return formatarDataLocal(dados.pontos[indice]?.data ?? '');
              },
              label: (item) => {
                const indice = Math.round(item.parsed.x ?? 0);
                const ponto = dados.pontos[indice];
                if (!ponto) return '';
                return (ponto.situacao === 'REALIZADO' ? 'Realizado: ' : 'Projetado: ')
                  + formatarMoeda(ponto.saldo);
              },
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: Math.max(1, dados.pontos.length - 1),
            border: { display: false },
            grid: { display: false },
            ticks: {
              color: '#637e8d',
              maxTicksLimit: 7,
              autoSkip: true,
              maxRotation: 0,
              callback: (valor) => {
                const indice = Number(valor);
                return Number.isInteger(indice) && indice >= 0 && indice < dados.pontos.length
                  ? dados.pontos[indice].data.slice(8, 10)
                  : '';
              },
            },
          },
          y: {
            beginAtZero: true,
            grace: '12%',
            border: { display: false },
            ticks: {
              color: '#637e8d',
              maxTicksLimit: 5,
              callback: (valor) => escalaReais.format(Number(valor)),
            },
            grid: {
              color: (ctx) => Number(ctx.tick.value) === 0
                ? 'rgba(133,155,165,.65)' : 'rgba(193,210,217,.35)',
            },
          },
        },
      },
    });
  }
}
