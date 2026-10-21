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
    fixture.componentRef.setInput('saldoConfirmado', '169.59');
    fixture.componentRef.setInput('saldoProjetado', '-891.08');
    fixture.componentRef.setInput('contasSelecionadas', [8, 9]);
    fixture.componentRef.setInput('contasSelecionaveis', [8, 9]);
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

  it('reutiliza a seleção do fluxo ao marcar, desmarcar e selecionar todas', async () => {
    const fixture = await montar();
    const componente = fixture.componentInstance;
    const emitido = spyOn(componente.selecaoAlterada, 'emit');
    const checkboxes = (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLInputElement>('input[type=checkbox]');
    expect(checkboxes.length).toBe(3);
    expect(checkboxes[0].checked).toBeTrue();
    checkboxes[1].checked = false;
    checkboxes[1].dispatchEvent(new Event('change'));
    expect(emitido).toHaveBeenCalledWith([9]);

    fixture.componentRef.setInput('contasSelecionadas', [9]);
    fixture.detectChanges();
    expect(checkboxes[0].indeterminate).toBeTrue();
    checkboxes[0].checked = true;
    checkboxes[0].dispatchEvent(new Event('change'));
    expect(emitido).toHaveBeenCalledWith([9, 8]);
    fixture.destroy();
  });

  it('não oferece seleção para conta escondida pelo filtro de zeradas', async () => {
    const fixture = await montar();
    fixture.componentRef.setInput('contasSelecionaveis', [8]);
    fixture.componentRef.setInput('contasSelecionadas', [8]);
    fixture.detectChanges();
    const checkboxes = (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLInputElement>('input[type=checkbox]');
    expect(checkboxes[2].disabled).toBeTrue();
    expect(checkboxes[0].checked).toBeTrue();
    fixture.destroy();
  });
});
