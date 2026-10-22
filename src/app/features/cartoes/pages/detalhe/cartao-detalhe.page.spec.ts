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
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const comp = fixture.componentInstance.competencia();
    expect(raiz.querySelector('form')).toBeNull();
    expect(raiz.textContent).toContain('Registrar pagamento da fatura');
    expect(raiz.querySelector('a[href="/cartoes/5/faturas/' + comp + '/pagar"]'))
      .not.toBeNull();
  });

  it('padroniza compras e faturas com data curta, nome completo acessível e ações alinháveis', async () => {
    listarCompras.and.returnValue(of([
      {
        id: 81, cartaoCreditoId: 5, cartaoCreditoNome: 'Cartão pessoal',
        categoriaId: 9, categoriaNome: 'Outras despesas e compras diversas com descrição muito extensa',
        descricao: 'Celular de última geração comprado em promoção especial com nome extenso',
        valorTotal: '2156.79', dataCompra: '2026-10-22',
        quantidadeParcelas: 15, observacao: null, ativo: true,
        criadoEm: '2026-10-22T10:00:00', atualizadoEm: '2026-10-22T10:00:00',
      },
      {
        id: 82, cartaoCreditoId: 5, cartaoCreditoNome: 'Cartão pessoal',
        categoriaId: 2, categoriaNome: 'Moradia', descricao: 'Chuveiro',
        valorTotal: '200.00', dataCompra: '2026-10-20',
        quantidadeParcelas: 1, observacao: null, ativo: true,
        criadoEm: '2026-10-20T10:00:00', atualizadoEm: '2026-10-20T10:00:00',
      },
    ]));

    const fixture = TestBed.createComponent(CartaoDetalhePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const compras = Array.from(root.querySelectorAll<HTMLElement>('.cartoes-compra-row'));
    expect(compras.length).toBe(2);
    const celular = compras[0];
    expect(celular.querySelector('.cartoes-row-nome')?.textContent)
      .toContain('Celular de última geração');
    expect(celular.querySelector('.cartoes-row-nome')?.getAttribute('title'))
      .toContain('com nome extenso');
    expect(celular.querySelector('.cartoes-row-categoria')?.textContent)
      .toContain('Outras despesas e compras diversas');
    expect(celular.querySelector('.cartoes-row-meta')?.getAttribute('title'))
      .toContain('22/10/2026 · 15 parcelas');
    expect(celular.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-22');
    expect(celular.querySelector('time')?.textContent).toBe('22/10/26');
    expect(celular.querySelector('.cartoes-row-meta-fixo')?.textContent).toContain('15x');
    expect(celular.querySelector('.cartoes-row-value')?.textContent).toContain('2.156,79');
    expect(celular.querySelector('.cartoes-compra-acoes button')?.textContent).toContain('Cancelar');
    expect(compras[1].querySelector('time')?.textContent).toBe('20/10/26');
    expect(compras[1].querySelector('.cartoes-row-meta-fixo')?.textContent).toContain('À vista');
    expect(compras[1].querySelector('.cartoes-compra-acoes a')?.getAttribute('href'))
      .toBe('/cartoes/5/compras/82/editar');

    const itens = root.querySelectorAll<HTMLElement>('.cartoes-fatura-item-row');
    expect(itens.length).toBe(1);
    expect(itens[0].querySelector('time')?.getAttribute('datetime'))
      .toMatch(/^\d{4}-\d{2}-01$/);
    expect(itens[0].querySelector('time')?.textContent)
      .toMatch(/^01\/\d{2}\/\d{2}$/);
    expect(itens[0].querySelector('.cartoes-row-meta-fixo')?.textContent).toContain('3');
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
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Fatura quitada');
    expect(raiz.textContent).not.toContain('Registrar pagamento da fatura');
  });
});
