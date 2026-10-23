import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CartoesService } from '../../services/cartoes.service';
import { CategoriasService } from '../../../categorias/services/categorias.service';
import { CompraCartaoFormPage } from './compra-form.page';

describe('Compra de cartão', () => {
  const cartao = { id: 5, ativo: true, nome: 'Cartão Teste',
    limiteCredito: '3000', diaFechamento: 10, diaVencimento: 20 };
  const buscar = jasmine.createSpy('buscar').and.returnValue(of(cartao));
  const comprarParcelado = jasmine.createSpy('comprarParcelado').and.returnValue(of({ compra: {}, parcelas: [] }));
  const comprar = jasmine.createSpy('comprar').and.returnValue(of({ id: 1 }));
  beforeEach(async () => {
    buscar.calls.reset(); comprarParcelado.calls.reset(); comprar.calls.reset();
    await TestBed.configureTestingModule({
      imports: [CompraCartaoFormPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: {
          paramMap: convertToParamMap({ cartaoId: '5' }),
        } } },
        { provide: CartoesService, useValue: { buscar, comprarParcelado, comprar } },
        { provide: CategoriasService, useValue: { listar: () => of([
          { id: 3, nome: 'Alimentação', tipo: 'DESPESA', ativo: true },
          { id: 4, nome: 'Salário', tipo: 'RECEITA', ativo: true },
          { id: 5, nome: 'Inativa', tipo: 'DESPESA', ativo: false },
        ]) } },
      ],
    }).compileComponents();
  });

  it('oferece somente categorias de despesa ativas', async () => {
    const fixture = TestBed.createComponent(CompraCartaoFormPage);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.categorias().map(c => c.nome)).toEqual(['Alimentação']);
  });

  it('nao aceita data futura nem parcela invalida', async () => {
    const fixture = TestBed.createComponent(CompraCartaoFormPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.form.patchValue({
      categoriaId: 3, descricao: 'Compra', valorTotal: '100,00',
      dataCompra: '2099-01-01', quantidadeParcelas: 2,
    });
    await fixture.componentInstance.salvar();
    expect(comprarParcelado).not.toHaveBeenCalled();
  });

  it('aceita financiamentos de 360 e 500 meses e rejeita 501', async () => {
    const fixture = TestBed.createComponent(CompraCartaoFormPage);
    fixture.detectChanges();
    await fixture.whenStable();
    for (const quantidade of [360, 500]) {
      fixture.componentInstance.form.patchValue({
        categoriaId: 3, descricao: 'Financiamento',
        valorTotal: '500.000,00', dataCompra: '2026-10-10',
        quantidadeParcelas: quantidade,
      });
      await fixture.componentInstance.salvar();
      expect(comprarParcelado).toHaveBeenCalledWith(5, jasmine.objectContaining({
        quantidadeParcelas: quantidade, valorTotal: '500000.00',
      }));
    }
    comprarParcelado.calls.reset();
    fixture.componentInstance.form.patchValue({ quantidadeParcelas: 501 });
    await fixture.componentInstance.salvar();
    expect(comprarParcelado).not.toHaveBeenCalled();
  });

  it('delegada a divisao em parcelas ao backend', async () => {
    const fixture = TestBed.createComponent(CompraCartaoFormPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.form.patchValue({
      categoriaId: 3, descricao: 'Cadeira', valorTotal: '999,99',
      dataCompra: '2026-10-10', quantidadeParcelas: 4,
    });
    await fixture.componentInstance.salvar();
    expect(comprarParcelado).toHaveBeenCalledOnceWith(5, {
      categoriaId: 3, descricao: 'Cadeira', valorTotal: '999.99',
      dataCompra: '2026-10-10', quantidadeParcelas: 4, observacao: null,
    });
  });
});
