import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  CriarLancamento, Lancamento, CriarRecorrenciaLancamento, CriarParcelamentoLancamento,
  FiltroLancamentosPeriodo, ResumoLancamentosPeriodo,
} from '../models/lancamento.model';

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


  /** Consulta o mesmo recorte utilizado no total, sem cálculos monetários no cliente. */
  listarPeriodo(filtro: FiltroLancamentosPeriodo) {
    return this.http.get<Lancamento[]>(this.endpoint(), {params: this.parametrosPeriodo(filtro)});
  }

  resumirPeriodo(filtro: FiltroLancamentosPeriodo) {
    return this.http.get<ResumoLancamentosPeriodo>(this.endpoint() + '/resumo-periodo',
      {params: this.parametrosPeriodo(filtro)});
  }

  private parametrosPeriodo(filtro: FiltroLancamentosPeriodo): HttpParams {
    let params = new HttpParams()
      .set('dataInicio', filtro.dataInicio)
      .set('dataFim', filtro.dataFim);
    if (filtro.tipo) params = params.set('tipo', filtro.tipo);
    if (filtro.contaFinanceiraId !== null) {
      params = params.set('contaFinanceiraId', String(filtro.contaFinanceiraId));
    }
    return params;
  }

  criarRecorrencia(dados: CriarRecorrenciaLancamento) {
    return this.http.post(this.endpoint().replace(/\/lancamentos$/, '/recorrencias-lancamentos'), dados);
  }

  criarParcelamento(dados: CriarParcelamentoLancamento) {
    return this.http.post(this.endpoint().replace(/\/lancamentos$/, '/parcelamentos-lancamentos'), dados);
  }

  criar(dados: CriarLancamento) {
    return this.http.post<Lancamento>(this.endpoint(), dados);
  }
}
