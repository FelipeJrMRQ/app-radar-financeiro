import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ContasFinanceirasService } from './contas-financeiras.service';

describe('ContasFinanceirasService', () => {
  let api: ContasFinanceirasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ContasFinanceirasService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { obterIdEspacoAtual: () => 42 } },
      ],
    });
    api = TestBed.inject(ContasFinanceirasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista apenas no contexto financeiro interno do usuário', async () => {
    const request = firstValueFrom(api.listar());
    const chamada = http.expectOne('/api/espacos-financeiros/42/contas-financeiras');
    expect(chamada.request.method).toBe('GET');
    chamada.flush([]);
    expect(await request).toEqual([]);
  });

  it('cadastra saldo inicial como string decimal exata', async () => {
    const request = firstValueFrom(api.criar({
      nome: 'Minha conta', tipo: 'CONTA_CORRENTE', saldoInicial: '1234.5678',
    }));
    const chamada = http.expectOne('/api/espacos-financeiros/42/contas-financeiras');
    expect(chamada.request.method).toBe('POST');
    expect(chamada.request.body.saldoInicial).toBe('1234.5678');
    chamada.flush({
      id: 9, nome: 'Minha conta', tipo: 'CONTA_CORRENTE', saldoInicial: 1234.5678,
      ativo: true, criadoEm: '', atualizadoEm: '',
    });
    expect((await request).id).toBe(9);
  });

  it('consulta saldo retornado pelo backend sem recalcular', async () => {
    const request = firstValueFrom(api.consultarSaldo(9));
    const chamada = http.expectOne('/api/espacos-financeiros/42/contas-financeiras/9/saldo');
    chamada.flush({
      contaFinanceiraId: 9, contaFinanceiraNome: 'Minha conta', saldoInicial: 100,
      totalReceitas: 300, totalDespesas: 50,
      totalTransferenciasRecebidas: 0, totalTransferenciasEnviadas: 0,
      totalPagamentosFaturas: 0, saldoAtual: 350, saldoConfirmado: 350,
    });
    expect((await request).saldoConfirmado).toBe(350);
  });

  it('solicita somente o mês pedido no extrato', async () => {
    const request = firstValueFrom(api.consultarExtrato(9, '2026-10-01', '2026-10-31'));
    const chamada = http.expectOne((req) =>
      req.url === '/api/espacos-financeiros/42/contas-financeiras/9/extrato'
      && req.params.get('dataInicio') === '2026-10-01'
      && req.params.get('dataFim') === '2026-10-31',
    );
    expect(chamada.request.method).toBe('GET');
    chamada.flush({
      contaFinanceiraId: 9, contaFinanceiraNome: 'Minha conta', dataInicio: '2026-10-01',
      dataFim: '2026-10-31', saldoConfirmadoAnterior: 0, saldoProjetadoAnterior: 0,
      saldoConfirmadoFinal: 0, saldoProjetadoFinal: 0, movimentos: [],
    });
    expect((await request).movimentos).toEqual([]);
  });
});
