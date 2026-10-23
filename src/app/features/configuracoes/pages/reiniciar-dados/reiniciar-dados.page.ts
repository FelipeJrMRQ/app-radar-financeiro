import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { AuthService } from '../../../../core/auth/auth.service';
import { mensagemDeErro } from '../../../../core/http/api-error';

@Component({
  selector: 'app-reiniciar-dados',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './reiniciar-dados.page.html',
  styleUrl: './reiniciar-dados.page.scss',
})
export class ReiniciarDadosPage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly url = API_BASE_URL + '/usuarios/me/reinicio-financeiro';
  readonly usuario = this.auth.usuario;
  readonly etapa = signal<'SENHA' | 'CODIGO'>('SENHA');
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly senha = this.fb.group({ senha: ['', [Validators.required]] });
  readonly confirmacao = this.fb.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    texto: ['', [Validators.required]],
  });

  async solicitar(): Promise<void> {
    if (this.carregando() || this.etapa() !== 'SENHA') return;
    this.senha.markAllAsTouched();
    if (this.senha.invalid) return;
    this.carregando.set(true);
    this.erro.set(null);
    try {
      await firstValueFrom(this.http.post<void>(this.url + '/solicitacoes',
        { senha: this.senha.controls.senha.value }));
      this.senha.reset();
      this.etapa.set('CODIGO');
    } catch (erro) {
      this.erro.set(mensagemDeErro(erro));
    } finally {
      this.carregando.set(false);
    }
  }

  async confirmar(): Promise<void> {
    if (this.carregando() || this.etapa() !== 'CODIGO') return;
    this.confirmacao.markAllAsTouched();
    if (this.confirmacao.invalid) return;
    if (this.confirmacao.controls.texto.value !== 'APAGAR DADOS') {
      this.erro.set('Digite APAGAR DADOS exatamente como indicado.');
      return;
    }
    this.carregando.set(true);
    this.erro.set(null);
    try {
      await firstValueFrom(this.http.post<void>(this.url + '/confirmacoes', {
        codigo: this.confirmacao.controls.codigo.value,
        confirmacao: this.confirmacao.controls.texto.value,
      }));
      this.confirmacao.reset();
      this.auth.sair();
      await this.router.navigateByUrl('/entrar');
    } catch (erro) {
      this.erro.set(mensagemDeErro(erro));
    } finally {
      this.carregando.set(false);
    }
  }

  voltar(): void {
    if (this.carregando()) return;
    this.confirmacao.reset();
    this.erro.set(null);
    this.etapa.set('SENHA');
  }
}
