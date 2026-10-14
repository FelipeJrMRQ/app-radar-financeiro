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
    expect(card.textContent).not.toContain('Itaú');
    expect(card.textContent).not.toContain('Moradia');
    expect(card.querySelector('.due-description small')).toBeNull();
  });
});
