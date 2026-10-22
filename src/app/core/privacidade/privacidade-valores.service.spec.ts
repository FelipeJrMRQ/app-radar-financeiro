import { TestBed } from '@angular/core/testing';
import { PrivacidadeValoresService } from './privacidade-valores.service';

describe('Privacidade dos valores financeiros', () => {
  it('exibe por padrao, permite ocultar e retorna a exibicao ao encerrar sessao', () => {
    const privacidade = TestBed.inject(PrivacidadeValoresService);
    expect(privacidade.valoresVisiveis()).toBeTrue();
    privacidade.alternar();
    expect(privacidade.valoresVisiveis()).toBeFalse();
    privacidade.restaurarPadrao();
    expect(privacidade.valoresVisiveis()).toBeTrue();
  });

  it('permite aplicar uma escolha recuperada da API', () => {
    const privacidade = TestBed.inject(PrivacidadeValoresService);
    privacidade.definir(false);
    expect(privacidade.valoresVisiveis()).toBeFalse();
    privacidade.definir(true);
    expect(privacidade.valoresVisiveis()).toBeTrue();
  });
});
