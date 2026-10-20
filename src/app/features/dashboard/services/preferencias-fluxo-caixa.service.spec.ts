import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PreferenciasFluxoCaixaService } from './preferencias-fluxo-caixa.service';

describe('PreferenciasFluxoCaixaService', () => {
  let service: PreferenciasFluxoCaixaService;
  let http: HttpTestingController;
  const caminho = '/api/usuarios/me/preferencias-fluxo-caixa';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PreferenciasFluxoCaixaService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PreferenciasFluxoCaixaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('recupera as contas desmarcadas sem depender da privacidade dos valores', async () => {
    const carregar = service.carregar();
    const request = http.expectOne(caminho);
    expect(request.request.method).toBe('GET');
    request.flush({ ocultarContasZeradas: true, contasDesmarcadas: [7, 8] });
    expect(await carregar).toEqual({ ocultarContasZeradas: true, contasDesmarcadas: [7, 8] });
    expect(service.erro()).toBeNull();
  });

  it('identifica API desatualizada (404) sem impedir o gráfico de carregar', async () => {
    const carregar = service.carregar();
    http.expectOne(caminho).flush({}, { status: 404, statusText: 'Not Found' });
    expect(await carregar).toEqual({ ocultarContasZeradas: false, contasDesmarcadas: [] });
    expect(service.erro()).toContain('endpoint /usuarios/me/preferencias-fluxo-caixa');
    expect(service.erro()).toContain('não será preservada');
  });

  it('distingue indisponibilidade de rede do endpoint ausente', async () => {
    const carregar = service.carregar();
    http.expectOne(caminho).error(new ProgressEvent('error'), { status: 0, statusText: '' });
    expect(await carregar).toEqual({ ocultarContasZeradas: false, contasDesmarcadas: [] });
    expect(service.erro()).toContain('conectar à API');
    expect(service.erro()).not.toContain('(404)');
  });
});
