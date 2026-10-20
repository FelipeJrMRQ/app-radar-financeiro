import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { PrivacidadeValoresService } from '../privacidade/privacidade-valores.service';
import {
  AutenticacaoResponse,
  CadastroRequest,
  ContextoFinanceiro,
  LoginRequest,
  Usuario,
} from './auth.models';

interface CredencialTemporaria {
  token: string;
  expiraEm: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly privacidade = inject(PrivacidadeValoresService);
  private readonly tokenState = signal<string | null>(null);
  private readonly expiracaoState = signal(0);
  private readonly usuarioState = signal<Usuario | null>(null);
  private readonly contextoState = signal<ContextoFinanceiro | null>(null);
  private readonly chaveSessao = 'radar-financeiro.auth.session.v1';

  private restauracaoEmCurso: Promise<boolean> | null = null;
  private revisaoSessao = 0;

  readonly usuario = this.usuarioState.asReadonly();
  readonly autenticado = computed(() => this.usuarioState() !== null);
  private readonly contextoAtual = this.contextoState.asReadonly();

  /**
   * O JWT é mantido em memória e, somente na aba atual, em sessionStorage.
   * A persistência permite F5; não guarda senhas, perfil ou contexto financeiro.
   * O token tem duração definida pelo backend (atualmente 1 hora).
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

  /**
   * Recarrega usuário e espaço financeiro da API antes de liberar rotas protegidas.
   * O Promise compartilhado impede chamadas duplicadas por guardas simultâneos.
   */
  restaurarSessao(): Promise<boolean> {
    if (this.sessaoAtiva()) return Promise.resolve(true);
    if (this.restauracaoEmCurso) return this.restauracaoEmCurso;

    const credencial = this.lerCredencial();
    if (!credencial) return Promise.resolve(false);

    const revisao = this.revisaoSessao;
    this.tokenState.set(credencial.token);
    this.expiracaoState.set(credencial.expiraEm);

    const pendente = this.carregarIdentidade()
      .then(({ usuario, contexto }) => {
        // Se houve logout enquanto o HTTP estava pendente, descarta a resposta.
        if (this.revisaoSessao !== revisao || this.tokenAtual() !== credencial.token) {
          return false;
        }
        this.usuarioState.set(usuario);
        this.contextoState.set(contexto);
        return this.sessaoAtiva();
      })
      .catch(() => {
        if (this.revisaoSessao === revisao) this.sair();
        return false;
      });

    this.restauracaoEmCurso = pendente;
    void pendente.finally(() => {
      if (this.restauracaoEmCurso === pendente) this.restauracaoEmCurso = null;
    });
    return pendente;
  }

  async entrar(dados: LoginRequest): Promise<void> {
    this.sair();
    const revisao = this.revisaoSessao;
    const resposta = await firstValueFrom(
      this.http.post<AutenticacaoResponse>(API_BASE_URL + '/auth/login', dados),
    );
    if (!resposta.token || resposta.expiraEmSegundos <= 0) {
      throw new Error('A API não retornou uma sessão válida.');
    }
    if (this.revisaoSessao !== revisao) return;

    const expiraEm = Date.now() + resposta.expiraEmSegundos * 1000;
    this.tokenState.set(resposta.token);
    this.expiracaoState.set(expiraEm);

    try {
      const { usuario, contexto } = await this.carregarIdentidade();
      if (this.revisaoSessao !== revisao) return;
      this.usuarioState.set(usuario);
      this.contextoState.set(contexto);
      this.gravarCredencial({ token: resposta.token, expiraEm });
    } catch (erro) {
      if (this.revisaoSessao === revisao) this.sair();
      throw erro;
    }
  }

  async cadastrar(dados: CadastroRequest): Promise<void> {
    await firstValueFrom(this.http.post<Usuario>(API_BASE_URL + '/usuarios', dados));
  }

  /** ID técnico obtido da sessão; o espaço nunca é selecionável pela interface. */
  obterIdEspacoAtual(): number | null {
    return this.sessaoAtiva() ? (this.contextoState()?.id ?? null) : null;
  }

  sair(): void {
    this.privacidade.ocultar();
    this.revisaoSessao++;
    this.tokenState.set(null);
    this.expiracaoState.set(0);
    this.usuarioState.set(null);
    this.contextoState.set(null);
    this.apagarCredencial();
  }

  private carregarIdentidade(): Promise<{ usuario: Usuario; contexto: ContextoFinanceiro }> {
    return firstValueFrom(forkJoin({
      usuario: this.http.get<Usuario>(API_BASE_URL + '/usuarios/me'),
      contexto: this.http.get<ContextoFinanceiro>(API_BASE_URL + '/espacos-financeiros/atual'),
    }));
  }

  private lerCredencial(): CredencialTemporaria | null {
    try {
      const texto = sessionStorage.getItem(this.chaveSessao);
      if (!texto) return null;
      const valor: unknown = JSON.parse(texto);
      if (!valor || typeof valor !== 'object') {
        this.apagarCredencial();
        return null;
      }
      const dados = valor as Partial<CredencialTemporaria>;
      if (typeof dados.token !== 'string' || !dados.token.trim() ||
          typeof dados.expiraEm !== 'number' || !Number.isFinite(dados.expiraEm) ||
          Date.now() >= dados.expiraEm) {
        this.apagarCredencial();
        return null;
      }
      return { token: dados.token, expiraEm: dados.expiraEm };
    } catch {
      // Navegação privada, storage desabilitado ou registro inválido:
      // login funciona normalmente somente em memória.
      this.apagarCredencial();
      return null;
    }
  }

  private gravarCredencial(credencial: CredencialTemporaria): void {
    try {
      sessionStorage.setItem(this.chaveSessao, JSON.stringify(credencial));
    } catch {
      // Persistência por aba indisponível: mantém a sessão apenas em memória.
    }
  }

  private apagarCredencial(): void {
    try {
      sessionStorage.removeItem(this.chaveSessao);
    } catch {
      // Não impedir logout por erro no armazenamento.
    }
  }
}
