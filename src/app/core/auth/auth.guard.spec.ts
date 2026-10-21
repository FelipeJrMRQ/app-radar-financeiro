import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  it('aguarda a restauração antes de liberar a rota atual', async () => {
    const restaurarSessao = jasmine.createSpy().and.returnValue(Promise.resolve(true));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { restaurarSessao } }],
    });
    const resultado = await TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/contas/123' } as RouterStateSnapshot));
    expect(resultado).toBeTrue();
    expect(restaurarSessao).toHaveBeenCalledTimes(1);
  });

  it('preserva o caminho interno quando é necessário fazer login novamente', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: {
          restaurarSessao: () => Promise.resolve(false),
        }},
      ],
    });
    const retorno = await TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot,
        { url: '/configuracoes/painel?origem=celular' } as RouterStateSnapshot));

    expect(TestBed.inject(Router).serializeUrl(retorno as UrlTree))
      .toBe('/entrar?retorno=%2Fconfiguracoes%2Fpainel%3Forigem%3Dcelular');
  });
});
