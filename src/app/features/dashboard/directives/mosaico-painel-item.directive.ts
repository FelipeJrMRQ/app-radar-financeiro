import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

/**
 * Calcula a quantidade de linhas de uma grade de altura fixa para acomodar o
 * conteúdo real do card. O arredondamento deixa, no máximo, uma linha residual.
 */
export function calcularLinhasMosaico(
  alturaElemento: number, alturaLinha: number, espacamento: number,
): number {
  if (!Number.isFinite(alturaElemento) || alturaElemento <= 0
      || !Number.isFinite(alturaLinha) || alturaLinha <= 0
      || !Number.isFinite(espacamento) || espacamento < 0) {
    return 1;
  }
  return Math.max(1, Math.ceil((alturaElemento + espacamento) / (alturaLinha + espacamento)));
}

/**
 * Ajusta o espaço vertical do card quando seu conteúdo cresce ou diminui.
 * Não muda a ordem de preferência: o navegador posiciona os widgets na ordem
 * do DOM, sempre na próxima posição livre da grade.
 *
 * No celular o container vira flex column, preservando a ordem integral.
 */
@Directive({
  selector: '[rfMosaicoPainelItem]',
  standalone: true,
})
export class MosaicoPainelItemDirective implements AfterViewInit, OnDestroy {
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zona = inject(NgZone);
  private observador?: ResizeObserver;
  private telaDesktop?: MediaQueryList;
  private quadroPendente = 0;

  private readonly atualizarAoMudarTela = () => this.agendarMedicao();

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    this.zona.runOutsideAngular(() => {
      this.telaDesktop = window.matchMedia('(min-width: 640px)');
      this.telaDesktop.addEventListener('change', this.atualizarAoMudarTela);
      if (typeof ResizeObserver !== 'undefined') {
        this.observador = new ResizeObserver(() => this.agendarMedicao());
        this.observador.observe(this.elemento);
      } else {
        window.addEventListener('resize', this.atualizarAoMudarTela);
      }
      // Primeiro cálculo antes do próximo desenho reduz deslocamentos de layout.
      this.aplicarMedicao();
    });
  }

  private agendarMedicao(): void {
    if (this.quadroPendente) return;
    this.quadroPendente = window.requestAnimationFrame(() => {
      this.quadroPendente = 0;
      this.aplicarMedicao();
    });
  }

  private aplicarMedicao(): void {
    if (!this.telaDesktop?.matches) {
      this.elemento.style.removeProperty('grid-row-end');
      return;
    }
    const grade = this.elemento.parentElement;
    if (!grade) return;
    const estilo = window.getComputedStyle(grade);
    const alturaLinha = Number.parseFloat(estilo.gridAutoRows);
    const espacamento = Number.parseFloat(estilo.rowGap);
    const altura = this.elemento.getBoundingClientRect().height;
    const linhas = calcularLinhasMosaico(altura, alturaLinha, espacamento);
    const valor = 'span ' + linhas;
    if (this.elemento.style.gridRowEnd !== valor) {
      this.elemento.style.gridRowEnd = valor;
    }
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    this.telaDesktop?.removeEventListener('change', this.atualizarAoMudarTela);
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.atualizarAoMudarTela);
      if (this.quadroPendente) window.cancelAnimationFrame(this.quadroPendente);
    }
  }
}
