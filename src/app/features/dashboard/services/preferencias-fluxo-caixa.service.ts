import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api.config';

export interface PreferenciasFluxoCaixa {
  ocultarContasZeradas: boolean;
  contasDesmarcadas: number[];
}

@Injectable({ providedIn: 'root' })
export class PreferenciasFluxoCaixaService {
  private readonly http = inject(HttpClient);
  private readonly url = API_BASE_URL + '/usuarios/me/preferencias-fluxo-caixa';
  readonly erro = signal<string | null>(null);
  private fila: Promise<void> = Promise.resolve();

  private descreverFalha(erro: unknown, operacao: 'recuperar' | 'salvar'): string {
    if (erro instanceof HttpErrorResponse && erro.status === 404) {
      return 'Preferências das contas indisponíveis nesta versão da API (404). '
        + 'Verifique se o backend inclui o endpoint /usuarios/me/preferencias-fluxo-caixa. '
        + 'A seleção atual não será preservada ao reabrir o painel.';
    }
    if (erro instanceof HttpErrorResponse && erro.status === 0) {
      return 'Não foi possível conectar à API para ' + operacao
        + ' as preferências das contas do fluxo de caixa.';
    }
    return operacao === 'recuperar'
      ? 'Não foi possível recuperar as preferências das contas do fluxo de caixa.'
      : 'Não foi possível salvar sua preferência. Tente alterar a seleção novamente.';
  }

  async carregar(): Promise<PreferenciasFluxoCaixa> {
    this.erro.set(null);
    try {
      return await firstValueFrom(this.http.get<PreferenciasFluxoCaixa>(this.url));
    } catch (erro) {
      this.erro.set(this.descreverFalha(erro, 'recuperar'));
      // O gráfico continua disponível com a seleção padrão, mas sem persistência.
      return { ocultarContasZeradas: false, contasDesmarcadas: [] };
    }
  }

  salvar(preferencias: PreferenciasFluxoCaixa): void {
    const dados = {
      ocultarContasZeradas: preferencias.ocultarContasZeradas,
      contasDesmarcadas: [...preferencias.contasDesmarcadas],
    };
    // Serializa os comandos: a última escolha precisa vencer, mesmo com rede lenta.
    this.fila = this.fila.catch(() => undefined).then(async () => {
      await firstValueFrom(this.http.put<PreferenciasFluxoCaixa>(this.url, dados));
      this.erro.set(null);
    }).catch((erro) => {
      this.erro.set(this.descreverFalha(erro, 'salvar'));
    });
  }
}
