import {
  Component, computed, DestroyRef, effect, ElementRef, inject, input, viewChild,
} from '@angular/core';
import type { Chart } from 'chart.js';

import { TotalCategoria } from '../../models/painel-financeiro.model';
import { DadosDespesasRosca, prepararDespesasRosca } from '../../utils/despesas-rosca';

@Component({
  selector: 'app-despesas-categoria-card',
  standalone: true,
  templateUrl: './despesas-categoria.component.html',
})
export class DespesasCategoriaCardComponent {
  readonly categorias = input.required<TotalCategoria[]>();
  readonly valoresVisiveis = input(false);
  readonly erroCategorias = input<string | null>(null);

  readonly dadosRosca = computed(() => prepararDespesasRosca(this.categorias()));
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('graficoDespesas');
  private readonly destroyRef = inject(DestroyRef);
  private grafico: Chart | null = null;
  private versao = 0;

  constructor() {
    effect(() => {
      const canvas = this.canvas()?.nativeElement;
      const dados = this.dadosRosca();
      const erro = this.erroCategorias();
      const versaoAtual = ++this.versao;
      this.grafico?.destroy();
      this.grafico = null;
      if (canvas && !erro && dados.fatias.length) {
        void this.desenhar(canvas, dados, versaoAtual);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.versao++;
      this.grafico?.destroy();
      this.grafico = null;
    });
  }

  private async desenhar(
    canvas: HTMLCanvasElement, dados: DadosDespesasRosca, versao: number,
  ): Promise<void> {
    // Reaproveita o carregamento sob demanda do Chart.js utilizado no fluxo de caixa.
    const { default: ChartJs } = await import('chart.js/auto');
    if (this.destroyRef.destroyed || versao !== this.versao
        || this.canvas()?.nativeElement !== canvas) return;

    this.grafico = new ChartJs(canvas, {
      type: 'doughnut',
      data: {
        labels: dados.fatias.map(fatia => fatia.nome),
        datasets: [{
          label: 'Despesas realizadas',
          data: dados.fatias.map(fatia => Number(fatia.valor)),
          backgroundColor: dados.fatias.map(fatia => fatia.cor),
          borderColor: '#fff',
          borderWidth: 2,
          borderRadius: 3,
          hoverOffset: 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#fff',
            titleColor: '#173447',
            bodyColor: '#173447',
            borderColor: '#d7e5e8',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              title: () => '',
              label: contexto => {
                const fatia = dados.fatias[contexto.dataIndex];
                if (!fatia) return '';
                const complemento = fatia.quantidadeAgrupada > 1
                  ? ' (' + fatia.quantidadeAgrupada + ' categorias)' : '';
                return fatia.nome + complemento + ': '
                  + fatia.valorFormatado + ' · ' + fatia.percentualFormatado;
              },
            },
          },
        },
      },
    });
  }
}
