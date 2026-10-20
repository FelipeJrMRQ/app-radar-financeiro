import {
  Component, computed, DestroyRef, effect, ElementRef, EventEmitter,
  inject, input, Output, viewChild,
} from '@angular/core';
import type { Chart, ScriptableContext } from 'chart.js';

import { formatarDiaMes, formatarDataLocal, formatarMoeda } from '../../../../shared/valor-monetario';
import { FluxoCaixaConsolidado, SaldoContaPainel } from '../../models/painel-financeiro.model';

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
  @Output() readonly selecaoAlterada = new EventEmitter<number[]>();

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('graficoFluxo');
  private readonly destroyRef = inject(DestroyRef);
  private grafico: Chart | null = null;
  private versao = 0;

  readonly moeda = formatarMoeda;
  readonly data = formatarDiaMes;
  readonly dataCompleta = formatarDataLocal;
  readonly saldoHojeNegativo = computed(() => Number(this.fluxo()?.saldoHoje ?? 0) < 0);
  readonly saldoFinalNegativo = computed(() => Number(this.fluxo()?.saldoFinal ?? 0) < 0);
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

  saldoNegativo(valor: string | number): boolean {
    return Number(valor) < 0;
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
        ctx.strokeStyle = 'rgba(94, 220, 188, 0.68)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#8cf0d2';
        ctx.font = '600 11px sans-serif';
        ctx.fillText('Hoje', Math.min(x + 6, right - 30), top + 13);
        ctx.restore();
      },
    };
    const valores = dados.pontos.map((ponto, indice) => ({
      x: indice, y: Number(ponto.saldo),
    }));

    this.grafico = new ChartJs(canvas, {
      type: 'line',
      data: {
        datasets: [{
          label: 'Saldo consolidado',
          data: valores,
          parsing: false,
          borderColor: '#a9bac5',
          backgroundColor: '#b9d2d5',
          borderWidth: 2.7,
          tension: 0,
          fill: false,
          pointRadius: (ctx: ScriptableContext<'line'>) => ctx.dataIndex === hoje ? 4 : 0,
          pointHoverRadius: 6,
          pointHitRadius: 14,
          pointBackgroundColor: '#8be6cc',
          pointBorderColor: '#0c2030',
          pointBorderWidth: 1.5,
          segment: {
            borderColor: (ctx) =>
              (ctx.p0.parsed.y ?? 0) < 0 || (ctx.p1.parsed.y ?? 0) < 0 ? '#ff6972' : '#b6c5cb',
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
              color: '#a9c0ca',
              maxTicksLimit: 9,
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
            grace: '12%',
            border: { display: false },
            ticks: {
              color: '#a9c0ca',
              maxTicksLimit: 6,
              callback: (valor) => escalaReais.format(Number(valor)),
            },
            grid: {
              color: (ctx) => Number(ctx.tick.value) === 0
                ? 'rgba(223,233,235,.58)' : 'rgba(178,199,205,.14)',
            },
          },
        },
      },
    });
  }
}
