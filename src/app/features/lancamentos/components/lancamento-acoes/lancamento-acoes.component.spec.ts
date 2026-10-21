import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { dataHojeLocal } from '../../../../shared/valor-monetario';
import { Lancamento } from '../../models/lancamento.model';
import { LancamentosService } from '../../services/lancamentos.service';
import { FeedbackOperacoesService } from '../../../../core/feedback/feedback-operacoes.service';
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
    const feedback = TestBed.inject(FeedbackOperacoesService);
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

  it('permite quitar antecipadamente o saldo de lançamento futuro parcialmente realizado', async () => {
    buscar.and.returnValue(of(registro('2099-12-10')));
    realizacoes.and.returnValue(of({
      totalRealizado: '10', saldoRestante: '90',
      realizacoes: [{ id: 88, valor: '10', dataRealizacao: '2026-10-10', criadoEm: '' }],
    }));
    const fixture = TestBed.createComponent(LancamentoAcoesComponent);
    fixture.componentRef.setInput('lancamentoId', 7);
    fixture.detectChanges();
    await fixture.componentInstance.alternarMenu();
    fixture.detectChanges();
    expect(fixture.componentInstance.possuiRealizacoes()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Quitar saldo restante');
    await fixture.componentInstance.confirmarIntegral();
    expect(confirmarAutomaticamente).toHaveBeenCalledOnceWith(7);
    expect(fixture.componentInstance.aberto()).toBeFalse();
  });

  it('mantém apenas um menu aberto entre diferentes lançamentos e fecha fora', async () => {
    buscar.and.callFake((id: number) => of({ ...registro('2099-12-10'), id }));
    const primeiro = TestBed.createComponent(LancamentoAcoesComponent);
    primeiro.componentRef.setInput('lancamentoId', 7);
    primeiro.detectChanges();
    const segundo = TestBed.createComponent(LancamentoAcoesComponent);
    segundo.componentRef.setInput('lancamentoId', 8);
    segundo.detectChanges();

    await primeiro.componentInstance.alternarMenu();
    primeiro.detectChanges();
    expect(primeiro.componentInstance.aberto()).toBeTrue();
    await segundo.componentInstance.alternarMenu();
    primeiro.detectChanges();
    segundo.detectChanges();
    expect(primeiro.componentInstance.aberto()).toBeFalse();
    expect(segundo.componentInstance.aberto()).toBeTrue();
    expect(primeiro.nativeElement.querySelector('.actions-panel')).toBeNull();
    expect(segundo.nativeElement.querySelectorAll('.actions-panel').length).toBe(1);

    segundo.componentInstance.fecharFora(new PointerEvent('pointerdown', {
      bubbles: true,
    }));
    segundo.detectChanges();
    expect(segundo.componentInstance.aberto()).toBeFalse();
  });


  it('bloqueia exclusão de despesa com pagamento parcial e mostra valores vindos da API', async () => {
    buscar.and.returnValue(of(registro('2026-10-15')));
    realizacoes.and.returnValue(of({
      totalRealizado: '30.0000', saldoRestante: '70.0000',
      realizacoes: [{ id: 88, valor: '30.0000', dataRealizacao: '2026-10-15', criadoEm: '' }],
    }));
    const fixture = TestBed.createComponent(LancamentoAcoesComponent);
    fixture.componentRef.setInput('lancamentoId', 7);
    fixture.detectChanges();
    await fixture.componentInstance.alternarMenu();
    fixture.componentInstance.escolher('EXCLUIR');
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.textContent).toContain('Não é possível excluir este lançamento');
    expect(elemento.textContent).toContain('pagamentos registrados');
    expect(elemento.textContent).toContain('30,00');
    expect(elemento.textContent).toContain('70,00');
    expect(elemento.textContent).toContain('Ver pagamentos e estornos');
    expect(elemento.querySelector('.commit-action')).toBeNull();
    await fixture.componentInstance.executar();
    expect(excluir).not.toHaveBeenCalled();
  });

  it('mostra orientação específica para recebimentos parciais', async () => {
    buscar.and.returnValue(of({ ...registro('2026-10-15'), tipo: 'RECEITA' }));
    realizacoes.and.returnValue(of({
      totalRealizado: '20', saldoRestante: '80',
      realizacoes: [{ id: 99, valor: '20', dataRealizacao: '2026-10-15', criadoEm: '' }],
    }));
    const fixture = TestBed.createComponent(LancamentoAcoesComponent);
    fixture.componentRef.setInput('lancamentoId', 7);
    fixture.detectChanges();
    await fixture.componentInstance.alternarMenu();
    fixture.componentInstance.escolher('EXCLUIR');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('recebimentos registrados');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ver recebimentos e estornos');
    expect(fixture.componentInstance.podeExcluir()).toBeFalse();
    expect(excluir).not.toHaveBeenCalled();
  });

  it('falha com segurança quando a consulta das realizações está indisponível', async () => {
    buscar.and.returnValue(of(registro('2026-10-15')));
    realizacoes.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    const fixture = TestBed.createComponent(LancamentoAcoesComponent);
    fixture.componentRef.setInput('lancamentoId', 7);
    fixture.detectChanges();
    await fixture.componentInstance.alternarMenu();
    fixture.componentInstance.escolher('EXCLUIR');
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.textContent).toContain('Exclusão temporariamente indisponível');
    expect(elemento.querySelector('.commit-action')).toBeNull();
    await fixture.componentInstance.executar();
    expect(excluir).not.toHaveBeenCalled();

    realizacoes.and.returnValue(of({ totalRealizado: '0', saldoRestante: '100', realizacoes: [] }));
    await fixture.componentInstance.consultarRealizacoes();
    fixture.detectChanges();
    expect(fixture.componentInstance.podeExcluir()).toBeTrue();
    expect(elemento.querySelector('.commit-action')).not.toBeNull();
  });

  it('orienta o usuário quando a API bloqueia exclusão por realização recente', async () => {
    buscar.and.returnValue(of(registro('2026-10-15')));
    excluir.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 422,
      error: { detail: 'Não é permitido excluir um lançamento que possui realizações financeiras.' },
    })));
    const fixture = TestBed.createComponent(LancamentoAcoesComponent);
    fixture.componentRef.setInput('lancamentoId', 7);
    fixture.detectChanges();
    await fixture.componentInstance.alternarMenu();
    fixture.componentInstance.escolher('EXCLUIR');
    await fixture.componentInstance.executar();
    fixture.detectChanges();

    expect(excluir).toHaveBeenCalledOnceWith(7, 'ATUAL', false);
    expect(fixture.componentInstance.erro()).toContain('estorne somente registros feitos por engano');
    expect(fixture.componentInstance.exclusaoRecusada()).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelector('.commit-action')).toBeNull();
  });

  it('orienta revisão de recorrência bloqueada e deixa excluir só o atual após trocar escopo', async () => {
    buscar.and.returnValue(of(registro('2099-11-10')));
    excluir.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 422,
      error: { detail: 'Não é permitido excluir esta e as próximas quando alguma ocorrência possui realização financeira.' },
    })));
    const fixture = TestBed.createComponent(LancamentoAcoesComponent);
    fixture.componentRef.setInput('lancamentoId', 7);
    fixture.detectChanges();
    await fixture.componentInstance.alternarMenu();
    fixture.componentInstance.escolher('EXCLUIR');
    fixture.componentInstance.definirEscopo('SEGUINTES');
    await fixture.componentInstance.executar();
    fixture.detectChanges();

    expect(excluir).toHaveBeenCalledOnceWith(7, 'SEGUINTES', false);
    expect(fixture.componentInstance.erro()).toContain('Não foi possível excluir a sequência');
    expect(fixture.componentInstance.exclusaoRecusada()).toBeTrue();

    fixture.componentInstance.definirEscopo('ATUAL');
    expect(fixture.componentInstance.exclusaoRecusada()).toBeFalse();
    excluir.and.returnValue(of(null));
    await fixture.componentInstance.executar();
    expect(excluir).toHaveBeenCalledWith(7, 'ATUAL', false);
  });

  it('distingue restrições mistas na exclusão de parcelas restantes', async () => {
    buscar.and.returnValue(of(registro('2099-11-10', true)));
    excluir.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 422,
      error: { detail: 'Existem parcelas inativas, retroativas ou realizadas no intervalo; use a edição individual.' },
    })));
    const fixture = TestBed.createComponent(LancamentoAcoesComponent);
    fixture.componentRef.setInput('lancamentoId', 7);
    fixture.detectChanges();
    await fixture.componentInstance.alternarMenu();
    fixture.componentInstance.escolher('EXCLUIR');
    fixture.componentInstance.definirEscopo('SEGUINTES');
    await fixture.componentInstance.executar();

    expect(excluir).toHaveBeenCalledOnceWith(7, 'SEGUINTES', true);
    expect(fixture.componentInstance.erro()).toContain('uma ou mais estão inativas');
    expect(fixture.componentInstance.erro()).toContain('Revise cada parcela individualmente');
  });

  it('permite excluir após estorno de todos os pagamentos indevidos confirmado pela API', async () => {
    buscar.and.returnValue(of(registro('2026-10-15')));
    let estornado = false;
    realizacoes.and.callFake(() => of(estornado
      ? { totalRealizado: '0', saldoRestante: '100', realizacoes: [] }
      : {
          totalRealizado: '40', saldoRestante: '60',
          realizacoes: [{ id: 88, valor: '40', dataRealizacao: '2026-10-15', criadoEm: '' }],
        }));
    const fixture = TestBed.createComponent(LancamentoAcoesComponent);
    fixture.componentRef.setInput('lancamentoId', 7);
    fixture.detectChanges();
    await fixture.componentInstance.alternarMenu();
    expect(fixture.componentInstance.podeExcluir()).toBeFalse();

    fixture.componentInstance.escolher('REALIZACOES');
    await fixture.whenStable();
    fixture.componentInstance.prepararEstorno(88);
    estornado = true;
    await fixture.componentInstance.estornar(88);
    expect(estornar).toHaveBeenCalledOnceWith(7, 88);
    expect(fixture.componentInstance.possuiRealizacoes()).toBeFalse();

    fixture.componentInstance.escolher('EXCLUIR');
    expect(fixture.componentInstance.podeExcluir()).toBeTrue();
    await fixture.componentInstance.executar();
    expect(excluir).toHaveBeenCalledOnceWith(7, 'ATUAL', false);
  });

  it('não oferece desfazer confirmação se o histórico financeiro não pode ser consultado', async () => {
    buscar.and.returnValue(of({ ...registro('2026-10-15'), situacao: 'CONFIRMADO' }));
    realizacoes.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    const fixture = TestBed.createComponent(LancamentoAcoesComponent);
    fixture.componentRef.setInput('lancamentoId', 7);
    fixture.detectChanges();
    await fixture.componentInstance.alternarMenu();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Desfazer confirmação');
    expect(fixture.componentInstance.podeExcluir()).toBeFalse();
  });

});
