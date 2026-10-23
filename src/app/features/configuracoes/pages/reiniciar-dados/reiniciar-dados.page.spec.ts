import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { ReiniciarDadosPage } from './reiniciar-dados.page';

describe('Reset seguro de dados financeiros', () => {
  const sair = jasmine.createSpy('sair');
  beforeEach(async () => {
    sair.calls.reset();
    await TestBed.configureTestingModule({
      imports: [ReiniciarDadosPage],
      providers: [
        provideRouter([{ path: 'entrar', component: ReiniciarDadosPage }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: {
          usuario: signal({ id: 5, nome: 'Teste', email: 'teste@exemplo.com' }),
          sair,
        } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('nunca envia um pedido sem senha, nem apaga dados ao abrir a tela', () => {
    const fixture = TestBed.createComponent(ReiniciarDadosPage);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent)
      .toContain('Apagar meus dados financeiros');
    expect((fixture.nativeElement as HTMLElement).textContent)
      .toContain('irreversível');
    void fixture.componentInstance.solicitar();
    TestBed.inject(HttpTestingController).expectNone(
      '/api/usuarios/me/reinicio-financeiro/solicitacoes');
    expect(sair).not.toHaveBeenCalled();
  });

  it('valida senha e somente depois pede o código ao e-mail', async () => {
    const fixture = TestBed.createComponent(ReiniciarDadosPage);
    fixture.componentInstance.senha.controls.senha.setValue('minhaSenhaSecreta');
    const envio = fixture.componentInstance.solicitar();
    const req = TestBed.inject(HttpTestingController)
      .expectOne('/api/usuarios/me/reinicio-financeiro/solicitacoes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ senha: 'minhaSenhaSecreta' });
    req.flush(null, { status: 202, statusText: 'Accepted' });
    await envio;
    fixture.detectChanges();
    expect(fixture.componentInstance.senha.controls.senha.value).toBe('');
    expect(fixture.componentInstance.etapa()).toBe('CODIGO');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('dez minutos');
    expect(sair).not.toHaveBeenCalled();
  });

  it('informa que 202 é mensagem pendente e consulta o estado real sem expor código', async () => {
    const fixture = TestBed.createComponent(ReiniciarDadosPage);
    fixture.componentInstance.senha.controls.senha.setValue('senha');
    const envio = fixture.componentInstance.solicitar();
    TestBed.inject(HttpTestingController).expectOne(
      '/api/usuarios/me/reinicio-financeiro/solicitacoes')
      .flush(null, { status: 202, statusText: 'Accepted' });
    await envio;
    fixture.detectChanges();
    expect(fixture.componentInstance.situacaoEnvio()).toBe('AGUARDANDO_ENVIO');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Seu pedido está salvo');

    const consulta = fixture.componentInstance.verificarEnvio();
    const req = TestBed.inject(HttpTestingController).expectOne(
      '/api/usuarios/me/reinicio-financeiro/solicitacoes/status');
    expect(req.request.method).toBe('GET');
    req.flush({ situacao: 'ENVIADO' });
    await consulta;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent)
      .toContain('Código aceito pelo serviço de e-mail');
    expect(sair).not.toHaveBeenCalled();
  });

  it('não confirma código inválido ou texto diferente de APAGAR DADOS', async () => {
    const fixture = TestBed.createComponent(ReiniciarDadosPage);
    fixture.componentInstance.senha.controls.senha.setValue('senha');
    const envio = fixture.componentInstance.solicitar();
    TestBed.inject(HttpTestingController).expectOne(
      '/api/usuarios/me/reinicio-financeiro/solicitacoes')
      .flush(null, { status: 202, statusText: 'Accepted' });
    await envio;
    fixture.componentInstance.confirmacao.patchValue({
      codigo: '123', texto: 'APAGAR DADOS',
    });
    await fixture.componentInstance.confirmar();
    expect(fixture.componentInstance.etapa()).toBe('CODIGO');
    fixture.componentInstance.confirmacao.patchValue({
      codigo: '12345678', texto: 'Apagar Dados',
    });
    await fixture.componentInstance.confirmar();
    expect(fixture.componentInstance.erro()).toContain('APAGAR DADOS');
    TestBed.inject(HttpTestingController).expectNone(
      '/api/usuarios/me/reinicio-financeiro/confirmacoes');
    expect(sair).not.toHaveBeenCalled();
  });

  it('bloqueia a exclusão enquanto o código ainda não foi enviado', async () => {
    const fixture = TestBed.createComponent(ReiniciarDadosPage);
    fixture.componentInstance.senha.controls.senha.setValue('senha');
    const envio = fixture.componentInstance.solicitar();
    TestBed.inject(HttpTestingController).expectOne(
      '/api/usuarios/me/reinicio-financeiro/solicitacoes')
      .flush(null, { status: 202, statusText: 'Accepted' });
    await envio;
    fixture.componentInstance.confirmacao.patchValue({
      codigo: '12345678', texto: 'APAGAR DADOS',
    });
    const confirmar = fixture.componentInstance.confirmar();
    TestBed.inject(HttpTestingController).expectOne(
      '/api/usuarios/me/reinicio-financeiro/solicitacoes/status')
      .flush({ situacao: 'AGUARDANDO_ENVIO' });
    await confirmar;
    TestBed.inject(HttpTestingController).expectNone(
      '/api/usuarios/me/reinicio-financeiro/confirmacoes');
    expect(fixture.componentInstance.erro()).toContain('aguardando envio');
    expect(sair).not.toHaveBeenCalled();
  });

  it('devolve erro do servidor sem encerrar a sessão e permite tentar novamente', async () => {
    const fixture = TestBed.createComponent(ReiniciarDadosPage);
    fixture.componentInstance.senha.controls.senha.setValue('senha');
    const envio = fixture.componentInstance.solicitar();
    TestBed.inject(HttpTestingController).expectOne(
      '/api/usuarios/me/reinicio-financeiro/solicitacoes')
      .flush({ title: 'Erro', detail: 'Senha inválida.' },
        { status: 422, statusText: 'Unprocessable Entity' });
    await envio;
    fixture.detectChanges();
    expect(fixture.componentInstance.etapa()).toBe('SENHA');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Senha inválida.');
    expect(sair).not.toHaveBeenCalled();
  });

  it('envia código e confirmação exata e termina sessão apenas após 204', async () => {
    const fixture = TestBed.createComponent(ReiniciarDadosPage);
    fixture.componentInstance.senha.controls.senha.setValue('senha');
    const envio = fixture.componentInstance.solicitar();
    TestBed.inject(HttpTestingController).expectOne(
      '/api/usuarios/me/reinicio-financeiro/solicitacoes')
      .flush(null, { status: 202, statusText: 'Accepted' });
    await envio;
    fixture.componentInstance.confirmacao.patchValue({
      codigo: '12345678', texto: 'APAGAR DADOS',
    });
    const rota = TestBed.inject(Router);
    const navegar = spyOn(rota, 'navigateByUrl').and.resolveTo(true);
    const confirmar = fixture.componentInstance.confirmar();
    const status = TestBed.inject(HttpTestingController).expectOne(
      '/api/usuarios/me/reinicio-financeiro/solicitacoes/status');
    status.flush({ situacao: 'ENVIADO' });
    await Promise.resolve();
    const req = TestBed.inject(HttpTestingController).expectOne(
      '/api/usuarios/me/reinicio-financeiro/confirmacoes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      codigo: '12345678', confirmacao: 'APAGAR DADOS',
    });
    expect(sair).not.toHaveBeenCalled();
    req.flush(null, { status: 204, statusText: 'No Content' });
    await confirmar;
    expect(sair).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith('/entrar');
  });
});
