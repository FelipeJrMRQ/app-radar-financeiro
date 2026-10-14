import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { dataHojeLocal } from '../../../../shared/valor-monetario';
import { Lancamento } from '../../models/lancamento.model';
import { LancamentosService } from '../../services/lancamentos.service';
import { LancamentoAcoesComponent } from './lancamento-acoes.component';

describe('Menu de ações dos lançamentos', () => {
  let buscar: jasmine.Spy;
  let excluir: jasmine.Spy;
  let confirmar: jasmine.Spy;
  let realizarParcialmente: jasmine.Spy;

  beforeEach(async () => {
    buscar = jasmine.createSpy('buscar');
    excluir = jasmine.createSpy('excluir').and.returnValue(of(null));
    confirmar = jasmine.createSpy('confirmar').and.returnValue(of({ id: 7 }));
    realizarParcialmente = jasmine.createSpy('realizarParcialmente').and.returnValue(of({}));
    await TestBed.configureTestingModule({
      imports: [LancamentoAcoesComponent],
      providers: [
        provideRouter([]),
        { provide: LancamentosService, useValue: {
          buscar, excluir, confirmar, realizarParcialmente,
          realizacoes: () => of({ totalRealizado: '0', saldoRestante: '100', realizacoes: [] }),
        } },
      ],
    }).compileComponents();
  });

  function registro(data: string, parcelado = false): Lancamento {
    return {
      id: 7, ativo: true, tipo: 'DESPESA', situacao: 'PREVISTO',
      descricao: 'Prestação (2/12)', valor: '100.0000', dataLancamento: data,
      contaFinanceiraId: 3, contaFinanceiraNome: 'Conta',
      categoriaId: 4, categoriaNome: 'Moradia',
      valorEfetivo: null, dataEfetiva: null,
      recorrenciaLancamentoId: parcelado ? null : 5, dataReferenciaRecorrencia: data,
      parcelamentoLancamentoId: parcelado ? 20 : null,
      numeroParcela: parcelado ? 2 : null, quantidadeParcelas: parcelado ? 12 : null,
      observacao: null, criadoEm: '', atualizadoEm: '',
    };
  }

  it('não oferece exclusão em sequência a partir de um lançamento retroativo', async () => {
    buscar.and.returnValue(of(registro('2025-02-10')));
    const fixture = TestBed.createComponent(LancamentoAcoesComponent);
    fixture.componentRef.setInput('lancamentoId', 7);
    fixture.detectChanges();
    await fixture.componentInstance.alternarMenu();
    fixture.detectChanges();
    expect(fixture.componentInstance.podeSequencia()).toBeFalse();
    fixture.componentInstance.escolher('EXCLUIR');
    fixture.componentInstance.definirEscopo('SEGUINTES');
    expect(fixture.componentInstance.escopo()).toBe('ATUAL');
    await fixture.componentInstance.executar();
    expect(excluir).toHaveBeenCalledWith(7, 'ATUAL', false);
    expect(fixture.componentInstance.aberto()).toBeFalse();
  });

  it('só permite exclusão em lote quando a parcela é futura e prevista', async () => {
    buscar.and.returnValue(of(registro('2099-11-10', true)));
    const fixture = TestBed.createComponent(LancamentoAcoesComponent);
    fixture.componentRef.setInput('lancamentoId', 7);
    fixture.detectChanges();
    await fixture.componentInstance.alternarMenu();
    fixture.componentInstance.escolher('EXCLUIR');
    fixture.componentInstance.definirEscopo('SEGUINTES');
    expect(fixture.componentInstance.escopo()).toBe('SEGUINTES');
    await fixture.componentInstance.executar();
    expect(excluir).toHaveBeenCalledWith(7, 'SEGUINTES', true);
  });

  it('confirma apenas o lançamento atual, nunca a sequência', async () => {
    buscar.and.returnValue(of(registro('2099-11-10', true)));
    const fixture = TestBed.createComponent(LancamentoAcoesComponent);
    fixture.componentRef.setInput('lancamentoId', 7);
    fixture.detectChanges();
    await fixture.componentInstance.alternarMenu();
    fixture.componentInstance.escolher('CONFIRMAR');
    fixture.componentInstance.valor.setValue('98,5678');
    fixture.componentInstance.data.setValue(dataHojeLocal());
    await fixture.componentInstance.executar();
    expect(confirmar).toHaveBeenCalledWith(7, {
      valorEfetivo: '98.5678', dataEfetiva: dataHojeLocal(),
    });
    expect(excluir).not.toHaveBeenCalled();
    expect(realizarParcialmente).not.toHaveBeenCalled();
  });
});
