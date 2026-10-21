import { TestBed } from '@angular/core/testing';
import { PrivacidadeValoresService } from './privacidade-valores.service';

describe('Privacidade dos valores financeiros', () => {
  it('inicia oculta, permite revelar e volta a ocultar', () => {
    const privacidade = TestBed.inject(PrivacidadeValoresService);
    expect(privacidade.valoresVisiveis()).toBeFalse();
    privacidade.alternar();
    expect(privacidade.valoresVisiveis()).toBeTrue();
    privacidade.ocultar();
    expect(privacidade.valoresVisiveis()).toBeFalse();
  });
});
