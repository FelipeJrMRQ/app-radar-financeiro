import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ConfirmarTransferencia, GravarTransferencia, Transferencia } from '../models/transferencia.model';

@Injectable({ providedIn: 'root' })
export class TransferenciasService {
  private readonly http = inject(HttpClient);
  private readonly autenticacao = inject(AuthService);

  private endpoint(): string {
    const espacoId = this.autenticacao.obterIdEspacoAtual();
    if (espacoId === null) throw new Error('Contexto financeiro indisponível.');
    return `${API_BASE_URL}/espacos-financeiros/${espacoId}/transferencias`;
  }

  listar(): Observable<Transferencia[]> {
    return this.http.get<Transferencia[]>(this.endpoint());
  }

  buscar(id: number): Observable<Transferencia> {
    return this.http.get<Transferencia>(`${this.endpoint()}/${id}`);
  }

  criar(dados: GravarTransferencia): Observable<Transferencia> {
    return this.http.post<Transferencia>(this.endpoint(), dados);
  }

  atualizar(id: number, dados: GravarTransferencia): Observable<Transferencia> {
    return this.http.put<Transferencia>(`${this.endpoint()}/${id}`, dados);
  }

  confirmar(id: number, dados: ConfirmarTransferencia): Observable<Transferencia> {
    return this.http.post<Transferencia>(`${this.endpoint()}/${id}/confirmacao`, dados);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint()}/${id}`);
  }
}
