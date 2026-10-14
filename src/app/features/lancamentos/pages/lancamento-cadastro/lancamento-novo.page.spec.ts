import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LancamentoNovoPage } from './lancamento-novo.page';

describe('LancamentoNovoPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LancamentoNovoPage],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  it('exige categoria, conta, descrição e valor positivo', () => {
    const pagina = TestBed.createComponent(LancamentoNovoPage).componentInstance;
    expect(pagina.form.valid).toBeFalse();
    pagina.form.patchValue({
      contaFinanceiraId: 1,
      categoriaId: 5,
      descricao: 'Salário',
      valor: '3.000,25',
    });
    expect(pagina.form.valid).toBeTrue();
    pagina.form.controls.valor.setValue('0,00');
    expect(pagina.form.valid).toBeFalse();
    pagina.form.controls.valor.setValue('0,0001');
    expect(pagina.form.valid).toBeTrue();
  });


  it('começa com lançamento único pendente sem pagamento automático', () => {
    const pagina = TestBed.createComponent(LancamentoNovoPage).componentInstance;
    expect(pagina.modalidade()).toBe('UNICO');
    expect(pagina.form.controls.situacaoInicial.value).toBe('PREVISTO');
    pagina.selecionarModalidade('PARCELADO');
    expect(pagina.form.controls.quantidadeParcelas.value).toBe(2);
    pagina.selecionarModalidade('RECORRENTE');
    expect(pagina.modalidade()).toBe('RECORRENTE');
  });

  it('trocar receita por despesa invalida categoria anterior', () => {
    const pagina = TestBed.createComponent(LancamentoNovoPage).componentInstance;
    pagina.form.controls.categoriaId.setValue(10);
    pagina.selecionarTipo('RECEITA');
    expect(pagina.form.controls.categoriaId.value).toBeNull();
  });
});
