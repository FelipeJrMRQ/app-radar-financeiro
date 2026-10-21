import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { PainelFinanceiroService } from './painel-financeiro.service';

describe('PainelFinanceiroService', () => {
  let api: PainelFinanceiroService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PainelFinanceiroService, provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { obterIdEspacoAtual: () => 42 } },
      ],
    });
    api = TestBed.inject(PainelFinanceiroService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('consulta pendências e saldos agregados na API, nunca em cálculo local', async () => {
    const result = firstValueFrom(api.consultar('2026-10-01', '2026-10-31'));
    const req = http.expectOne((r) =>
      r.url === '/api/espacos-financeiros/42/relatorios/painel-financeiro'
      && r.params.get('dataInicio') === '2026-10-01'
      && r.params.get('dataFim') === '2026-10-31',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ aReceberPeriodo: 1250, aPagarPeriodo: 900, contas: [], proximosVencimentos: [] });
    expect((await result).aReceberPeriodo).toBe(1250);
  });


  it('consulta consolidado com todas as contas selecionadas em parâmetros repetidos', async () => {
    const promise = firstValueFrom(api.fluxoCaixaConsolidado(
      [13, 29], '2026-10-01', '2026-10-31'));
    const req = http.expectOne((r) => r.url ===
      '/api/espacos-financeiros/42/relatorios/fluxo-caixa-consolidado');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('dataInicio')).toBe('2026-10-01');
    expect(req.request.params.get('dataFim')).toBe('2026-10-31');
    expect(req.request.params.getAll('contaId')).toEqual(['13', '29']);
    req.flush({
      dataInicio: '2026-10-01', dataFim: '2026-10-31',
      dataHoje: '2026-10-20', saldoHoje: -200, saldoFinal: 500,
      contas: [], pontos: [{
        data: '2026-10-20', saldo: -200, situacao: 'REALIZADO',
      }],
    });
    expect((await promise).saldoHoje).toBe(-200);
  });

  it('consulta fluxo de caixa por conta selecionada', async () => {
    const promise = firstValueFrom(api.fluxoCaixa(13, '2026-10-01', '2026-10-31'));
    const req = http.expectOne((r) => r.url ===
      '/api/espacos-financeiros/42/contas-financeiras/13/fluxo-caixa');
    expect(req.request.params.get('dataFim')).toBe('2026-10-31');
    req.flush({ contaFinanceiraId: 13, pontos: [] });
    expect((await promise).pontos).toEqual([]);
  });
});
