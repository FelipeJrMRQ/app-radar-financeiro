import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { mensagemDeErro } from '../../../../core/http/api-error';
import { AuthShell } from '../../components/auth-shell/auth-shell';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [AuthShell, ReactiveFormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly sessao = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly carregando = signal(false);
  readonly mostrarSenha = signal(false);
  readonly erro = signal<string | null>(null);
  readonly cadastroConcluido = this.route.snapshot.queryParamMap.get('cadastro') === 'ok';

  readonly formulario = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]],
  });

  async entrar(): Promise<void> {
    if (this.carregando()) return;
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;

    this.carregando.set(true);
    this.erro.set(null);
    try {
      await this.sessao.entrar(this.formulario.getRawValue());
      const retorno = this.route.snapshot.queryParamMap.get('retorno');
      // Aceitar somente rotas internas e impedir redirecionamento externo.
      const destino = retorno?.startsWith('/') && !retorno.startsWith('//') &&
        !retorno.startsWith('/\\') && !retorno.startsWith('/entrar')
          ? retorno : '/';
      await this.router.navigateByUrl(destino);
    } catch (erro) {
      this.erro.set(mensagemDeErro(erro));
    } finally {
      this.carregando.set(false);
    }
  }
}
