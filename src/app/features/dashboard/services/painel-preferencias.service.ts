import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api.config';
import { mensagemDeErro } from '../../../core/http/api-error';
import {
  CodigoComponentePainel,
  normalizarPreferencias,
  PreferenciaComponentePainel,
  preferenciasPadrao,
} from '../models/painel-preferencias.model';

@Injectable({ providedIn: 'root' })
export class PainelPreferenciasService {
  private readonly http = inject(HttpClient);
  private readonly url = API_BASE_URL + '/usuarios/me/preferencias-painel';
  private readonly items = signal<PreferenciaComponentePainel[]>(preferenciasPadrao());
  readonly preferencias = this.items.asReadonly();
  readonly visiveis = computed(() => this.items().filter(item => item.visivel));
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  estaVisivel(codigo: CodigoComponentePainel): boolean {
    return this.items().some(item => item.codigoComponente === codigo && item.visivel);
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    // Não manter dados de outro usuário em tela na troca de sessão.
    this.items.set(preferenciasPadrao());
    try {
      const dados = await firstValueFrom(this.http.get<PreferenciaComponentePainel[]>(this.url));
      this.items.set(normalizarPreferencias(dados));
    } catch (erro) {
      this.erro.set('Não foi possível carregar a organização do painel. '
        + mensagemDeErro(erro));
    } finally {
      this.carregando.set(false);
    }
  }

  async salvar(itens: ReadonlyArray<PreferenciaComponentePainel>): Promise<void> {
    const dados = normalizarPreferencias(itens);
    const resposta = await firstValueFrom(this.http.put<PreferenciaComponentePainel[]>(
      this.url,
      { componentes: dados.map(item =>
        ({ codigoComponente: item.codigoComponente, visivel: item.visivel })) },
    ));
    this.items.set(normalizarPreferencias(resposta));
    this.erro.set(null);
  }

  async restaurar(): Promise<void> {
    await firstValueFrom(this.http.delete<void>(this.url));
    this.items.set(preferenciasPadrao());
    this.erro.set(null);
  }
}
