import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { CategoriasService } from './categorias.service';

describe('CategoriasService', () => {
  let api: CategoriasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CategoriasService, provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { obterIdEspacoAtual: () => 23 } },
      ],
    });
    api = TestBed.inject(CategoriasService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lista categorias do sistema e do contexto autorizado pela API', async () => {
    const resposta = firstValueFrom(api.listar());
    const req = http.expectOne('/api/espacos-financeiros/23/categorias');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 9, nome: 'Alimentação', tipo: 'DESPESA', escopo: 'SISTEMA', ativo: true }]);
    expect((await resposta)[0].escopo).toBe('SISTEMA');
  });

  it('cadastra apenas nome e tipo e delega validações ao backend', async () => {
    const resposta = firstValueFrom(api.criar({ nome: 'Mercado', tipo: 'DESPESA' }));
    const req = http.expectOne('/api/espacos-financeiros/23/categorias');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nome: 'Mercado', tipo: 'DESPESA' });
    req.flush({ id: 10, nome: 'Mercado', tipo: 'DESPESA', escopo: 'ESPACO', ativo: true });
    expect((await resposta).escopo).toBe('ESPACO');
  });
});
