import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import { Categoria, CriarCategoria } from '../models/categoria.model';

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private endpoint(): string {
    const id = this.auth.obterIdEspacoAtual();
    if (id === null) throw new Error('Contexto financeiro indisponível.');
    return API_BASE_URL + '/espacos-financeiros/' + id + '/categorias';
  }

  listar() {
    return this.http.get<Categoria[]>(this.endpoint());
  }

  criar(dados: CriarCategoria) {
    return this.http.post<Categoria>(this.endpoint(), dados);
  }
}
