import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { TemaService } from './tema.service';

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
});
