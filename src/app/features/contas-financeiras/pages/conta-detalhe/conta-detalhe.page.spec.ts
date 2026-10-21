import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ContasFinanceirasService } from '../../services/contas-financeiras.service';
import { ContaDetalhePage } from './conta-detalhe.page';

describe('Gestão da conta financeira', () => {
  let buscar: jasmine.Spy;
  let consultarUso: jasmine.Spy;
  let excluirDefinitivamente: jasmine.Spy;
  let inativar: jasmine.Spy;
  let reativar: jasmine.Spy;
  let router: Router;

  beforeEach(async () => {
    buscar = jasmine.createSpy('buscar');
    consultarUso = jasmine.createSpy('consultarUso');
    excluirDefinitivamente = jasmine.createSpy('excluirDefinitivamente').and.returnValue(of(null));
    inativar = jasmine.createSpy('inativar').and.returnValue(of(null));
    reativar = jasmine.createSpy('reativar').and.returnValue(of({
      id: 9, nome: 'Minha conta', ativo: true,
    }));
    await TestBed.configureTestingModule({
      imports: [ContaDetalhePage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {
          snapshot: {
            paramMap: convertToParamMap({ contaId: '9' }),
            queryParamMap: convertToParamMap({}),
          },
        } },
        { provide: ContasFinanceirasService, useValue: {
          buscar,
          consultarUso,
          excluirDefinitivamente,
          inativar,
          reativar,
          consultarSaldo: () => of({
            contaFinanceiraId: 9, contaFinanceiraNome: 'Minha conta',
            saldoInicial: '0', saldoConfirmado: '0',
          }),
          consultarExtrato: () => of({
            contaFinanceiraId: 9, contaFinanceiraNome: 'Minha conta',
            dataInicio: '2026-10-01', dataFim: '2026-10-31',
            saldoConfirmadoAnterior: '0', saldoProjetadoAnterior: '0',
            saldoConfirmadoFinal: '0', saldoProjetadoFinal: '0',
            movimentos: [],
          }),
        } },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  async function abrir(ativo: boolean, utilizada: boolean) {
    buscar.and.returnValue(of({
      id: 9, nome: 'Minha conta', tipo: 'CONTA_CORRENTE',
      saldoInicial: '0.0000', ativo, criadoEm: '', atualizadoEm: '',
    }));
    consultarUso.and.returnValue(of({
      utilizada, podeExcluirDefinitivamente: !utilizada,
    }));
    const fixture = TestBed.createComponent(ContaDetalhePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('oferece exclusão definitiva apenas para conta sem vínculos', async () => {
    const fixture = await abrir(true, false);
    const texto = (fixture.nativeElement as HTMLElement).textContent;
    expect(texto).toContain('Excluir definitivamente');
    expect(texto).not.toContain('Inativar conta');

    fixture.componentInstance.escolherAcao('EXCLUIR');
    await fixture.componentInstance.executarAcao();
    expect(excluirDefinitivamente).toHaveBeenCalledOnceWith(9);
    expect(inativar).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/contas'], {
      queryParams: { resultado: 'excluida', visualizar: 'ativas' },
    });
  });

  it('impede apagar conta utilizada ainda que o saldo seja zero', async () => {
    const fixture = await abrir(true, true);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Inativar conta');
    expect(el.textContent).not.toContain('Excluir definitivamente');

    fixture.componentInstance.escolherAcao('EXCLUIR');
    expect(fixture.componentInstance.acaoPendente()).toBeNull();

    fixture.componentInstance.escolherAcao('INATIVAR');
    fixture.detectChanges();
    expect(el.textContent).toContain('O histórico será preservado');
    await fixture.componentInstance.executarAcao();
    expect(inativar).toHaveBeenCalledOnceWith(9);
    expect(excluirDefinitivamente).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/contas'], {
      queryParams: { resultado: 'inativada', visualizar: 'inativas' },
    });
  });

  it('permite reativar conta inativa sem perder o histórico', async () => {
    const fixture = await abrir(false, true);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Reativar conta');
    expect(el.textContent).not.toContain('Excluir definitivamente');
    fixture.componentInstance.escolherAcao('REATIVAR');
    await fixture.componentInstance.executarAcao();
    expect(reativar).toHaveBeenCalledOnceWith(9);
    expect(router.navigate).toHaveBeenCalledWith(['/contas'], {
      queryParams: { resultado: 'reativada', visualizar: 'ativas' },
    });
  });

  it('mantém conta e histórico se API recusar exclusão após novo vínculo', async () => {
    const fixture = await abrir(true, false);
    excluirDefinitivamente.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 422, error: { detail: 'Esta conta possui vínculos financeiros; utilize inativação.' },
    })));
    fixture.componentInstance.escolherAcao('EXCLUIR');
    await fixture.componentInstance.executarAcao();
    fixture.detectChanges();
    expect(fixture.componentInstance.erroAcao()).toContain('vínculos financeiros');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('não permite ações destrutivas sem consultar os vínculos', async () => {
    buscar.and.returnValue(of({
      id: 9, nome: 'Minha conta', tipo: 'CARTEIRA', saldoInicial: '100',
      ativo: true, criadoEm: '', atualizadoEm: '',
    }));
    consultarUso.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    const fixture = TestBed.createComponent(ContaDetalhePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.uso()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Não foi possível verificar o uso');
    fixture.componentInstance.escolherAcao('EXCLUIR');
    fixture.componentInstance.escolherAcao('INATIVAR');
    expect(fixture.componentInstance.acaoPendente()).toBeNull();
    expect(excluirDefinitivamente).not.toHaveBeenCalled();
  });
});
