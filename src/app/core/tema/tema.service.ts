import { HttpClient } from '@angular/common/http';
import {
  computed, DestroyRef, effect, inject, Injectable, signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from '../config/api.config';

export type TemaPreferido = 'CLARO' | 'ESCURO' | 'SISTEMA';
export type TemaEfetivo = 'CLARO' | 'ESCURO';

interface RespostaPreferencias {
  versao: number;
  preferencias: { aparencia: { tema: TemaPreferido } };
  atualizadoEm: string | null;
}

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly http = inject(HttpClient);
  private readonly sessao = inject(AuthService);
  private readonly destruir = inject(DestroyRef);
  private readonly preferenciaState = signal<TemaPreferido>('CLARO');
  private readonly sistemaEscuro = signal(false);
  private readonly versaoState = signal(0);
  private readonly carregandoState = signal(false);
  private readonly salvandoState = signal(false);
  private readonly erroState = signal<string | null>(null);
  private revisao = 0;
  private usuarioAnterior: number | null = null;
  private readonly chaveCache = 'radar-financeiro.tema.usuario.';

  readonly preferencia = this.preferenciaState.asReadonly();
  readonly efetivo = computed<TemaEfetivo>(() => this.preferenciaState() === 'SISTEMA'
    ? (this.sistemaEscuro() ? 'ESCURO' : 'CLARO') : this.preferenciaState() as TemaEfetivo);
  readonly carregando = this.carregandoState.asReadonly();
  readonly salvando = this.salvandoState.asReadonly();
  readonly erro = this.erroState.asReadonly();

  constructor() {
    const consulta = typeof window === 'undefined' || !window.matchMedia
      ? null : window.matchMedia('(prefers-color-scheme: dark)');
    this.sistemaEscuro.set(consulta?.matches ?? false);
    const mudou = (evento: MediaQueryListEvent) => this.sistemaEscuro.set(evento.matches);
    consulta?.addEventListener('change', mudou);
    this.destruir.onDestroy(() => consulta?.removeEventListener('change', mudou));

    effect(() => {
      if (typeof document === 'undefined') return;
      const escuro = this.efetivo() === 'ESCURO';
      document.documentElement.dataset['theme'] = escuro ? 'dark' : 'light';
      document.documentElement.style.colorScheme = escuro ? 'dark' : 'light';
    });

    effect(() => {
      const usuarioId = this.sessao.usuario()?.id ?? null;
      if (usuarioId === this.usuarioAnterior) return;
      const anterior = this.usuarioAnterior;
      this.usuarioAnterior = usuarioId;
      this.revisao++;
      this.versaoState.set(0);
      this.erroState.set(null);
      this.carregandoState.set(false);
      this.salvandoState.set(false);
      if (anterior !== null && usuarioId === null) this.limparCache(anterior);
      if (usuarioId === null) {
        this.preferenciaState.set('CLARO');
        return;
      }
      this.preferenciaState.set(this.lerCache(usuarioId) ?? 'CLARO');
      void this.carregar(usuarioId, this.revisao);
    });
  }

  private temaValido(valor: unknown): valor is TemaPreferido {
    return valor === 'CLARO' || valor === 'ESCURO' || valor === 'SISTEMA';
  }

  private lerCache(id: number): TemaPreferido | null {
    try {
      const valor = sessionStorage.getItem(this.chaveCache + id);
      return this.temaValido(valor) ? valor : null;
    } catch {
      return null;
    }
  }

  private gravarCache(id: number, tema: TemaPreferido): void {
    try { sessionStorage.setItem(this.chaveCache + id, tema); } catch { /* cache opcional */ }
  }

  private limparCache(id: number): void {
    try { sessionStorage.removeItem(this.chaveCache + id); } catch { /* logout segue */ }
  }

  private async carregar(id: number, revisao: number): Promise<void> {
    this.carregandoState.set(true);
    try {
      const resposta = await firstValueFrom(
        this.http.get<RespostaPreferencias>(API_BASE_URL + '/usuarios/me/preferencias'),
      );
      if (revisao !== this.revisao) return;
      const tema = resposta.preferencias?.aparencia?.tema;
      if (!this.temaValido(tema) || !Number.isSafeInteger(resposta.versao)) {
        throw new Error('Preferências inválidas.');
      }
      this.versaoState.set(resposta.versao);
      this.preferenciaState.set(tema);
      this.gravarCache(id, tema);
      this.erroState.set(null);
    } catch {
      if (revisao === this.revisao)
        this.erroState.set('Não foi possível carregar a aparência salva. Usando a configuração local.');
    } finally {
      if (revisao === this.revisao) this.carregandoState.set(false);
    }
  }

  async selecionar(tema: TemaPreferido): Promise<void> {
    if (!this.temaValido(tema) || this.carregandoState() || this.salvandoState()) return;
    const id = this.sessao.usuario()?.id;
    if (id == null) return;
    const revisao = this.revisao;
    this.preferenciaState.set(tema); // atualização visual imediata
    this.salvandoState.set(true);
    this.erroState.set(null);
    try {
      const resposta = await firstValueFrom(this.http.put<RespostaPreferencias>(
        API_BASE_URL + '/usuarios/me/preferencias/aparencia',
        { versao: this.versaoState(), tema },
      ));
      if (revisao !== this.revisao) return;
      if (!Number.isSafeInteger(resposta.versao)) throw new Error('Versão inválida.');
      this.versaoState.set(resposta.versao);
      this.gravarCache(id, tema);
    } catch {
      if (revisao === this.revisao) {
        this.erroState.set('Não foi possível salvar sua escolha. Verifique a conexão e tente novamente.');
      }
    } finally {
      if (revisao === this.revisao) this.salvandoState.set(false);
    }
  }

  recarregar(): void {
    const id = this.sessao.usuario()?.id;
    if (id == null || this.carregandoState() || this.salvandoState()) return;
    this.revisao++;
    void this.carregar(id, this.revisao);
  }
}
