import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';

export interface ProgressoPrimeirosPassos {
  boasVindasConcluidas: boolean;
  primeiraContaConcluida: boolean;
  primeiroLancamentoConcluido: boolean;
  painelConhecido: boolean;
  dispensado: boolean;
  concluido: boolean;
}

export type AcaoPrimeirosPassos =
  | 'CONCLUIR_BOAS_VINDAS'
  | 'CONHECER_PAINEL'
  | 'PAUSAR'
  | 'RETOMAR';

@Injectable({ providedIn: 'root' })
export class PrimeirosPassosService {
  private readonly http = inject(HttpClient);
  private readonly endereco = API_BASE_URL + '/usuarios/me/primeiros-passos';

  consultar(): Observable<ProgressoPrimeirosPassos> {
    return this.http.get<ProgressoPrimeirosPassos>(this.endereco);
  }

  registrar(acao: AcaoPrimeirosPassos): Observable<ProgressoPrimeirosPassos> {
    return this.http.put<ProgressoPrimeirosPassos>(this.endereco, { acao });
  }
}
