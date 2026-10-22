import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { CartoesService } from '../../services/cartoes.service';
import { CartaoDetalhePage } from './cartao-detalhe.page';

describe('Fatura com navegação mensal', () => {
  const buscarFatura = jasmine.createSpy('buscarFatura');
  const listarPagamentos = jasmine.createSpy('listarPagamentos');
  const buscar = jasmine.createSpy('buscar');
  const listarCompras = jasmine.createSpy('listarCompras');

  beforeEach(async () => {
    buscarFatura.calls.reset();
    listarPagamentos.calls.reset();
    buscar.and.returnValue(of({
      id: 5, nome: 'Cartão pessoal', ativo: true,
      limiteCredito: '5000.00', diaFechamento: 17, diaVencimento: 25,
    }));
    listarCompras.and.returnValue(of([]));
    buscarFatura.and.callFake((_id: number, competencia: string) => of({
      id: null, cartaoCreditoId: 5, cartaoCreditoNome: 'Cartão pessoal',
      competencia: competencia + '-01', dataFechamento: competencia + '-17',
      dataVencimento: competencia + '-25',
      total: '66.6666', itens: [{
        descricao: 'Chuveiro', categoriaNome: 'Moradia',
        valor: '66.6666', numeroParcela: 3, quantidadeParcelas: 3,
        dataReferencia: competencia + '-01',
      }],
    }));
    listarPagamentos.and.callFake((_id: number, competencia: string) => of({
      faturaCartaoId: null, competencia: competencia + '-01',
      totalFatura: '66.6666', totalPago: '0',
      saldoRestante: '66.6666', quitada: false, pagamentos: [],
    }));
    await TestBed.configureTestingModule({
      imports: [CartaoDetalhePage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: {
            paramMap: convertToParamMap({ cartaoId: '5' }),
            queryParamMap: convertToParamMap({}),
          } },
        },
        {
          provide: CartoesService,
          useValue: { buscar, listarCompras, buscarFatura, listarPagamentos },
        },
      ],
    }).compileComponents();
  });

  it('mostra fatura de qualquer mes sem precisar gerar o registro', async () => {
    const fixture = TestBed.createComponent(CartaoDetalhePage);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.fatura()?.id).toBeNull();
    expect(buscarFatura).toHaveBeenCalled();
    const atual = fixture.componentInstance.competencia();
    fixture.componentInstance.mudarMes(1);
    await fixture.whenStable();
    expect(fixture.componentInstance.competencia()).not.toBe(atual);
    expect(buscarFatura).toHaveBeenCalledWith(
      5, fixture.componentInstance.competencia(),
    );
    expect(fixture.componentInstance.fatura()?.itens.length).toBe(1);
  });

  it('mostra acesso à página de pagamento sem formulário na fatura', async () => {
    const fixture = TestBed.createComponent(CartaoDetalhePage);
    fixture.detectChanges();
    await fixture.whenStable();
    const raiz = fixture.nativeElement as HTMLElement;
    const comp = fixture.componentInstance.competencia();
    expect(raiz.querySelector('form')).toBeNull();
    expect(raiz.textContent).toContain('Registrar pagamento da fatura');
    expect(raiz.querySelector('a[href="/cartoes/5/faturas/' + comp + '/pagar"]'))
      .not.toBeNull();
  });

  it('não oferece pagamento de fatura já quitada', async () => {
    listarPagamentos.and.returnValue(of({
      faturaCartaoId: 8, competencia: '2026-11-01',
      totalFatura: '66.6666', totalPago: '66.6666',
      saldoRestante: '0', quitada: true, pagamentos: [],
    }));
    const fixture = TestBed.createComponent(CartaoDetalhePage);
    fixture.detectChanges();
    await fixture.whenStable();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Fatura quitada');
    expect(raiz.textContent).not.toContain('Registrar pagamento da fatura');
  });
});
