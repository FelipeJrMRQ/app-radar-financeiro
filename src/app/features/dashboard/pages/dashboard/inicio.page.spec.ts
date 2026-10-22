import { CartoesService } from '../../../cartoes/services/cartoes.service';
import { TemaService } from '../../../../core/tema/tema.service';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PrivacidadeValoresService } from '../../../../core/privacidade/privacidade-valores.service';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { PainelFinanceiro } from '../../models/painel-financeiro.model';
import {
  CodigoComponentePainel, preferenciasPadrao,
} from '../../models/painel-preferencias.model';
import { PainelFinanceiroService } from '../../services/painel-financeiro.service';
import { PainelPreferenciasService } from '../../services/painel-preferencias.service';
import { PreferenciasFluxoCaixaService } from '../../services/preferencias-fluxo-caixa.service';
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
    const consultarCartoes = jasmine.createSpy('consultarPainel').and.returnValue(of([]));
    const fluxoCaixaConsolidado = jasmine.createSpy('fluxoCaixaConsolidado').and.returnValue(of({
      dataInicio: dados.dataInicio,
      dataFim: dados.dataFim,
      dataHoje: '2026-10-20',
      saldoHoje: '1619.76',
      saldoFinal: '480.01',
      contas: [],
      pontos: [],
    }));

    const visibilidade = signal(true);
    await TestBed.configureTestingModule({
      imports: [InicioPage],
      providers: [
        { provide: TemaService, useValue: { efetivo: signal('CLARO') } },
        provideRouter([]),
        { provide: PrivacidadeValoresService, useValue: { valoresVisiveis: visibilidade.asReadonly() } },
        { provide: AuthService, useValue: { usuario: () => ({ nome: 'Teste' }) } },
        { provide: CartoesService, useValue: { consultarPainel: consultarCartoes } },
        { provide: PainelFinanceiroService, useValue: {
          consultar,
          fluxoCaixaConsolidado,
          despesasPorCategoria: () => of([]),
        } },
        { provide: PreferenciasFluxoCaixaService, useValue: {
          erro: () => null,
          carregar: async () => ({ ocultarContasZeradas: false, contasDesmarcadas: [] }),
          salvar: jasmine.createSpy('salvarPreferencias'),
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
    return { fixture, consultar, fluxoCaixaConsolidado, consultarCartoes, visibilidade };
  }

  it('oculta apenas contas realmente zeradas, preservando preferências manuais', async () => {
    const { fixture } = await montar();
    const pagina = fixture.componentInstance;
    pagina.painel.update(atual => atual ? {
      ...atual,
      contas: [...atual.contas,
        { contaFinanceiraId: 9, nome: 'Conta zero', saldoConfirmado: '0.0000', saldoProjetado: '0' },
        { contaFinanceiraId: 10, nome: 'Conta futura', saldoConfirmado: '0', saldoProjetado: '50' },
      ],
    } : atual);
    pagina.alterarContasGrafico([7, 9, 10]);
    expect(pagina.contasDesmarcadas()).toContain(8);
    pagina.alternarContasZeradas();
    expect(pagina.contasVisiveis().map(conta => conta.contaFinanceiraId)).toEqual([7, 8, 10]);
    expect(pagina.contasGraficoIds()).toEqual([7, 10]);
    pagina.alternarContasZeradas();
    expect(pagina.contasGraficoIds()).toEqual([7, 9, 10]);
  });

  it('oculta apenas saldos e valores a receber, mantendo valores a pagar', async () => {
    const { fixture, visibilidade } = await montar();
    visibilidade.set(false);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.stats-grid')?.textContent).toContain('••••••');
    expect(raiz.querySelector('.stats-grid')?.textContent).not.toContain('1.619,76');
    expect(raiz.querySelector('.account-list')?.textContent).not.toContain('119,76');
    // O mock retorna pontos vazios; o teste do componente verifica o canvas real.
    expect(raiz.textContent).not.toContain('Gráfico protegido');
    expect(raiz.querySelector('.stats-grid')?.textContent).toContain('750,00');
    expect(raiz.querySelector('.due-panel')?.textContent).not.toContain('••••••');

    visibilidade.set(true);
    fixture.detectChanges();
    expect(raiz.querySelector('.stats-grid')?.textContent).toContain('1.619,76');
  });

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

  it('filtra apenas o total do card de caixa, sem alterar os saldos globais ou o gráfico', async () => {
    const { fixture, fluxoCaixaConsolidado } = await montar();
    const raiz = fixture.nativeElement as HTMLElement;
    const checkboxes = raiz.querySelectorAll<HTMLInputElement>(
      '.cash-balances-panel .cash-balances-row input[type=checkbox]',
    );
    expect(checkboxes.length).toBe(2);
    expect(checkboxes[0].checked).toBeTrue();
    checkboxes[1].checked = false;
    checkboxes[1].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.contasGraficoIds()).toEqual([7, 8]);
    expect(fluxoCaixaConsolidado).not.toHaveBeenCalledWith([7], jasmine.any(String), jasmine.any(String));
    expect(raiz.querySelector('.cash-balances-total')?.textContent).toContain('119,76');
    expect(raiz.querySelector('.cash-balances-total')?.textContent).toContain('630,24');
    expect(raiz.querySelector('.stats-grid')?.textContent).toContain('1.619,76');
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
      'Saldos de caixa', 'Despesas por categoria', 'Fluxo de caixa consolidado',
      'Contas a pagar', 'Contas a receber', 'Meus cartões', 'O que deseja fazer?',
    ]) {
      expect(raiz.textContent).toContain(titulo);
    }
    expect(raiz.querySelectorAll('.cash-flow-footer')).toHaveSize(0);
  });

  it('consulta cartões da competência selecionada sem interferir no painel', async () => {
    const { fixture, consultarCartoes } = await montar();
    expect(consultarCartoes).toHaveBeenCalledWith(fixture.componentInstance.mesReferencia());
    const anterior = fixture.componentInstance.mesReferencia();
    fixture.componentInstance.mudarMes(1);
    await fixture.whenStable();
    expect(fixture.componentInstance.mesReferencia()).not.toBe(anterior);
    expect(consultarCartoes).toHaveBeenCalledWith(fixture.componentInstance.mesReferencia());
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
