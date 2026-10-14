import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { ContasFinanceirasService } from '../../../contas-financeiras/services/contas-financeiras.service';
import { LancamentosService } from '../../services/lancamentos.service';
import { LancamentosPage } from './lancamentos.page';

describe('Lançamentos por mês', () => {
  const listarPeriodo = jasmine.createSpy('listarPeriodo').and.returnValue(of([]));
  const resumirPeriodo = jasmine.createSpy('resumirPeriodo').and.returnValue(of({
    dataInicio: '2026-10-01', dataFim: '2026-10-31', tipo: 'RECEITA',
    contaFinanceiraId: null, totalLancado: '1500.00',
  }));

  beforeEach(async () => {
    listarPeriodo.calls.reset();
    resumirPeriodo.calls.reset();
    await TestBed.configureTestingModule({
      imports: [LancamentosPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {
          snapshot: {queryParamMap: convertToParamMap({ tipo: 'RECEITA', mes: '2026-10' })},
        }},
        { provide: LancamentosService, useValue: { listarPeriodo, resumirPeriodo } },
        { provide: ContasFinanceirasService, useValue: { listar: () => of([]) } },
      ],
    }).compileComponents();
  });

  it('respeita o tipo e o mês recebidos do card do dashboard', async () => {
    const fixture = TestBed.createComponent(LancamentosPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const filtro = listarPeriodo.calls.mostRecent().args[0];
    expect(filtro).toEqual({
      contaFinanceiraId: null,
      tipo: 'RECEITA',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-31',
    });
    expect(resumirPeriodo).toHaveBeenCalledWith(filtro);
    expect(fixture.componentInstance.filtroTipo()).toBe('RECEITA');
    expect(fixture.nativeElement.textContent).toContain('Total de receitas lançadas');
    expect(fixture.nativeElement.textContent).toContain('1.500,00');
  });

  it('troca o mês e refaz lista e total com período coerente', async () => {
    const fixture = TestBed.createComponent(LancamentosPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.mudarMes(1);
    expect(listarPeriodo.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      tipo: 'RECEITA', dataInicio: '2026-11-01', dataFim: '2026-11-30',
    }));
    expect(resumirPeriodo.calls.count()).toBe(2);
  });
});
