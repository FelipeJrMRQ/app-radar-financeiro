import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { dataHojeLocal } from '../../../../shared/valor-monetario';
import { ContasFinanceirasService } from '../../../contas-financeiras/services/contas-financeiras.service';
import { CartoesService } from '../../services/cartoes.service';
import { CartaoDetalhePage } from './cartao-detalhe.page';

describe('Fatura com navegação mensal', () => {
  const buscarFatura = jasmine.createSpy('buscarFatura');
  const listarPagamentos = jasmine.createSpy('listarPagamentos');
  const pagarParcialmente = jasmine.createSpy('pagarParcialmente');
  const buscar = jasmine.createSpy('buscar');
  const listarCompras = jasmine.createSpy('listarCompras');

  beforeEach(async () => {
    buscarFatura.calls.reset();
    listarPagamentos.calls.reset();
    pagarParcialmente.calls.reset();
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
    pagarParcialmente.and.returnValue(of({
      faturaCartaoId: 8, competencia: '2026-11-01',
      totalFatura: '66.6666', totalPago: '66.6666',
      saldoRestante: '0', quitada: true, pagamentos: [],
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
          useValue: { buscar, listarCompras, buscarFatura, listarPagamentos, pagarParcialmente },
        },
        {
          provide: ContasFinanceirasService,
          useValue: { listar: () => of([{
            id: 7, nome: 'Conta principal', ativo: true,
          }]) },
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

  it('quita pelo valor exato da API e nao pelo texto de duas casas exibido', async () => {
    const fixture = TestBed.createComponent(CartaoDetalhePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.formPagamento.patchValue({
      contaFinanceiraId: 7,
      dataPagamento: dataHojeLocal(),
    });
    await fixture.componentInstance.quitarSaldo();
    expect(pagarParcialmente).toHaveBeenCalledWith(
      5, fixture.componentInstance.competencia(), jasmine.objectContaining({
        contaFinanceiraId: 7,
        valorPago: '66.6666',
      }),
    );
    expect(fixture.componentInstance.pagamentos()?.quitada).toBeTrue();
  });
});
