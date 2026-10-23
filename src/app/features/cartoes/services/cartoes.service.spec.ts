import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { CartoesService } from './cartoes.service';

describe('CartoesService', () => {
  let api: CartoesService;
  let http: HttpTestingController;
  const base = '/api/espacos-financeiros/42/cartoes-credito';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { obterIdEspacoAtual: () => 42 } },
      ],
    });
    api = TestBed.inject(CartoesService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('sempre usa o espaco financeiro autenticado', () => {
    api.listar().subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('grava valor monetario como decimal exato no cadastro', () => {
    const dados = { nome: 'Cartão', limiteCredito: '1450.1234', diaFechamento: 10, diaVencimento: 18 };
    api.criar(dados).subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dados);
    expect(typeof req.request.body.limiteCredito).toBe('string');
    req.flush({ id: 1, ...dados, ativo: true });
  });

  it('envia compras parceladas sem calcular parcelas no Angular', () => {
    const dados = {
      categoriaId: 12, descricao: 'Notebook', valorTotal: '1250.07',
      dataCompra: '2026-10-10', quantidadeParcelas: 7, observacao: null,
    };
    api.comprarParcelado(5, dados).subscribe();
    const req = http.expectOne(base + '/5/compras/parceladas');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dados);
    req.flush({ compra: { id: 9, ...dados }, parcelas: [] });
  });

  it('consulta valores de faturas exclusivamente no backend', () => {
    api.buscarFatura(5, '2026-10').subscribe();
    const req = http.expectOne(base + '/5/faturas/2026-10');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 7, competencia: '2026-10-01', total: '1250.07', itens: [] });
  });

  it('registra pagamento parcial somente pela API, com valor decimal exato', () => {
    const dados = { contaFinanceiraId: 11, valorPago: '235.19', dataPagamento: '2026-10-20' };
    api.pagarParcialmente(5, '2026-10', dados).subscribe();
    const req = http.expectOne(base + '/5/faturas/2026-10/pagamentos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dados);
    req.flush({
      faturaCartaoId: 7, competencia: '2026-10-01', totalFatura: '400.00',
      totalPago: '235.19', saldoRestante: '164.81', quitada: false, pagamentos: [],
    });
  });

  it('envia estorno com identificador na rota correta', () => {
    api.estornarPagamento(5, '2026-10', 82).subscribe();
    const req = http.expectOne(base + '/5/faturas/2026-10/pagamentos/82');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
