import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SaldosContasCardComponent } from './saldos-contas.component';

describe('Card de saldos de caixa', () => {
  async function montar() {
    await TestBed.configureTestingModule({
      imports: [SaldosContasCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(SaldosContasCardComponent);
    fixture.componentRef.setInput('contas', [
      { contaFinanceiraId: 8, nome: 'Itaú', saldoConfirmado: '169.59', saldoProjetado: '-891.08' },
      { contaFinanceiraId: 9, nome: 'Mercado Pago', saldoConfirmado: '0', saldoProjetado: '0' },
    ]);
    fixture.componentRef.setInput('valoresVisiveis', true);
    fixture.detectChanges();
    return fixture;
  }

  it('mantém três colunas alinhadas e total ao final, inclusive no celular', async () => {
    const fixture = await montar();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('#titulo-saldos')?.textContent).toBe('Saldos de caixa');
    expect(raiz.querySelectorAll('.cash-balances-row').length).toBe(2);
    expect(raiz.querySelectorAll('.cash-balances-row .cash-balances-amount').length).toBe(4);
    expect(raiz.querySelector('.cash-balances-total')?.textContent).toContain('Total');
    expect(raiz.querySelectorAll('.cash-balances-column-title').length).toBe(2);
    expect(raiz.querySelector('.account-list')?.getAttribute('tabindex')).toBeNull();
    expect(raiz.querySelector('.cash-balances-total .negative')?.textContent).toContain('891,08');
    fixture.destroy();
  });

  it('preserva privacidade também nos totais e nos rótulos acessíveis', async () => {
    const fixture = await montar();
    fixture.componentRef.setInput('valoresVisiveis', false);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelectorAll('.cash-balances-amount').length).toBe(6);
    expect(raiz.textContent).not.toContain('169,59');
    expect(raiz.textContent).not.toContain('891,08');
    expect(raiz.querySelector('.cash-balances-amount')?.getAttribute('aria-label'))
      .toContain('valor oculto');
    fixture.destroy();
  });

  it('recalcula os dois totais ao selecionar e desmarcar contas, sem alterar as linhas', async () => {
    const fixture = await montar();
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const checks = root.querySelectorAll<HTMLInputElement>('input[type=checkbox]');
    const footer = root.querySelector('.cash-balances-total');

    expect(component.totalConfirmado()).toBe(1695900n);
    expect(component.totalProjetado()).toBe(-8910800n);
    expect(checks.length).toBe(3);

    checks[1].checked = false;
    checks[1].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.totalConfirmado()).toBe(0n);
    expect(component.totalProjetado()).toBe(0n);
    expect(footer?.textContent).toContain('0,00');
    expect(root.querySelectorAll('.cash-balances-row').length).toBe(2);

    checks[2].checked = false;
    checks[2].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.totalConfirmado()).toBe(0n);
    expect(component.totalProjetado()).toBe(0n);

    checks[1].checked = true;
    checks[1].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.totalConfirmado()).toBe(1695900n);
    expect(component.totalProjetado()).toBe(-8910800n);
    expect(footer?.textContent).toContain('169,59');
    expect(footer?.textContent).toContain('891,08');
    fixture.destroy();
  });

  it('checkbox geral ativa e desativa todas as contas, com estado parcial', async () => {
    const fixture = await montar();
    const component = fixture.componentInstance;
    const checks = (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLInputElement>('input[type=checkbox]');
    expect(checks[0].checked).toBeTrue();
    checks[2].checked = false;
    checks[2].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(checks[0].indeterminate).toBeTrue();
    checks[0].checked = false;
    checks[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.contasSelecionadas()).toEqual([]);
    checks[0].checked = true;
    checks[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.contasSelecionadas().length).toBe(2);
    fixture.destroy();
  });

  it('preserva exatamente centavos e sinais ao somar saldos mistos', async () => {
    const fixture = await montar();
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('contas', [
      { contaFinanceiraId: 8, nome: 'Itaú', saldoConfirmado: '0.10', saldoProjetado: '-100.29' },
      { contaFinanceiraId: 9, nome: 'Mercado Pago', saldoConfirmado: '0.20', saldoProjetado: '90.29' },
    ]);
    fixture.detectChanges();
    expect(component.totalConfirmado()).toBe(3000n);
    expect(component.totalProjetado()).toBe(-100000n);
    const footer = (fixture.nativeElement as HTMLElement).querySelector('.cash-balances-total');
    expect(footer?.textContent).toContain('0,30');
    expect(footer?.textContent).toContain('10,00');
    fixture.destroy();
  });
});
