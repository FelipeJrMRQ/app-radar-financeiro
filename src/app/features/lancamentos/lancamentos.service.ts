import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/config/api.config';
import { CriarLancamento, Lancamento } from './lancamento.model';

@Injectable({ providedIn: 'root' })
export class LancamentosService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private endpoint(): string {
    const id = this.auth.obterIdEspacoAtual();
    if (id === null) throw new Error('Contexto financeiro indisponível.');
    return API_BASE_URL + '/espacos-financeiros/' + id + '/lancamentos';
  }

  listar(contaFinanceiraId: number | null = null) {
    const options = contaFinanceiraId === null
      ? {}
      : { params: new HttpParams().set('contaFinanceiraId', String(contaFinanceiraId)) };
    return this.http.get<Lancamento[]>(this.endpoint(), options);
  }

  criar(dados: CriarLancamento) {
    return this.http.post<Lancamento>(this.endpoint(), dados);
  }
}
