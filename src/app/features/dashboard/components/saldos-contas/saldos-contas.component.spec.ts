import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SaldosContasCardComponent } from './saldos-contas.component';

describe('Card de saldos por conta', () => {
  it('conserva rótulos dos valores para layout de duas colunas no mobile', async () => {
    await TestBed.configureTestingModule({
      imports: [SaldosContasCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(SaldosContasCardComponent);
    fixture.componentRef.setInput('contas', [{
      contaFinanceiraId: 8, nome: 'Nubank',
      saldoConfirmado: '250.00', saldoProjetado: '1750.00',
    }]);
    fixture.componentRef.setInput('saldoConfirmado', '250.00');
    fixture.componentRef.setInput('saldoProjetado', '1750.00');
    fixture.detectChanges();
    const card = fixture.nativeElement as HTMLElement;
    const labels = Array.from(card.querySelectorAll('.account-value-label'))
      .map(node => node.textContent?.trim());
    expect(labels).toEqual(['Confirmado', 'Projetado', 'Confirmado', 'Projetado']);
    expect(card.querySelector('.account-list')?.getAttribute('tabindex')).toBeNull();
  });
});
