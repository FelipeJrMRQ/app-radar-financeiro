import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { CadastroPage } from './cadastro.page';

describe('Segurança do cadastro', () => {
  let cadastrar: jasmine.Spy;
  beforeEach(async () => {
    cadastrar = jasmine.createSpy('cadastrar').and.resolveTo(undefined);
    await TestBed.configureTestingModule({
      imports: [CadastroPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { cadastrar } },
      ],
    }).compileComponents();
  });

  function preencher(page: CadastroPage, senha: string, confirmacao: string): void {
    page.formulario.setValue({
      nome: 'Pessoa Exemplo',
      email: 'pessoa@exemplo.com',
      senha,
      confirmacaoSenha: confirmacao,
    });
  }

  it('rejeita senhas curtas e não tenta cadastrar', async () => {
    const fixture = TestBed.createComponent(CadastroPage);
    const page = fixture.componentInstance;
    preencher(page, 'senha123', 'senha123');
    expect(page.formulario.invalid).toBeTrue();
    await page.cadastrar();
    expect(cadastrar).not.toHaveBeenCalled();
  });

  it('impede cadastro quando a confirmação é diferente', async () => {
    const fixture = TestBed.createComponent(CadastroPage);
    const page = fixture.componentInstance;
    preencher(page, 'uma senha longa e segura', 'outra senha longa e segura');
    expect(page.formulario.hasError('senhasDiferentes')).toBeTrue();
    await page.cadastrar();
    expect(cadastrar).not.toHaveBeenCalled();
  });

  it('aceita senha longa e envia somente nome, e-mail e senha', async () => {
    const fixture = TestBed.createComponent(CadastroPage);
    const page = fixture.componentInstance;
    const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    preencher(page, 'frase segura e unica 2026', 'frase segura e unica 2026');
    expect(page.formulario.valid).toBeTrue();
    await page.cadastrar();
    expect(cadastrar).toHaveBeenCalledOnceWith({
      nome: 'Pessoa Exemplo',
      email: 'pessoa@exemplo.com',
      senha: 'frase segura e unica 2026',
    });
    expect(navegar).toHaveBeenCalled();
  });
});
