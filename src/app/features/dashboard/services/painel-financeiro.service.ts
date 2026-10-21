import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import { FluxoCaixaConsolidado, FluxoCaixaConta, PainelFinanceiro, TotalCategoria } from '../models/painel-financeiro.model';

@Injectable({ providedIn: 'root' })
export class PainelFinanceiroService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private caminho(): string {
    const id = this.auth.obterIdEspacoAtual();
    if (id === null) throw new Error('Contexto financeiro indisponível.');
    return API_BASE_URL + '/espacos-financeiros/' + id;
  }

  consultar(dataInicio: string, dataFim: string) {
    const params = new HttpParams().set('dataInicio', dataInicio).set('dataFim', dataFim);
    return this.http.get<PainelFinanceiro>(this.caminho() + '/relatorios/painel-financeiro', { params });
  }

  fluxoCaixa(contaId: number, dataInicio: string, dataFim: string) {
    const params = new HttpParams().set('dataInicio', dataInicio).set('dataFim', dataFim);
    return this.http.get<FluxoCaixaConta>(
      this.caminho() + '/contas-financeiras/' + contaId + '/fluxo-caixa', { params });
  }

  fluxoCaixaConsolidado(contasSelecionadas: number[], dataInicio: string, dataFim: string) {
    let params = new HttpParams().set('dataInicio', dataInicio).set('dataFim', dataFim);
    for (const contaId of contasSelecionadas) {
      params = params.append('contaId', String(contaId));
    }
    return this.http.get<FluxoCaixaConsolidado>(
      this.caminho() + '/relatorios/fluxo-caixa-consolidado', { params });
  }

  despesasPorCategoria(dataInicio: string, dataFim: string) {
    const params = new HttpParams().set('dataInicio', dataInicio).set('dataFim', dataFim);
    return this.http.get<TotalCategoria[]>(this.caminho() + '/relatorios/despesas-por-categoria', { params });
  }
}
