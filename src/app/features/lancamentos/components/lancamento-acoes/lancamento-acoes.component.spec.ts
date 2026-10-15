import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { dataHojeLocal } from '../../../../shared/valor-monetario';
import { Lancamento } from '../../models/lancamento.model';
import { LancamentosService } from '../../services/lancamentos.service';
import { FeedbackLancamentosService } from '../../services/feedback-lancamentos.service';
import { LancamentoAcoesComponent } from './lancamento-acoes.component';

describe('Menu de ações dos lançamentos', () => {
  let buscar: jasmine.Spy;
  let excluir: jasmine.Spy;
  let confirmarAutomaticamente: jasmine.Spy;
  let desfazerConfirmacao: jasmine.Spy;
  let realizacoes: jasmine.Spy;
  let estornar: jasmine.Spy;
  let realizarParcialmente: jasmine.Spy;

  beforeEach(async () => {
    buscar = jasmine.createSpy('buscar');
    excluir = jasmine.createSpy('excluir').and.returnValue(of(null));
    confirmarAutomaticamente = jasmine.createSpy('confirmarAutomaticamente')
      .and.returnValue(of({ id: 7, situacao: 'CONFIRMADO' }));
    desfazerConfirmacao = jasmine.createSpy('desfazerConfirmacao')
      .and.returnValue(of({ id: 7, situacao: 'PREVISTO' }));
    realizacoes = jasmine.createSpy('realizacoes').and.returnValue(of({
      totalRealizado: '0', saldoRestante: '100', realizacoes: [],
    }));
    estornar = jasmine.createSpy('estornar').and.returnValue(of(null));
    realizarParcialmente = jasmine.createSpy('realizarParcialmente').and.returnValue(of({}));
    await TestBed.configureTestingModule({
      imports: [LancamentoAcoesComponent],
      providers: [
        provideRouter([]),
        { provide: LancamentosService, useValue: {
          buscar, excluir, confirmarAutomaticamente, desfazerConfirmacao, realizarParcialmente,
          realizacoes, estornar,
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
    const feedback = TestBed.inject(FeedbackLancamentosService);
    feedback.limpar();
    await fixture.componentInstance.confirmarIntegral();
    expect(confirmarAutomaticamente).toHaveBeenCalledOnceWith(7);
    expect(fixture.componentInstance.aberto()).toBeFalse();
    expect(feedback.mensagem()).toContain('Pagamento confirmado com sucesso');
    expect(excluir).not.toHaveBeenCalled();
    expect(realizarParcialmente).not.toHaveBeenCalled();
    feedback.limpar();
  });

  it('permite desfazer confirmação direta após confirmação adicional', async () => {
    const l = { ...registro('2025-10-10'), situacao: 'CONFIRMADO' as const };
    buscar.and.returnValue(of(l));
    const fixture = TestBed.createComponent(LancamentoAcoesComponent);
    fixture.componentRef.setInput('lancamentoId', 7);
    fixture.detectChanges();
    await fixture.componentInstance.alternarMenu();
    fixture.componentInstance.escolher('ESTORNAR_CONFIRMACAO');
    expect(desfazerConfirmacao).not.toHaveBeenCalled();
    await fixture.componentInstance.executar();
    expect(desfazerConfirmacao).toHaveBeenCalledOnceWith(7);
  });

  it('estorna uma realização parcial somente após confirmação individual', async () => {
    buscar.and.returnValue(of(registro('2025-10-10')));
    realizacoes.and.returnValue(of({
      totalRealizado: '40', saldoRestante: '60',
      realizacoes: [{ id: 88, valor: '40', dataRealizacao: '2025-10-10', criadoEm: '' }],
    }));
    const fixture = TestBed.createComponent(LancamentoAcoesComponent);
    fixture.componentRef.setInput('lancamentoId', 7);
    fixture.detectChanges();
    await fixture.componentInstance.alternarMenu();
    expect(fixture.componentInstance.possuiRealizacoes()).toBeTrue();
    fixture.componentInstance.escolher('REALIZACOES');
    await fixture.componentInstance.consultarRealizacoes();
    await fixture.componentInstance.estornar(88);
    expect(estornar).not.toHaveBeenCalled();
    fixture.componentInstance.prepararEstorno(88);
    await fixture.componentInstance.estornar(88);
    expect(estornar).toHaveBeenCalledOnceWith(7, 88);
  });

  it('não permite confirmar integralmente se houver realizações parciais', async () => {
    buscar.and.returnValue(of(registro('2026-12-10')));
    realizacoes.and.returnValue(of({
      totalRealizado: '10', saldoRestante: '90',
      realizacoes: [{ id: 88, valor: '10', dataRealizacao: '2026-10-10', criadoEm: '' }],
    }));
    const fixture = TestBed.createComponent(LancamentoAcoesComponent);
    fixture.componentRef.setInput('lancamentoId', 7);
    fixture.detectChanges();
    await fixture.componentInstance.alternarMenu();
    await fixture.componentInstance.confirmarIntegral();
    expect(confirmarAutomaticamente).not.toHaveBeenCalled();
  });

});
