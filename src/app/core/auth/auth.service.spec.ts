import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  const chave = 'radar-financeiro.auth.session.v1';

  function guardar(token: string, expiracao: number): void {
    sessionStorage.setItem(chave, JSON.stringify({ token, expiraEm: expiracao }));
  }

  let sessao: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.removeItem(chave);
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    sessao = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.removeItem(chave);
  });

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
    expect(JSON.parse(sessionStorage.getItem(chave) ?? '{}').token).toBe('jwt-teste');
    sessao.sair();
    expect(sessionStorage.getItem(chave)).toBeNull();
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

  it('restaura a sessão após F5 e refaz perfil e contexto antes de liberar acesso', async () => {
    guardar('jwt-aberto', Date.now() + 120_000);
    expect(sessao.sessaoAtiva()).toBeFalse();

    const recuperacao = sessao.restaurarSessao();
    expect(sessao.sessaoAtiva()).toBeFalse();
    expect(sessao.tokenAtual()).toBe('jwt-aberto');

    const perfil = http.expectOne('/api/usuarios/me');
    const contexto = http.expectOne('/api/espacos-financeiros/atual');
    perfil.flush({ id: 21, nome: 'Usuário da Sessão', email: 'pessoa@radar.local',
      criadoEm: '', atualizadoEm: '' });
    contexto.flush({ id: 8, nome: 'Interno', papel: 'PROPRIETARIO' });

    expect(await recuperacao).toBeTrue();
    expect(sessao.sessaoAtiva()).toBeTrue();
    expect(sessao.usuario()?.nome).toBe('Usuário da Sessão');
    expect(sessao.obterIdEspacoAtual()).toBe(8);
    expect(await sessao.restaurarSessao()).toBeTrue();
    http.expectNone('/api/usuarios/me');
  });

  it('compartilha a mesma restauração entre múltiplos guardas', async () => {
    guardar('jwt-concorrente', Date.now() + 120_000);
    const primeiro = sessao.restaurarSessao();
    const segundo = sessao.restaurarSessao();
    expect(primeiro).toBe(segundo);

    const perfil = http.expectOne('/api/usuarios/me');
    const contexto = http.expectOne('/api/espacos-financeiros/atual');
    perfil.flush({ id: 4, nome: 'Teste', email: 'teste@radar.local', criadoEm: '', atualizadoEm: '' });
    contexto.flush({ id: 6, nome: 'Interno', papel: 'PROPRIETARIO' });
    expect(await primeiro).toBeTrue();
    expect(await segundo).toBeTrue();
  });

  it('recusa token expirado sem consultar a API e apaga a credencial', async () => {
    guardar('jwt-expirado', Date.now() - 1);
    expect(await sessao.restaurarSessao()).toBeFalse();
    expect(sessao.tokenAtual()).toBeNull();
    expect(sessionStorage.getItem(chave)).toBeNull();
    http.expectNone('/api/usuarios/me');
  });

  it('recusa token corrompido e permite novo login', async () => {
    sessionStorage.setItem(chave, '{invalid-json');
    expect(await sessao.restaurarSessao()).toBeFalse();
    expect(sessionStorage.getItem(chave)).toBeNull();
  });

  it('remove sessão quando a revalidação responde 401', async () => {
    guardar('jwt-revogado', Date.now() + 120_000);
    const recuperacao = sessao.restaurarSessao();
    const perfil = http.expectOne('/api/usuarios/me');
    const contexto = http.expectOne('/api/espacos-financeiros/atual');
    contexto.flush({ id: 1, nome: 'Interno', papel: 'PROPRIETARIO' });
    perfil.flush({ detail: 'Não autorizado' }, { status: 401, statusText: 'Unauthorized' });
    expect(await recuperacao).toBeFalse();
    expect(sessao.sessaoAtiva()).toBeFalse();
    expect(sessionStorage.getItem(chave)).toBeNull();
  });

  it('ignora respostas atrasadas de uma restauração após logout', async () => {
    guardar('jwt-da-aba', Date.now() + 120_000);
    const recuperacao = sessao.restaurarSessao();
    const perfil = http.expectOne('/api/usuarios/me');
    const contexto = http.expectOne('/api/espacos-financeiros/atual');
    sessao.sair();
    perfil.flush({ id: 2, nome: 'Antigo', email: 'antigo@teste.com', criadoEm: '', atualizadoEm: '' });
    contexto.flush({ id: 3, nome: 'Interno', papel: 'PROPRIETARIO' });
    expect(await recuperacao).toBeFalse();
    expect(sessao.sessaoAtiva()).toBeFalse();
    expect(sessionStorage.getItem(chave)).toBeNull();
  });

});
