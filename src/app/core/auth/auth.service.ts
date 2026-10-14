import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import {
  AutenticacaoResponse,
  CadastroRequest,
  ContextoFinanceiro,
  LoginRequest,
  Usuario,
} from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenState = signal<string | null>(null);
  private readonly expiracaoState = signal(0);
  private readonly usuarioState = signal<Usuario | null>(null);
  private readonly contextoState = signal<ContextoFinanceiro | null>(null);

  readonly usuario = this.usuarioState.asReadonly();
  readonly autenticado = computed(() => this.usuarioState() !== null);
  private readonly contextoAtual = this.contextoState.asReadonly();

  /**
   * Sessão exclusivamente em memória: recarregar a página exige novo login.
   * Não armazenar JWT em localStorage/sessionStorage sem revisão de segurança.
   */
  tokenAtual(): string | null {
    const token = this.tokenState();
    if (!token) return null;
    if (Date.now() >= this.expiracaoState()) {
      this.sair();
      return null;
    }
    return token;
  }

  sessaoAtiva(): boolean {
    return this.tokenAtual() !== null && this.usuarioState() !== null && this.contextoAtual() !== null;
  }

  async entrar(dados: LoginRequest): Promise<void> {
    this.sair();
    const resposta = await firstValueFrom(
      this.http.post<AutenticacaoResponse>(API_BASE_URL + '/auth/login', dados),
    );
    if (!resposta.token || resposta.expiraEmSegundos <= 0) {
      throw new Error('A API não retornou uma sessão válida.');
    }

    this.tokenState.set(resposta.token);
    this.expiracaoState.set(Date.now() + resposta.expiraEmSegundos * 1000);
    try {
      const { usuario, contexto } = await firstValueFrom(
        forkJoin({
          usuario: this.http.get<Usuario>(API_BASE_URL + '/usuarios/me'),
          contexto: this.http.get<ContextoFinanceiro>(API_BASE_URL + '/espacos-financeiros/atual'),
        }),
      );
      this.usuarioState.set(usuario);
      this.contextoState.set(contexto);
    } catch (erro) {
      this.sair();
      throw erro;
    }
  }

  async cadastrar(dados: CadastroRequest): Promise<void> {
    await firstValueFrom(this.http.post<Usuario>(API_BASE_URL + '/usuarios', dados));
  }

  sair(): void {
    this.tokenState.set(null);
    this.expiracaoState.set(0);
    this.usuarioState.set(null);
    this.contextoState.set(null);
  }
}
