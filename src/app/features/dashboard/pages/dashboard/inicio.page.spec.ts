import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { PainelFinanceiro } from '../../models/painel-financeiro.model';
import {
  CodigoComponentePainel, preferenciasPadrao,
} from '../../models/painel-preferencias.model';
import { PainelFinanceiroService } from '../../services/painel-financeiro.service';
import { PainelPreferenciasService } from '../../services/painel-preferencias.service';
import { InicioPage } from './inicio.page';

describe('Resumo sem redundâncias do painel inicial', () => {
  const dados: PainelFinanceiro = {
    dataInicio: '2026-10-01',
    dataFim: '2026-10-31',
    aReceberPeriodo: '100',
    aPagarPeriodo: '750',
    receberAtrasado: '200',
    pagarAtrasado: '300',
    saldoConfirmado: '1619.76',
    saldoProjetado: '-150.23',
    contas: [
      { contaFinanceiraId: 7, nome: 'Itaú', saldoConfirmado: '119.76', saldoProjetado: '-630.24' },
      { contaFinanceiraId: 8, nome: 'Mercado Pago', saldoConfirmado: '1500', saldoProjetado: '480.01' },
    ],
    proximosVencimentos: [],
  };

  async function montar(codigos?: CodigoComponentePainel[]) {
    const visiveis = preferenciasPadrao().filter(
      item => !codigos || codigos.includes(item.codigoComponente),
    );
    const consultar = jasmine.createSpy('consultar').and.returnValue(of(dados));
    const fluxoCaixaConsolidado = jasmine.createSpy('fluxoCaixaConsolidado').and.returnValue(of({
      dataInicio: dados.dataInicio,
      dataFim: dados.dataFim,
      dataHoje: '2026-10-20',
      saldoHoje: '1619.76',
      saldoFinal: '480.01',
      contas: [],
      pontos: [],
    }));

    await TestBed.configureTestingModule({
      imports: [InicioPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { usuario: () => ({ nome: 'Teste' }) } },
        { provide: PainelFinanceiroService, useValue: {
          consultar,
          fluxoCaixaConsolidado,
          despesasPorCategoria: () => of([]),
        } },
        { provide: PainelPreferenciasService, useValue: {
          erro: () => null,
          visiveis: () => visiveis,
          estaVisivel: (codigo: CodigoComponentePainel) =>
            visiveis.some(item => item.codigoComponente === codigo),
          carregar: async () => undefined,
        } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(InicioPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, consultar, fluxoCaixaConsolidado };
  }

  it('troca Em atraso por projeção do fim do mês de todas as contas', async () => {
    const { fixture } = await montar();
    const raiz = fixture.nativeElement as HTMLElement;
    const resumo = raiz.querySelector('.stats-grid');
    expect(resumo).not.toBeNull();
    expect(resumo?.querySelectorAll('.stat-card').length).toBe(4);
    expect(resumo?.textContent).toContain('Saldo confirmado');
    expect(resumo?.textContent).toContain('A pagar no período');
    expect(resumo?.textContent).toContain('A receber no período');
    expect(resumo?.textContent).toContain('Saldo ao fim do período');
    expect(resumo?.textContent).toContain('Projeção para 31/10 · todas as contas');
    expect(resumo?.textContent).not.toContain('Em atraso');
    expect(resumo?.textContent).not.toContain('200,00 /');
    const valor = resumo?.querySelector('.projection-text');
    expect(valor?.textContent).toContain('150,23');
    expect(valor?.classList.contains('negative')).toBeTrue();
  });

  it('mantém resumo geral quando apenas uma conta é marcada no gráfico', async () => {
    const { fixture, fluxoCaixaConsolidado } = await montar();
    fixture.componentInstance.alterarContasGrafico([7]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.contasGraficoIds()).toEqual([7]);
    expect(fluxoCaixaConsolidado).toHaveBeenCalledWith(
      [7], jasmine.any(String), jasmine.any(String),
    );
    expect((fixture.nativeElement as HTMLElement).querySelector('.projection-text')?.textContent)
      .toContain('150,23');
  });

  it('exibe saldo final mesmo quando apenas o widget de fluxo está visível', async () => {
    const { fixture } = await montar(['FLUXO_CAIXA']);
    const raiz = fixture.nativeElement as HTMLElement;
    const cards = raiz.querySelectorAll('.stats-grid .stat-card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Saldo ao fim do período');
    expect(raiz.querySelectorAll('.cash-flow-total').length).toBe(0);
  });

  it('mantém apenas os títulos principais, sem minitítulos em todos os widgets', async () => {
    const { fixture } = await montar();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelectorAll('.eyebrow').length).toBe(0);
    for (const titulo of [
      'Saldos das contas', 'Despesas por categoria', 'Fluxo de caixa consolidado',
      'Contas a pagar', 'Contas a receber', 'O que deseja fazer?',
    ]) {
      expect(raiz.textContent).toContain(titulo);
    }
    expect(raiz.querySelectorAll('.cash-flow-footer')).toHaveSize(0);
  });

  it('distingue projeção positiva de negativa somente pela cor do valor', async () => {
    const { fixture } = await montar();
    fixture.componentInstance.painel.update(atual =>
      atual ? { ...atual, saldoProjetado: '869.76' } : atual);
    fixture.detectChanges();
    const valor = (fixture.nativeElement as HTMLElement)
      .querySelector('.projection-text') as HTMLElement;
    expect(valor.textContent).toContain('869,76');
    expect(valor.classList.contains('negative')).toBeFalse();
  });
});
