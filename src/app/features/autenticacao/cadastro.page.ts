import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { mensagemDeErro } from '../../core/http/api-error';
import { AuthShell } from './auth-shell';

@Component({
  selector: 'app-cadastro-page',
  standalone: true,
  imports: [AuthShell, ReactiveFormsModule, RouterLink],
  templateUrl: './cadastro.page.html',
  styleUrl: './auth-form.scss',
})
export class CadastroPage {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly sessao = inject(AuthService);
  private readonly router = inject(Router);
  readonly carregando = signal(false);
  readonly mostrarSenha = signal(false);
  readonly erro = signal<string | null>(null);

  readonly formulario = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    senha: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
  });

  async cadastrar(): Promise<void> {
    if (this.carregando()) return;
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;

    this.carregando.set(true);
    this.erro.set(null);
    try {
      await this.sessao.cadastrar(this.formulario.getRawValue());
      await this.router.navigate(['/entrar'], { queryParams: { cadastro: 'ok' } });
    } catch (erro) {
      this.erro.set(mensagemDeErro(erro));
    } finally {
      this.carregando.set(false);
    }
  }
}
