import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, timer } from 'rxjs';

import { API_BASE_URL } from '../../../../core/config/api.config';
import { AuthService } from '../../../../core/auth/auth.service';
import { mensagemDeErro } from '../../../../core/http/api-error';

type SituacaoEnvio = 'AGUARDANDO_ENVIO' | 'ENVIADO' | 'EXPIRADO' | 'SEM_SOLICITACAO';

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
  private readonly destruir = inject(DestroyRef);
  private readonly url = API_BASE_URL + '/usuarios/me/reinicio-financeiro';
  readonly usuario = this.auth.usuario;
  readonly etapa = signal<'SENHA' | 'CODIGO'>('SENHA');
  readonly carregando = signal(false);
  readonly verificandoEnvio = signal(false);
  readonly situacaoEnvio = signal<SituacaoEnvio>('AGUARDANDO_ENVIO');
  readonly erro = signal<string | null>(null);
  readonly senha = this.fb.group({ senha: ['', [Validators.required]] });
  readonly confirmacao = this.fb.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    texto: ['', [Validators.required]],
  });

  constructor() {
    // Consulta leve somente durante a etapa de confirmação; encerra ao sair da tela.
    timer(10000, 10000).pipe(takeUntilDestroyed(this.destruir)).subscribe(() => {
      if (this.etapa() === 'CODIGO' && !this.carregando() && !this.verificandoEnvio()
          && this.situacaoEnvio() !== 'EXPIRADO' && this.situacaoEnvio() !== 'SEM_SOLICITACAO') {
        void this.verificarEnvio(true);
      }
    });
  }

  private async consultarSituacaoEnvio(): Promise<SituacaoEnvio> {
    const resposta = await firstValueFrom(this.http.get<{ situacao: SituacaoEnvio }>(
      this.url + '/solicitacoes/status'));
    this.situacaoEnvio.set(resposta.situacao);
    return resposta.situacao;
  }

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
      // 202 confirma persistência no Outbox, NÃO o aceite pelo SMTP.
      this.situacaoEnvio.set('AGUARDANDO_ENVIO');
      this.etapa.set('CODIGO');
    } catch (erro) {
      this.erro.set(mensagemDeErro(erro));
    } finally {
      this.carregando.set(false);
    }
  }

  async verificarEnvio(silencioso = false): Promise<void> {
    if (this.verificandoEnvio() || this.carregando() || this.etapa() !== 'CODIGO') return;
    this.verificandoEnvio.set(true);
    if (!silencioso) this.erro.set(null);
    try {
      await this.consultarSituacaoEnvio();
    } catch (erro) {
      if (!silencioso) this.erro.set(mensagemDeErro(erro));
    } finally {
      this.verificandoEnvio.set(false);
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
      // Confirmação destrutiva somente após revalidar a situação no backend.
      const situacao = await this.consultarSituacaoEnvio();
      if (situacao !== 'ENVIADO') {
        this.erro.set(situacao === 'AGUARDANDO_ENVIO'
          ? 'O código ainda está aguardando envio. Verifique o status antes de confirmar.'
          : 'Não há código válido para confirmar. Volte e solicite outro após o prazo de segurança.');
        return;
      }
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
