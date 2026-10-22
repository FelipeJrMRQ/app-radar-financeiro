import { signal } from '@angular/core';
import { TemaService } from '../../../../core/tema/tema.service';
import { TestBed } from '@angular/core/testing';

import { FluxoCaixaCardComponent } from './fluxo-caixa.component';
import { FluxoCaixaConsolidado } from '../../models/painel-financeiro.model';

describe('Fluxo de caixa consolidado', () => {
  function preparar() {
    const fixture = TestBed.createComponent(FluxoCaixaCardComponent);
    fixture.componentRef.setInput('contas', [
      { contaFinanceiraId: 13, nome: 'Nubank', saldoConfirmado: '-150.25', saldoProjetado: -600 },
      { contaFinanceiraId: 29, nome: 'Itaú', saldoConfirmado: 750, saldoProjetado: 700 },
    ]);
    fixture.componentRef.setInput('contasSelecionadas', [13, 29]);
    fixture.componentRef.setInput('valoresVisiveis', true);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [{ provide: TemaService, useValue: { efetivo: signal('CLARO') } }],
      imports: [FluxoCaixaCardComponent],
    }).compileComponents();
  });

  it('mantém o gráfico visível sem anunciar saldo final ao ativar privacidade', () => {
    const fixture = preparar();
    fixture.componentRef.setInput('fluxo', {
      dataInicio: '2026-10-01', dataFim: '2026-10-31', dataHoje: '2026-10-20',
      saldoHoje: '1789.00', saldoFinal: '9999.00', contas: [],
      pontos: [{ data: '2026-10-20', saldo: '1789.00', situacao: 'REALIZADO' }],
    });
    fixture.componentRef.setInput('valoresVisiveis', false);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const grafico = raiz.querySelector('.cash-flow-chart canvas');
    expect(grafico).not.toBeNull();
    expect(grafico?.getAttribute('aria-label')).not.toContain('9.999,00');
    expect(grafico?.getAttribute('aria-label')).toContain('Toque ou clique');
    expect(raiz.textContent).not.toContain('9.999,00');
    fixture.destroy();
  });

  it('permite revelar saldos apenas por clique no gráfico durante a privacidade', async () => {
    const fixture = preparar();
    fixture.componentRef.setInput('fluxo', {
      dataInicio: '2026-10-19', dataFim: '2026-10-21', dataHoje: '2026-10-20',
      saldoHoje: '1500.00', saldoFinal: '900.00', contas: [],
      pontos: [
        { data: '2026-10-19', saldo: '1200.00', situacao: 'REALIZADO' },
        { data: '2026-10-20', saldo: '1500.00', situacao: 'REALIZADO' },
        { data: '2026-10-21', saldo: '900.00', situacao: 'PROJETADO' },
      ],
    });
    fixture.componentRef.setInput('valoresVisiveis', false);
    fixture.detectChanges();
    await fixture.whenStable();

    const { default: ChartJs } = await import('chart.js/auto');
    const canvas = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLCanvasElement>('.cash-flow-chart canvas');
    expect(canvas).not.toBeNull();
    // Chart.js é importado dinamicamente; whenStable não garante que o import
    // e o efeito de desenho tenham terminado na mesma microtarefa.
    for (let tentativa = 0; tentativa < 8 && !ChartJs.getChart(canvas!); tentativa++) {
      await new Promise<void>(resolver => requestAnimationFrame(() => resolver()));
    }
    const graficoPrivado = ChartJs.getChart(canvas!);
    expect(graficoPrivado).toBeDefined();
    expect(graficoPrivado?.options.events).toEqual(['click']);
    const escalaPrivada = graficoPrivado?.options.scales?.['y']?.ticks?.callback;
    expect(escalaPrivada?.call(graficoPrivado?.scales['y'] as never, 1500, 0, []))
      .toBe('');

    fixture.componentRef.setInput('valoresVisiveis', true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(canvas?.getAttribute('aria-label')).toContain('900,00');
    fixture.destroy();
  });

  it('permite alternar contas zeradas pelo botão de olho', () => {
    const fixture = preparar();
    const alternar = spyOn(fixture.componentInstance.alternarZeradas, 'emit');
    const botao = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.cash-flow-zero-toggle',
    );
    expect(botao?.getAttribute('aria-label')).toContain('Ocultar contas com saldo zerado');
    expect(botao?.querySelector('fa-icon')).not.toBeNull();
    botao?.click();
    expect(alternar).toHaveBeenCalled();
    fixture.componentRef.setInput('ocultarContasZeradas', true);
    fixture.componentRef.setInput('quantidadeOcultas', 2);
    fixture.detectChanges();
    expect(botao?.getAttribute('aria-label')).toContain('Exibir contas com saldo zerado');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('2 conta(s) zerada(s)');
  });

  it('exibe nomes e seleção de contas sem repetir os saldos do card de contas', () => {
    const fixture = preparar();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Nubank');
    expect(raiz.textContent).toContain('Itaú');
    expect(raiz.textContent).toContain('2 de 2 contas');
    expect(raiz.querySelectorAll('input[type="checkbox"]').length).toBe(2);
    expect(raiz.querySelectorAll('.cash-flow-total').length).toBe(0);
    expect(raiz.querySelectorAll('.cash-flow-account-value').length).toBe(0);
    expect(raiz.querySelector('.cash-flow-footer')).toBeNull();
    expect(raiz.textContent).not.toContain('Saldo confirmado hoje');
    expect(raiz.textContent).not.toContain('Saldo ao fim do período');
    expect(raiz.textContent).not.toContain('PLANEJAMENTO FINANCEIRO');
  });

  it('emite seleção múltipla mantendo as outras contas e permite selecionar todas', () => {
    const fixture = preparar();
    const evento = spyOn(fixture.componentInstance.selecaoAlterada, 'emit');
    const checkboxes = (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes[0].click();
    expect(evento).toHaveBeenCalledOnceWith([29]);
    fixture.componentRef.setInput('contasSelecionadas', [29]);
    fixture.detectChanges();
    fixture.componentInstance.selecionarTodas();
    expect(evento).toHaveBeenCalledWith([13, 29]);
  });

  it('não cria gráfico vazio quando todas as contas são desmarcadas', () => {
    const fixture = preparar();
    fixture.componentRef.setInput('contasSelecionadas', []);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Selecione ao menos uma conta');
    expect(raiz.querySelector('canvas')).toBeNull();
  });

  it('mantém um único gráfico com saldo final acessível sem painel de totais duplicado', () => {
    const fixture = preparar();
    const fluxo: FluxoCaixaConsolidado = {
      dataInicio: '2026-10-19',
      dataFim: '2026-10-22',
      dataHoje: '2026-10-20',
      saldoHoje: '599.75',
      saldoFinal: '-490.50',
      contas: [
        { contaFinanceiraId: 13, nome: 'Nubank', saldoHoje: '-150.25', saldoFinal: '-1190.50' },
        { contaFinanceiraId: 29, nome: 'Itaú', saldoHoje: 750, saldoFinal: 700 },
      ],
      pontos: [
        { data: '2026-10-19', saldo: 690, situacao: 'REALIZADO' },
        { data: '2026-10-20', saldo: '599.75', situacao: 'REALIZADO' },
        { data: '2026-10-21', saldo: -200, situacao: 'PROJETADO' },
        { data: '2026-10-22', saldo: '-490.50', situacao: 'PROJETADO' },
      ],
    };
    fixture.componentRef.setInput('fluxo', fluxo);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelectorAll('.cash-flow-chart canvas').length).toBe(1);
    expect(raiz.querySelector('.cash-flow-chart canvas')?.getAttribute('aria-label'))
      .toContain('490,50');
    expect(raiz.querySelector('.cash-flow-total')).toBeNull();
    expect(raiz.querySelector('.cash-flow-footer')).toBeNull();
  });
});
