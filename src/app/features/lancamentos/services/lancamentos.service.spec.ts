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



  it('consulta período e soma da API com os mesmos filtros de tipo e conta', async () => {
    const filtros = {
      contaFinanceiraId: 5, tipo: 'RECEITA' as const,
      dataInicio: '2026-10-01', dataFim: '2026-10-31',
    };
    const lista = firstValueFrom(api.listarPeriodo(filtros));
    const resumo = firstValueFrom(api.resumirPeriodo(filtros));
    const chamadas = http.match(r => r.url.startsWith('/api/espacos-financeiros/7/lancamentos'));
    expect(chamadas.length).toBe(2);
    for (const req of chamadas) {
      expect(req.request.params.get('tipo')).toBe('RECEITA');
      expect(req.request.params.get('dataInicio')).toBe('2026-10-01');
      expect(req.request.params.get('dataFim')).toBe('2026-10-31');
      expect(req.request.params.get('contaFinanceiraId')).toBe('5');
      req.flush(req.request.url.endsWith('/resumo-periodo') ?
        { totalLancado: '250.0000', dataInicio: '2026-10-01', dataFim: '2026-10-31' } : []);
    }
    expect(await lista).toEqual([]);
    expect((await resumo).totalLancado).toBe('250.0000');
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


  it('consulta dados e encaminha edição individual do registro retroativo', async () => {
    const dados = {
      contaFinanceiraId: 2, categoriaId: 3, descricao: 'Mercado corrigido',
      valor: '81.2500', dataLancamento: '2026-09-02', observacao: null,
    };
    const resposta = firstValueFrom(api.editar(17, dados));
    const req = http.expectOne('/api/espacos-financeiros/7/lancamentos/17');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dados);
    expect(req.request.body.valor).toBe('81.2500');
    req.flush({ id: 17 });
    expect((await resposta).id).toBe(17);
  });

  it('dirige edição e exclusão em sequência à rota correta conforme modalidade', async () => {
    const dados = {
      contaFinanceiraId: 2, categoriaId: 3, descricao: 'Prestação',
      valor: '200.0000', dataLancamento: '2026-11-15', observacao: null,
    };
    const recorrente = firstValueFrom(api.editar(8, dados, 'SEGUINTES', false));
    const reqRec = http.expectOne('/api/espacos-financeiros/7/lancamentos/8/esta-e-proximas');
    expect(reqRec.request.method).toBe('PUT');
    reqRec.flush({ id: 8 });
    await recorrente;

    const parcelado = firstValueFrom(api.editar(8, dados, 'SEGUINTES', true));
    const reqPar = http.expectOne('/api/espacos-financeiros/7/lancamentos/8/parcelas-restantes');
    expect(reqPar.request.method).toBe('PUT');
    reqPar.flush({ id: 8 });
    await parcelado;

    const excluir = firstValueFrom(api.excluir(8, 'SEGUINTES', true));
    const reqEx = http.expectOne('/api/espacos-financeiros/7/lancamentos/8/parcelas-restantes');
    expect(reqEx.request.method).toBe('DELETE');
    reqEx.flush(null);
    await excluir;
  });


  it('confirma integralmente sem enviar valor e permite desfazer confirmação direta', async () => {
    const promise = firstValueFrom(api.confirmarAutomaticamente(21));
    const req = http.expectOne('/api/espacos-financeiros/7/lancamentos/21/confirmacao-automatica');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ id: 21, situacao: 'CONFIRMADO', valorEfetivo: '100.0000' });
    expect((await promise).situacao).toBe('CONFIRMADO');

    const estorno = firstValueFrom(api.desfazerConfirmacao(21));
    const del = http.expectOne('/api/espacos-financeiros/7/lancamentos/21/estorno-confirmacao');
    expect(del.request.method).toBe('POST');
    expect(del.request.body).toBeNull();
    del.flush({ id: 21, situacao: 'PREVISTO' });
    expect((await estorno).situacao).toBe('PREVISTO');
  });

  it('confirma apenas o lançamento selecionado e aceita valor efetivo textual', async () => {
    const dados = { valorEfetivo: '1050.5678', dataEfetiva: '2026-10-14' };
    const result = firstValueFrom(api.confirmar(12, dados));
    const req = http.expectOne('/api/espacos-financeiros/7/lancamentos/12/confirmacao');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dados);
    req.flush({ id: 12, situacao: 'CONFIRMADO' });
    expect((await result).situacao).toBe('CONFIRMADO');
  });

  it('realiza parcialmente e permite estornar só a realização selecionada', async () => {
    const parc = firstValueFrom(api.realizarParcialmente(11, {
      valorEfetivo: '25.7500', dataEfetiva: '2026-10-14',
    }));
    const r = http.expectOne('/api/espacos-financeiros/7/lancamentos/11/realizacoes');
    expect(r.request.method).toBe('POST');
    r.flush({ lancamentoId: 11, saldoRestante: '74.25', realizacoes: [] });
    expect((await parc).saldoRestante).toBe('74.25');

    const estorno = firstValueFrom(api.estornar(11, 6));
    const del = http.expectOne('/api/espacos-financeiros/7/lancamentos/11/realizacoes/6');
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    await estorno;
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
