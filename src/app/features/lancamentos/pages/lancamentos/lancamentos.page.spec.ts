import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { ContasFinanceirasService } from '../../../contas-financeiras/services/contas-financeiras.service';
import { LancamentosService } from '../../services/lancamentos.service';
import { LancamentosPage } from './lancamentos.page';

describe('Lançamentos por mês', () => {
  const listarPeriodo = jasmine.createSpy('listarPeriodo').and.returnValue(of([]));
  const resumirPeriodo = jasmine.createSpy('resumirPeriodo').and.returnValue(of({
    dataInicio: '2026-10-01', dataFim: '2026-10-31', tipo: 'RECEITA',
    contaFinanceiraId: null, totalLancado: '1500.00',
  }));

  const listarContas = jasmine.createSpy('listarContas').and.returnValue(of([]));

  beforeEach(async () => {
    listarPeriodo.calls.reset();
    listarPeriodo.and.returnValue(of([]));
    resumirPeriodo.calls.reset();
    resumirPeriodo.and.returnValue(of({
      dataInicio: '2026-10-01', dataFim: '2026-10-31', tipo: 'RECEITA',
      contaFinanceiraId: null, totalLancado: '1500.00',
    }));
    listarContas.calls.reset();
    listarContas.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [LancamentosPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {
          snapshot: {queryParamMap: convertToParamMap({ tipo: 'RECEITA', mes: '2026-10' })},
        }},
        { provide: LancamentosService, useValue: { listarPeriodo, resumirPeriodo } },
        { provide: ContasFinanceirasService, useValue: { listar: listarContas } },
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

  it('mostra listagem filtrada mesmo quando backend antigo retorna 400 no resumo', async () => {
    listarContas.and.returnValue(of([{ id: 5, nome: 'Nubank' }]));
    listarPeriodo.and.returnValue(of([
      {
        id: 1, descricao: 'Reembolso', tipo: 'RECEITA', contaFinanceiraId: 5,
        categoriaNome: 'Outras receitas', contaFinanceiraNome: 'Nubank',
        dataLancamento: '2026-10-14', valor: '480.22', situacao: 'PREVISTO',
      },
      {
        id: 2, descricao: 'Luz de outubro', tipo: 'DESPESA', contaFinanceiraId: 5,
        categoriaNome: 'Moradia', contaFinanceiraNome: 'Nubank',
        dataLancamento: '2026-10-20', valor: '90.00', situacao: 'PREVISTO',
      },
      {
        id: 3, descricao: 'Reembolso de novembro', tipo: 'RECEITA', contaFinanceiraId: 5,
        categoriaNome: 'Outras receitas', contaFinanceiraNome: 'Nubank',
        dataLancamento: '2026-11-03', valor: '40.00', situacao: 'PREVISTO',
      },
    ]));
    resumirPeriodo.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400, url: '/api/espacos-financeiros/258/lancamentos/resumo-periodo',
      error: { detail: 'A requisição está ausente ou possui formato inválido.' },
    })));

    const fixture = TestBed.createComponent(LancamentosPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Reembolso');
    expect(page.textContent).not.toContain('Luz de outubro');
    expect(page.textContent).not.toContain('Reembolso de novembro');
    expect(page.textContent).toContain('chatgpt/resumo-periodo-lancamentos');
    expect(fixture.componentInstance.filtrados().length).toBe(1);
    expect(fixture.componentInstance.resumo()).toBeNull();
    expect(page.querySelector('.total-periodo')).toBeNull();
    expect(page.querySelector('.movement-list')).not.toBeNull();
  });

});
