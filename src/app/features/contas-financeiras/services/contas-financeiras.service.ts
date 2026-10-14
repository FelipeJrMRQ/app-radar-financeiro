import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  ContaFinanceira,
  CriarContaFinanceira,
  ExtratoContaFinanceira,
  SaldoContaFinanceira,
} from '../models/contas-financeiras.model';

@Injectable({ providedIn: 'root' })
export class ContasFinanceirasService {
  private readonly http = inject(HttpClient);
  private readonly autenticacao = inject(AuthService);

  private caminho(): string {
    const espacoId = this.autenticacao.obterIdEspacoAtual();
    if (espacoId === null) throw new Error('Contexto financeiro indisponível.');
    return API_BASE_URL + '/espacos-financeiros/' + espacoId + '/contas-financeiras';
  }

  listar(): Observable<ContaFinanceira[]> {
    return this.http.get<ContaFinanceira[]>(this.caminho());
  }

  buscar(id: number): Observable<ContaFinanceira> {
    return this.http.get<ContaFinanceira>(this.caminho() + '/' + id);
  }

  criar(dados: CriarContaFinanceira): Observable<ContaFinanceira> {
    return this.http.post<ContaFinanceira>(this.caminho(), dados);
  }

  consultarSaldo(id: number): Observable<SaldoContaFinanceira> {
    return this.http.get<SaldoContaFinanceira>(this.caminho() + '/' + id + '/saldo');
  }

  consultarExtrato(id: number, dataInicio: string, dataFim: string): Observable<ExtratoContaFinanceira> {
    const params = new HttpParams().set('dataInicio', dataInicio).set('dataFim', dataFim);
    return this.http.get<ExtratoContaFinanceira>(this.caminho() + '/' + id + '/extrato', { params });
  }
}
