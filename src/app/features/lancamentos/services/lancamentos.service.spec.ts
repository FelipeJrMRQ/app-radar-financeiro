import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { LancamentosService } from './lancamentos.service';

describe('LancamentosService', () => {
  let api: LancamentosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LancamentosService, provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { obterIdEspacoAtual: () => 7 } },
      ],
    });
    api = TestBed.inject(LancamentosService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('consulta todos os lançamentos no contexto interno', async () => {
    const retorno = firstValueFrom(api.listar());
    const req = http.expectOne('/api/espacos-financeiros/7/lancamentos');
    expect(req.request.params.keys().length).toBe(0);
    req.flush([]);
    expect(await retorno).toEqual([]);
  });

  it('envia filtro de conta sem expor seleção de espaço financeiro', async () => {
    const retorno = firstValueFrom(api.listar(11));
    const req = http.expectOne((r) =>
      r.url === '/api/espacos-financeiros/7/lancamentos'
      && r.params.get('contaFinanceiraId') === '11',
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
    await retorno;
  });


  it('encaminha recorrência mensal para endpoint próprio', async () => {
    const result = firstValueFrom(api.criarRecorrencia({
      contaFinanceiraId: 11, categoriaId: 3, descricao: 'Aluguel',
      valor: '1500.00', dataInicio: '2026-11-01', dataFim: null, observacao: null,
    }));
    const req = http.expectOne('/api/espacos-financeiros/7/recorrencias-lancamentos');
    expect(req.request.body.dataFim).toBeNull();
    req.flush({ id: 17 });
    await result;
  });

  it('encaminha parcelas para endpoint distinto dos lançamentos únicos', async () => {
    const result = firstValueFrom(api.criarParcelamento({
      contaFinanceiraId: 11, categoriaId: 3, descricao: 'Celular',
      valorTotal: '999.99', quantidadeParcelas: 3,
      primeiroVencimento: '2026-11-20', observacao: null,
    }));
    const req = http.expectOne('/api/espacos-financeiros/7/parcelamentos-lancamentos');
    expect(req.request.body.quantidadeParcelas).toBe(3);
    req.flush({ parcelamentoId: 3 });
    await result;
  });

  it('cria lançamento usando string decimal exata', async () => {
    const retorno = firstValueFrom(api.criar({
      contaFinanceiraId: 11, categoriaId: 3, descricao: 'Mercado',
      valor: '1234.5678', dataLancamento: '2026-10-14', observacao: null,
      situacaoInicial: 'PREVISTO',
    }));
    const req = http.expectOne('/api/espacos-financeiros/7/lancamentos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.valor).toBe('1234.5678');
    expect(req.request.body).not.toEqual(jasmine.objectContaining({ tipo: 'DESPESA' }));
    req.flush({ id: 12, situacao: 'CONFIRMADO' });
    expect((await retorno).situacao).toBe('CONFIRMADO');
  });
});
