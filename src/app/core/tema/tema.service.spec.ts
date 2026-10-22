import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { TemaService } from './tema.service';
import { PrivacidadeValoresService } from '../privacidade/privacidade-valores.service';

describe('TemaService', () => {
  const usuario = signal<{ id: number } | null>(null);
  let http: HttpTestingController;
  let servico: TemaService;

  beforeEach(() => {
    usuario.set(null);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { usuario: usuario.asReadonly() } },
      ],
    });
    servico = TestBed.inject(TemaService);
    http = TestBed.inject(HttpTestingController);
    TestBed.flushEffects();
  });

  afterEach(() => {
    TestBed.inject(PrivacidadeValoresService).restaurarPadrao();
    for (const id of [7, 42, 71, 72, 73]) sessionStorage.removeItem('radar-financeiro.privacidade.usuario.' + id);
    http.verify();
    TestBed.resetTestingModule();
  });

  it('inicia claro, carrega preferencia e nunca altera privacidade', () => {
    expect(servico.efetivo()).toBe('CLARO');
    usuario.set({ id: 7 });
    TestBed.flushEffects();
    http.expectOne('/api/usuarios/me/preferencias').flush({
      versao: 2, preferencias: { aparencia: { tema: 'ESCURO' } }, atualizadoEm: null,
    });
    return Promise.resolve().then(() => expect(servico.efetivo()).toBe('ESCURO'));
  });

  it('nao usa identificador de outro usuario no endpoint', () => {
    usuario.set({ id: 42 });
    TestBed.flushEffects();
    http.expectOne('/api/usuarios/me/preferencias').flush({
      versao: 0, preferencias: { aparencia: { tema: 'CLARO' } }, atualizadoEm: null,
    });
  });

  it('aplica preferencia de privacidade salva no backend e permite reexibir', async () => {
    const privacidade = TestBed.inject(PrivacidadeValoresService);
    expect(privacidade.valoresVisiveis()).toBeTrue();

    usuario.set({ id: 71 });
    TestBed.flushEffects();
    http.expectOne('/api/usuarios/me/preferencias').flush({
      versao: 3,
      preferencias: {
        aparencia: { tema: 'ESCURO' },
        privacidade: { valoresFinanceirosVisiveis: false },
      }, atualizadoEm: null,
    });
    await Promise.resolve();
    expect(privacidade.valoresVisiveis()).toBeFalse();
    expect(servico.efetivo()).toBe('ESCURO');

    const salvar = servico.selecionarVisibilidade(true);
    expect(privacidade.valoresVisiveis()).toBeTrue();
    const requisicao = http.expectOne('/api/usuarios/me/preferencias/privacidade');
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({ versao: 3, valoresFinanceirosVisiveis: true });
    requisicao.flush({
      versao: 4,
      preferencias: {
        aparencia: { tema: 'ESCURO' },
        privacidade: { valoresFinanceirosVisiveis: true },
      }, atualizadoEm: null,
    });
    await salvar;
    expect(servico.erro()).toBeNull();
    expect(privacidade.valoresVisiveis()).toBeTrue();
  });

  it('restaura a escolha anterior se o backend rejeita a atualizacao', async () => {
    const privacidade = TestBed.inject(PrivacidadeValoresService);
    usuario.set({ id: 72 });
    TestBed.flushEffects();
    http.expectOne('/api/usuarios/me/preferencias').flush({
      versao: 1,
      preferencias: {
        aparencia: { tema: 'CLARO' },
        privacidade: { valoresFinanceirosVisiveis: true },
      }, atualizadoEm: null,
    });
    await Promise.resolve();

    const salvar = servico.selecionarVisibilidade(false);
    expect(privacidade.valoresVisiveis()).toBeFalse();
    http.expectOne('/api/usuarios/me/preferencias/privacidade').flush(
      { detail: 'Conflito de versao' }, { status: 409, statusText: 'Conflict' },
    );
    await salvar;
    expect(privacidade.valoresVisiveis()).toBeTrue();
    expect(servico.erro()).toContain('Não foi possível salvar');
  });

  it('assume valores exibidos quando o registro legado nao possui privacidade', async () => {
    const privacidade = TestBed.inject(PrivacidadeValoresService);
    privacidade.ocultar();
    usuario.set({ id: 73 });
    TestBed.flushEffects();
    http.expectOne('/api/usuarios/me/preferencias').flush({
      versao: 2, preferencias: { aparencia: { tema: 'CLARO' } }, atualizadoEm: null,
    });
    await Promise.resolve();
    expect(privacidade.valoresVisiveis()).toBeTrue();
  });
});
