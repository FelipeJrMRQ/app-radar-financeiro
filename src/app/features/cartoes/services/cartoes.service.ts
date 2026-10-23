import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { CartaoPainel } from '../../dashboard/models/painel-cartoes.model';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  CartaoCredito, DadosCartaoCredito, CompraCartao, DadosCompraCartao, DadosCompraParcelada,
  CompraParceladaResultado, FaturaCartao, FaturaResumo, PagamentoFatura, ParcelaCompra, ResumoPagamentos,
} from '../models/cartao.model';

@Injectable({ providedIn: 'root' })
export class CartoesService {
  private readonly http = inject(HttpClient);
  private readonly autenticacao = inject(AuthService);

  private endpoint(): string {
    const id = this.autenticacao.obterIdEspacoAtual();
    if (id === null) throw new Error('Contexto financeiro indisponível.');
    return `${API_BASE_URL}/espacos-financeiros/${id}/cartoes-credito`;
  }
  private cartao(id: number): string { return `${this.endpoint()}/${id}`; }
  private compras(id: number): string { return `${this.cartao(id)}/compras`; }
  private faturas(id: number): string { return `${this.cartao(id)}/faturas`; }

  consultarPainel(competencia: string): Observable<CartaoPainel[]> {
    const params = new HttpParams().set('competencia', competencia);
    return this.http.get<CartaoPainel[]>(this.endpoint() + '/painel', { params });
  }
  listar(): Observable<CartaoCredito[]> { return this.http.get<CartaoCredito[]>(this.endpoint()); }
  buscar(id: number): Observable<CartaoCredito> { return this.http.get<CartaoCredito>(this.cartao(id)); }
  criar(dados: DadosCartaoCredito): Observable<CartaoCredito> {
    return this.http.post<CartaoCredito>(this.endpoint(), dados);
  }
  atualizar(id: number, dados: DadosCartaoCredito): Observable<CartaoCredito> {
    return this.http.put<CartaoCredito>(this.cartao(id), dados);
  }
  inativar(id: number): Observable<void> { return this.http.delete<void>(this.cartao(id)); }

  listarCompras(id: number): Observable<CompraCartao[]> {
    return this.http.get<CompraCartao[]>(this.compras(id));
  }
  buscarCompra(id: number, compraId: number): Observable<CompraCartao> {
    return this.http.get<CompraCartao>(`${this.compras(id)}/${compraId}`);
  }
  comprar(id: number, dados: DadosCompraCartao): Observable<CompraCartao> {
    return this.http.post<CompraCartao>(this.compras(id), dados);
  }
  comprarParcelado(id: number, dados: DadosCompraParcelada): Observable<CompraParceladaResultado> {
    return this.http.post<CompraParceladaResultado>(this.compras(id) + '/parceladas', dados);
  }
  atualizarCompra(id: number, compraId: number, dados: DadosCompraCartao): Observable<CompraCartao> {
    return this.http.put<CompraCartao>(`${this.compras(id)}/${compraId}`, dados);
  }
  inativarCompra(id: number, compraId: number): Observable<void> {
    return this.http.delete<void>(`${this.compras(id)}/${compraId}`);
  }
  listarParcelas(id: number, compraId: number): Observable<ParcelaCompra[]> {
    return this.http.get<ParcelaCompra[]>(`${this.compras(id)}/${compraId}/parcelas`);
  }
  listarFaturas(id: number): Observable<FaturaResumo[]> {
    return this.http.get<FaturaResumo[]>(this.faturas(id));
  }
  gerarFatura(id: number, competencia: string): Observable<FaturaCartao> {
    return this.http.post<FaturaCartao>(`${this.faturas(id)}/${competencia}`, null);
  }
  buscarFatura(id: number, competencia: string): Observable<FaturaCartao> {
    return this.http.get<FaturaCartao>(`${this.faturas(id)}/${competencia}`);
  }
  listarPagamentos(id: number, competencia: string): Observable<ResumoPagamentos> {
    return this.http.get<ResumoPagamentos>(`${this.faturas(id)}/${competencia}/pagamentos`);
  }
  pagarParcialmente(id: number, competencia: string, dados: {
    contaFinanceiraId: number; valorPago: string; dataPagamento: string;
  }): Observable<ResumoPagamentos> {
    return this.http.post<ResumoPagamentos>(
      `${this.faturas(id)}/${competencia}/pagamentos`, dados);
  }
  pagarIntegral(id: number, competencia: string, dados: {
    contaFinanceiraId: number; dataPagamento: string;
  }): Observable<PagamentoFatura> {
    return this.http.post<PagamentoFatura>(
      `${this.faturas(id)}/${competencia}/pagamento`, dados);
  }
  estornarPagamento(id: number, competencia: string, pagamentoId: number): Observable<void> {
    return this.http.delete<void>(`${this.faturas(id)}/${competencia}/pagamentos/${pagamentoId}`);
  }
}
