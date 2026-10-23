import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { PrivacidadeValoresService } from '../../../../core/privacidade/privacidade-valores.service';
import { CartoesService } from '../../services/cartoes.service';
import { CorrigirParcelamentoPage } from './corrigir-parcelamento.page';

describe('Corrigir parcelas da conciliação inicial', () => {
  let api: jasmine.SpyObj<CartoesService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<CartoesService>('CartoesService', [
      'buscarCompra', 'corrigirParcelamentoInicial',
    ]);
    api.buscarCompra.and.returnValue(of({
      id: 23, cartaoCreditoId: 2, cartaoCreditoNome: 'Nubank',
      categoriaId: 24, categoriaNome: 'Outras despesas',
      descricao: 'Compra importada', valorTotal: '125.00',
      dataCompra: '2026-11-12', quantidadeParcelas: 1,
      origem: 'CONCILIACAO', parcelaInicial: 1, observacao: null, ativo: true,
      criadoEm: '2026-10-23T00:00:00', atualizadoEm: '2026-10-23T00:00:00',
    }));
    await TestBed.configureTestingModule({
      imports: [CorrigirParcelamentoPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: {
          paramMap: convertToParamMap({ cartaoId: '2', compraId: '23' }),
        } } },
        { provide: CartoesService, useValue: api },
        { provide: PrivacidadeValoresService, useValue: { valoresVisiveis: signal(true) } },
      ],
    }).compileComponents();
  });

  it('bloqueia quantidade de parcelas inválida e exige confirmação explícita', async () => {
    const fixture = TestBed.createComponent(CorrigirParcelamentoPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.parcelaAtual = 7;
    page.totalParcelas = 6;
    expect(page.numerosValidos()).toBeFalse();
    await page.salvar();
    expect(api.corrigirParcelamentoInicial).not.toHaveBeenCalled();
    page.parcelaAtual = 5;
    page.totalParcelas = 12;
    expect(page.numerosValidos()).toBeTrue();
    await page.salvar();
    expect(api.corrigirParcelamentoInicial).not.toHaveBeenCalled();
  });

  it('envia 5/12 sem alterar o valor original nem calcular dinheiro no frontend', async () => {
    const fixture = TestBed.createComponent(CorrigirParcelamentoPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.parcelaAtual = 5;
    page.totalParcelas = 12;
    page.conferido = true;
    api.corrigirParcelamentoInicial.and.returnValue(of({
      compraId: 23, competencia: '2026-11', parcelaAtual: 5,
      totalParcelas: 12, valorParcela: '125.00', compromissoRestante: '1000.00',
    }));
    const router = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    await page.salvar();
    expect(api.corrigirParcelamentoInicial).toHaveBeenCalledOnceWith(2, 23, {
      parcelaAtual: 5, totalParcelas: 12,
    });
    expect(router).toHaveBeenCalledWith(['/cartoes', 2], {
      queryParams: { competencia: '2026-11', resultado: 'parcelas-corrigidas' },
    });
  });

  it('não habilita correção para compra normal', async () => {
    api.buscarCompra.and.returnValue(of({
      id: 23, cartaoCreditoId: 2, cartaoCreditoNome: 'Nubank',
      categoriaId: 24, categoriaNome: 'Compras', descricao: 'Compra normal',
      valorTotal: '125.00', dataCompra: '2026-11-12', quantidadeParcelas: 1,
      origem: 'COMPRA', parcelaInicial: null, observacao: null, ativo: true,
      criadoEm: '2026-10-23T00:00:00', atualizadoEm: '2026-10-23T00:00:00',
    }));
    const fixture = TestBed.createComponent(CorrigirParcelamentoPage);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.compra()).toBeNull();
    expect(fixture.componentInstance.erro()).toContain('somente para itens 1/1');
  });
});
