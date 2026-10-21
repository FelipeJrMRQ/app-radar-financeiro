import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ContaNovaPage } from './conta-nova.page';

describe('ContaNovaPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContaNovaPage],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  it('exige nome e saldo válido', () => {
    const fixture = TestBed.createComponent(ContaNovaPage);
    fixture.detectChanges();
    const pagina = fixture.componentInstance;
    expect(pagina.formulario.valid).toBeFalse();
    pagina.formulario.patchValue({ nome: 'Carteira', saldoInicial: '10,25' });
    expect(pagina.formulario.valid).toBeTrue();
    pagina.formulario.controls.saldoInicial.setValue('valor inválido');
    expect(pagina.formulario.valid).toBeFalse();
  });
});
