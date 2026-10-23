import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ContasPagarCardComponent } from './contas-pagar.component';

describe('Card de contas a pagar', () => {
  it('resume despesa com data, descrição, valor e atraso sem conta nem categoria', async () => {
    await TestBed.configureTestingModule({
      imports: [ContasPagarCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(ContasPagarCardComponent);
    fixture.componentRef.setInput('itens', [{
      lancamentoId: 2,
      contaFinanceiraId: 5,
      contaFinanceiraNome: 'Itaú',
      categoriaNome: 'Moradia',
      descricao: 'Conta de luz',
      tipo: 'DESPESA',
      vencimento: '2026-10-20',
      valorOriginal: '120.00',
      valorRestante: '120.00',
      atrasado: true,
    }]);
    fixture.detectChanges();

    const card = fixture.nativeElement as HTMLElement;
    expect(card.querySelector('time')?.textContent?.trim()).toBe('20/10');
    expect(card.querySelector('.due-description')?.textContent).toContain('Conta de luz');
    expect(card.querySelector('.late-label')?.textContent).toContain('Atrasado');
    expect(card.querySelector('.due-value')?.textContent).toContain('120,00');
    expect(card.querySelector('.due-end .due-value')).not.toBeNull();
    expect(card.querySelector('.due-end app-lancamento-acoes')).not.toBeNull();
    expect(card.textContent).not.toContain('Itaú');
    expect(card.textContent).not.toContain('Moradia');
    expect(card.querySelector('.due-description small')).toBeNull();
  });

  it('combina faturas previstas e contas normais ordenadas por vencimento', async () => {
    await TestBed.configureTestingModule({
      imports: [ContasPagarCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ContasPagarCardComponent);
    fixture.componentRef.setInput('itens', [{
      lancamentoId: 10, contaFinanceiraId: 5, contaFinanceiraNome: 'Conta',
      descricao: 'Aluguel', categoriaNome: 'Moradia', tipo: 'DESPESA',
      vencimento: '2026-10-30', valorOriginal: '750.00',
      valorRestante: '750.00', atrasado: false,
    }]);
    fixture.componentRef.setInput('faturas', [
      { cartaoCreditoId: 7, cartaoCreditoNome: 'Nubank',
        competencia: '2026-10-01', vencimento: '2026-10-25',
        valorOriginal: '1000', valorRestante: '600',
        atrasado: false, previa: true },
      { cartaoCreditoId: 8, cartaoCreditoNome: 'Itaú',
        competencia: '2026-09-01', vencimento: '2026-10-05',
        valorOriginal: '850', valorRestante: '850',
        atrasado: true, previa: false },
    ]);
    fixture.componentRef.setInput('mesReferencia', '2026-10');
    fixture.detectChanges();

    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.due-row'));
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('Fatura Itaú');
    expect(rows[1].textContent).toContain('Fatura Nubank');
    expect(rows[2].textContent).toContain('Aluguel');
    expect(rows[0].textContent).toContain('Atrasado');
    expect(rows[1].textContent).not.toContain('Prévia da fatura');
    expect(rows[1].textContent).not.toContain('Fatura do cartão');
    expect(rows[1].textContent).not.toContain('Detalhes →');
    expect(rows[1].textContent).toContain('600,00');
    expect(rows[0].querySelector('app-lancamento-acoes')).toBeNull();
    expect(rows[1].querySelector('app-lancamento-acoes')).toBeNull();
    expect(rows[2].querySelector('app-lancamento-acoes')).not.toBeNull();
    const opcaoItau = rows[0].querySelector<HTMLAnchorElement>('a.rf-fatura-opcoes[href="/cartoes/8?competencia=2026-09"]');
    const opcaoNubank = rows[1].querySelector<HTMLAnchorElement>('a.rf-fatura-opcoes[href="/cartoes/7?competencia=2026-10"]');
    expect(opcaoItau).not.toBeNull();
    expect(opcaoNubank).not.toBeNull();
    expect(opcaoItau?.getAttribute('aria-label')).toBe('Ver detalhes da Fatura Itaú');
    expect(opcaoNubank?.getAttribute('aria-label')).toBe('Ver detalhes da Fatura Nubank');
    expect(opcaoNubank?.querySelectorAll('svg circle').length).toBe(3);
    expect(rows[1].querySelector('.rf-fatura-origem')).toBeNull();
    expect(rows[1].querySelector('.rf-fatura-detalhes')).toBeNull();
  });

  it('mostra somente os cinco vencimentos prioritarios do conjunto', async () => {
    await TestBed.configureTestingModule({
      imports: [ContasPagarCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ContasPagarCardComponent);
    fixture.componentRef.setInput('itens', []);
    fixture.componentRef.setInput('faturas', Array.from({ length: 7 }, (_, i) => ({
      cartaoCreditoId: i + 1, cartaoCreditoNome: 'Cartão ' + (i + 1),
      competencia: '2026-10-01', vencimento: '2026-10-' + String(10 + i).padStart(2, '0'),
      valorOriginal: '100', valorRestante: '100', atrasado: false, previa: true,
    })));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.due-row').length).toBe(5);
  });
});
