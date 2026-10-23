import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CartoesService } from '../../services/cartoes.service';
import { CartaoFormPage } from './cartao-form.page';

describe('Cadastro de cartão', () => {
  const criar = jasmine.createSpy('criar').and.returnValue(of({ id: 9 }));
  beforeEach(async () => {
    criar.calls.reset();
    await TestBed.configureTestingModule({
      imports: [CartaoFormPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        { provide: CartoesService, useValue: { criar } },
      ],
    }).compileComponents();
  });

  it('exige nome, limite positivo e dias validos', async () => {
    const fixture = TestBed.createComponent(CartaoFormPage);
    fixture.detectChanges();
    await fixture.componentInstance.salvar();
    expect(criar).not.toHaveBeenCalled();
    fixture.componentInstance.form.patchValue({
      nome: 'Cartão A', limiteCredito: '0,00', diaFechamento: 32, diaVencimento: 15,
    });
    await fixture.componentInstance.salvar();
    expect(criar).not.toHaveBeenCalled();
  });

  it('normaliza o valor decimal sem arredondar e envia para a API', async () => {
    const fixture = TestBed.createComponent(CartaoFormPage);
    fixture.componentInstance.form.patchValue({
      nome: '  Cartão A ', limiteCredito: '1.234,5678', diaFechamento: 10, diaVencimento: 20,
    });
    await fixture.componentInstance.salvar();
    expect(criar).toHaveBeenCalledOnceWith({
      nome: 'Cartão A', limiteCredito: '1234.5678', diaFechamento: 10, diaVencimento: 20,
    });
  });
});
