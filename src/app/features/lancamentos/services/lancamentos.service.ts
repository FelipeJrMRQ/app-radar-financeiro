import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  CriarLancamento, Lancamento, CriarRecorrenciaLancamento, CriarParcelamentoLancamento,
  FiltroLancamentosPeriodo, ResumoLancamentosPeriodo,
  AtualizarLancamento, ConfirmacaoLancamento, ResumoRealizacoesLancamento,
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

  buscar(id: number) {
    return this.http.get<Lancamento>(this.endpoint() + '/' + id);
  }

  editar(id: number, dados: AtualizarLancamento, escopo: 'ATUAL' | 'SEGUINTES' = 'ATUAL',
      parcelado = false) {
    const sufixo = escopo === 'SEGUINTES'
      ? parcelado ? '/parcelas-restantes' : '/esta-e-proximas' : '';
    return this.http.put<Lancamento>(this.endpoint() + '/' + id + sufixo, dados);
  }

  excluir(id: number, escopo: 'ATUAL' | 'SEGUINTES' = 'ATUAL', parcelado = false) {
    const sufixo = escopo === 'SEGUINTES'
      ? parcelado ? '/parcelas-restantes' : '/esta-e-proximas' : '';
    return this.http.delete<void>(this.endpoint() + '/' + id + sufixo);
  }

  confirmar(id: number, dados: ConfirmacaoLancamento) {
    return this.http.post<Lancamento>(this.endpoint() + '/' + id + '/confirmacao', dados);
  }

  /** Confirma o valor integral existente na API sem enviar valores financeiros pelo navegador. */
  confirmarAutomaticamente(id: number) {
    return this.http.post<Lancamento>(this.endpoint() + '/' + id + '/confirmacao-automatica', null);
  }

  /** Reabre uma confirmação direta; realizações parciais possuem fluxo próprio de estorno. */
  desfazerConfirmacao(id: number) {
    return this.http.post<Lancamento>(this.endpoint() + '/' + id + '/estorno-confirmacao', null);
  }

  realizarParcialmente(id: number, dados: ConfirmacaoLancamento) {
    return this.http.post<ResumoRealizacoesLancamento>(
      this.endpoint() + '/' + id + '/realizacoes', dados);
  }

  realizacoes(id: number) {
    return this.http.get<ResumoRealizacoesLancamento>(
      this.endpoint() + '/' + id + '/realizacoes');
  }

  estornar(id: number, realizacaoId: number) {
    return this.http.delete<void>(
      this.endpoint() + '/' + id + '/realizacoes/' + realizacaoId);
  }

  criar(dados: CriarLancamento) {
    return this.http.post<Lancamento>(this.endpoint(), dados);
  }
}
