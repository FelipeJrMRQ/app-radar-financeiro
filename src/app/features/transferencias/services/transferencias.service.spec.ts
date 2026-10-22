import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { TransferenciasService } from './transferencias.service';

describe('TransferenciasService', () => {
  let api: TransferenciasService;
  let http: HttpTestingController;
  const base = '/api/espacos-financeiros/42/transferencias';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TransferenciasService, provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { obterIdEspacoAtual: () => 42 } },
      ],
    });
    api = TestBed.inject(TransferenciasService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('usa o espaço autenticado na listagem e consulta por ID', async () => {
    const lista = firstValueFrom(api.listar());
    const get = http.expectOne(base);
    expect(get.request.method).toBe('GET');
    get.flush([]);
    expect(await lista).toEqual([]);
    const busca = firstValueFrom(api.buscar(7));
    http.expectOne(base + '/7').flush({ id: 7, situacao: 'PREVISTO' });
    expect((await busca).id).toBe(7);
  });

  it('envia valor decimal como texto exato no cadastro e edição', async () => {
    const dados = {
      contaOrigemId: 3, contaDestinoId: 5, valor: '1234.5678',
      dataTransferencia: '2026-10-25', descricao: 'Reserva', observacao: null,
    };
    const criando = firstValueFrom(api.criar(dados));
    const post = http.expectOne(base);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(dados);
    post.flush({ id: 10, ...dados });
    expect((await criando).id).toBe(10);
    const editando = firstValueFrom(api.atualizar(10, dados));
    const put = http.expectOne(base + '/10');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.valor).toBe('1234.5678');
    put.flush({ id: 10, ...dados });
    expect((await editando).id).toBe(10);
  });

  it('usa confirmação distinta com data e valor efetivos e exclusão lógica', async () => {
    const confirmar = firstValueFrom(api.confirmar(10, { valorEfetivo: '120.00', dataEfetiva: '2026-10-20' }));
    const post = http.expectOne(base + '/10/confirmacao');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ valorEfetivo: '120.00', dataEfetiva: '2026-10-20' });
    post.flush({ id: 10, situacao: 'CONFIRMADO' });
    expect((await confirmar).situacao).toBe('CONFIRMADO');
    const excluir = firstValueFrom(api.excluir(10));
    const del = http.expectOne(base + '/10');
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    await excluir;
  });
});
