import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ContasReceberCardComponent } from './contas-receber.component';

describe('Card de contas a receber', () => {
  it('mostra dia/mês mantendo a data completa para acessibilidade', async () => {
    await TestBed.configureTestingModule({
      imports: [ContasReceberCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(ContasReceberCardComponent);
    fixture.componentRef.setInput('total', '1500.00');
    fixture.componentRef.setInput('itens', [{
      lancamentoId: 1,
      contaFinanceiraId: 9,
      contaFinanceiraNome: 'Nubank',
      categoriaNome: 'Salário',
      descricao: 'Salário',
      tipo: 'RECEITA',
      vencimento: '2026-10-20',
      valorOriginal: '1500.00',
      valorRestante: '1500.00',
      atrasado: false,
    }]);
    fixture.detectChanges();

    const card = fixture.nativeElement as HTMLElement;
    const data = card.querySelector('time');
    expect(data?.textContent?.trim()).toBe('20/10');
    expect(data?.getAttribute('datetime')).toBe('2026-10-20');
    expect(data?.getAttribute('title')).toBe('20/10/2026');
    expect(data?.getAttribute('aria-label')).toBe('Vencimento: 20/10/2026');
    expect(card.querySelector('.due-list')?.getAttribute('tabindex')).toBe('0');
    expect(card.querySelector('.panel-total')?.textContent).toContain('1.500,00');
  });
});
