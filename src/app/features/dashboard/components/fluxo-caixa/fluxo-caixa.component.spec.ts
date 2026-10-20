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
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FluxoCaixaCardComponent],
    }).compileComponents();
  });

  it('permite alternar contas zeradas pelo botão de olho', () => {
    const fixture = preparar();
    const alternar = spyOn(fixture.componentInstance.alternarZeradas, 'emit');
    const botao = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.cash-flow-zero-toggle',
    );
    expect(botao?.textContent).toContain('Ocultar zeradas');
    botao?.click();
    expect(alternar).toHaveBeenCalled();
    fixture.componentRef.setInput('ocultarContasZeradas', true);
    fixture.componentRef.setInput('quantidadeOcultas', 2);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Exibir zeradas');
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
