import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PainelPreferenciasService } from './painel-preferencias.service';

describe('PainelPreferenciasService', () => {
  let api: PainelPreferenciasService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PainelPreferenciasService, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PainelPreferenciasService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('carrega a configuração pelo usuario autenticado, sem id no frontend', async () => {
    const promise = api.carregar();
    const req = http.expectOne('/api/usuarios/me/preferencias-painel');
    expect(req.request.method).toBe('GET');
    req.flush([{codigoComponente: 'FLUXO_CAIXA', ordemExibicao:0, visivel:false}]);
    await promise;
    expect(api.visiveis().some(x => x.codigoComponente === 'FLUXO_CAIXA')).toBeFalse();
  });

  it('salva inclusive itens ocultos e respeita ordem', async () => {
    const itens = api.preferencias().map((x, i) =>
      ({...x, ordemExibicao:i, visivel:i !== 2}));
    const promise = api.salvar(itens);
    const req = http.expectOne('/api/usuarios/me/preferencias-painel');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.componentes).toHaveSize(6);
    expect(req.request.body.componentes[2].visivel).toBeFalse();
    req.flush(itens);
    await promise;
    expect(api.estaVisivel('SALDOS_CONTAS')).toBeFalse();
  });

  it('restaura apenas a preferência do usuário', async () => {
    const promise = api.restaurar();
    const req = http.expectOne('/api/usuarios/me/preferencias-painel');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    await promise;
    expect(api.visiveis().length).toBe(6);
  });
});
