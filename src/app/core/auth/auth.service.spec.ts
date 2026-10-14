import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let sessao: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    sessao = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carrega usuário e contexto somente após autenticar', async () => {
    const promise = sessao.entrar({ email: 'teste@radar.local', senha: 'Radar@123' });

    const login = http.expectOne('/api/auth/login');
    expect(login.request.method).toBe('POST');
    login.flush({ token: 'jwt-teste', tipo: 'Bearer', expiraEmSegundos: 3600 });

    await Promise.resolve();

    const perfil = http.expectOne('/api/usuarios/me');
    const contexto = http.expectOne('/api/espacos-financeiros/atual');
    perfil.flush({ id: 1, nome: 'Pessoa Teste', email: 'teste@radar.local', criadoEm: '', atualizadoEm: '' });
    contexto.flush({ id: 7, nome: 'Interno', papel: 'PROPRIETARIO' });

    await promise;
    expect(sessao.sessaoAtiva()).toBeTrue();
    expect(sessao.usuario()?.nome).toBe('Pessoa Teste');
    expect(sessao.tokenAtual()).toBe('jwt-teste');
    sessao.sair();
    expect(sessao.sessaoAtiva()).toBeFalse();
    expect(sessao.tokenAtual()).toBeNull();
  });

  it('cadastra usuário sem autenticação prévia', async () => {
    const promise = sessao.cadastrar({ nome: 'Novo Cliente', email: 'novo@teste.com', senha: 'Senha@123' });
    const request = http.expectOne('/api/usuarios');
    expect(request.request.method).toBe('POST');
    request.flush({ id: 2, nome: 'Novo Cliente', email: 'novo@teste.com', criadoEm: '', atualizadoEm: '' });
    await promise;
    expect(sessao.sessaoAtiva()).toBeFalse();
  });
});
