import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ContasFinanceirasService } from '../../services/contas-financeiras.service';
import { ContasListaPage } from './contas-lista.page';

describe('Listagem de contas financeiras', () => {
  it('permite visualizar contas inativas sem misturá-las às ativas', async () => {
    const listar = jasmine.createSpy('listar').and.returnValue(of([
      { id: 1, nome: 'Ativa', tipo: 'CARTEIRA', saldoInicial: 0,
        ativo: true, criadoEm: '', atualizadoEm: '' },
      { id: 2, nome: 'Antiga', tipo: 'CONTA_CORRENTE', saldoInicial: 500,
        ativo: false, criadoEm: '', atualizadoEm: '' },
    ]));
    const consultarSaldo = jasmine.createSpy('consultarSaldo').and.callFake((id: number) => of({
      contaFinanceiraId: id, contaFinanceiraNome: id === 1 ? 'Ativa' : 'Antiga',
      saldoInicial: 0, saldoConfirmado: 0,
    }));

    await TestBed.configureTestingModule({
      imports: [ContasListaPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {
          snapshot: { queryParamMap: convertToParamMap({ visualizar: 'inativas' }) },
        } },
        { provide: ContasFinanceirasService, useValue: { listar, consultarSaldo } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ContasListaPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(listar).toHaveBeenCalledOnceWith(true);
    const pagina = fixture.nativeElement as HTMLElement;
    expect(pagina.textContent).toContain('Antiga');
    expect(pagina.textContent).not.toContain('Ativa ·');
    expect(pagina.querySelectorAll('.account-card').length).toBe(1);
    expect(pagina.textContent).toContain('Inativa · histórico preservado');

    fixture.componentInstance.mostrarInativas.set(false);
    fixture.detectChanges();
    expect(pagina.textContent).toContain('Ativa');
    expect(pagina.textContent).not.toContain('Antiga');
    expect(pagina.querySelectorAll('.account-card').length).toBe(1);
  });
});
