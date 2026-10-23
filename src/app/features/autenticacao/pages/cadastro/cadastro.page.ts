import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { mensagemDeErro } from '../../../../core/http/api-error';
import { AuthShell } from '../../components/auth-shell/auth-shell';

@Component({
  selector: 'app-cadastro-page',
  standalone: true,
  imports: [AuthShell, ReactiveFormsModule, RouterLink],
  templateUrl: './cadastro.page.html',
  styleUrl: './cadastro.page.scss',
})
export class CadastroPage {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly sessao = inject(AuthService);
  private readonly router = inject(Router);
  readonly carregando = signal(false);
  readonly mostrarSenha = signal(false);
  readonly erro = signal<string | null>(null);

  private senhasConferem(grupo: AbstractControl): ValidationErrors | null {
    const senha = grupo.get('senha')?.value;
    const confirmacao = grupo.get('confirmacaoSenha')?.value;
    return senha === confirmacao ? null : { senhasDiferentes: true };
  }

  readonly formulario = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    senha: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(128)]],
    confirmacaoSenha: ['', Validators.required],
  }, { validators: grupo => this.senhasConferem(grupo) });

  async cadastrar(): Promise<void> {
    if (this.carregando()) return;
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;

    this.carregando.set(true);
    this.erro.set(null);
    try {
      const dados = this.formulario.getRawValue();
      // Confirmação é validada somente no formulário e nunca enviada à API.
      await this.sessao.cadastrar({
        nome: dados.nome, email: dados.email, senha: dados.senha,
      });
      await this.router.navigate(['/entrar'], { queryParams: { cadastro: 'ok' } });
    } catch (erro) {
      this.erro.set(mensagemDeErro(erro));
    } finally {
      this.carregando.set(false);
    }
  }
}
