import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PrivacidadeValoresService } from '../../../../core/privacidade/privacidade-valores.service';
import { dataHojeLocal } from '../../../../shared/valor-monetario';
import { ContasFinanceirasService } from '../../../contas-financeiras/services/contas-financeiras.service';
import { CartoesService } from '../../services/cartoes.service';
import { PagamentoFaturaPage } from './pagamento-fatura.page';

describe('Registro separado do pagamento de fatura', () => {
  const buscar = jasmine.createSpy('buscar');
  const buscarFatura = jasmine.createSpy('buscarFatura');
  const listarPagamentos = jasmine.createSpy('listarPagamentos');
  const pagarParcialmente = jasmine.createSpy('pagarParcialmente');
  const navegar = jasmine.createSpy('navigate').and.resolveTo(true);

  beforeEach(async () => {
    buscar.calls.reset();
    buscarFatura.calls.reset();
    listarPagamentos.calls.reset();
    pagarParcialmente.calls.reset();
    navegar.calls.reset();
    buscar.and.returnValue(of({ id: 5, nome: 'Nubank', ativo: true,
      limiteCredito: '3000', diaFechamento: 17, diaVencimento: 25 }));
    buscarFatura.and.returnValue(of({
      id: null, competencia: '2026-11-01', cartaoCreditoId: 5,
      cartaoCreditoNome: 'Nubank', total: '66.6666',
      dataFechamento: '2026-11-17', dataVencimento: '2026-11-25',
      itens: [], ativo: true,
    }));
    listarPagamentos.and.returnValue(of({
      faturaCartaoId: null, competencia: '2026-11-01',
      totalFatura: '66.6666', totalPago: '0',
      saldoRestante: '66.6666', quitada: false, pagamentos: [],
    }));
    pagarParcialmente.and.returnValue(of({
      faturaCartaoId: 8, competencia: '2026-11-01',
      totalFatura: '66.6666', totalPago: '66.6666',
      saldoRestante: '0', quitada: true, pagamentos: [],
    }));
    await TestBed.configureTestingModule({
      imports: [PagamentoFaturaPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: {
          paramMap: convertToParamMap({ cartaoId: '5', competencia: '2026-11' }),
          queryParamMap: convertToParamMap({}),
        } } },
        { provide: CartoesService, useValue: {
          buscar, buscarFatura, listarPagamentos, pagarParcialmente,
        } },
        { provide: ContasFinanceirasService, useValue: { listar: () => of([
          { id: 7, nome: 'Itaú', ativo: true },
          { id: 8, nome: 'Conta inativa', ativo: false },
        ]) } },
      ],
    }).compileComponents();
    spyOn(TestBed.inject(Router), 'navigate').and.callFake(navegar);
    TestBed.inject(PrivacidadeValoresService).definir(true);
  });

  async function montar(): Promise<ReturnType<typeof TestBed.createComponent<PagamentoFaturaPage>>> {
    const fixture = TestBed.createComponent(PagamentoFaturaPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('consulta a fatura e não registra nada ao abrir a tela', async () => {
    const fixture = await montar();
    expect(buscarFatura).toHaveBeenCalledOnceWith(5, '2026-11');
    expect(listarPagamentos).toHaveBeenCalledOnceWith(5, '2026-11');
    expect(pagarParcialmente).not.toHaveBeenCalled();
    const pagina = fixture.nativeElement as HTMLElement;
    expect(pagina.textContent).toContain('Registrar pagamento');
    expect(pagina.textContent).toContain('O Radar não envia dinheiro ao banco');
    expect(pagina.querySelector('a[href="/cartoes/5?competencia=2026-11"]')).not.toBeNull();
  });

  it('exige confirmação e envia o saldo exato da API para pagamento integral', async () => {
    const fixture = await montar();
    const pagina = fixture.componentInstance;
    pagina.form.patchValue({ contaFinanceiraId: 7, dataPagamento: dataHojeLocal() });
    pagina.prepararConfirmacao();
    fixture.detectChanges();
    expect(pagina.confirmando()).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Itaú');
    expect(pagarParcialmente).not.toHaveBeenCalled();

    await pagina.confirmarPagamento();
    expect(pagarParcialmente).toHaveBeenCalledOnceWith(5, '2026-11', {
      contaFinanceiraId: 7,
      valorPago: '66.6666',
      dataPagamento: dataHojeLocal(),
    });
    expect(navegar).toHaveBeenCalledWith(['/cartoes', 5], {
      queryParams: { competencia: '2026-11', resultado: 'pagamento-registrado' },
    });
  });

  it('bloqueia pagamento parcial maior que o saldo exato mesmo quando parece igual arredondado', async () => {
    const fixture = await montar();
    const pagina = fixture.componentInstance;
    pagina.selecionarModo('PARCIAL');
    pagina.form.patchValue({ contaFinanceiraId: 7,
      dataPagamento: dataHojeLocal(), valorPago: '66,67' });
    pagina.prepararConfirmacao();
    expect(pagina.confirmando()).toBeFalse();
    expect(pagina.erroFormulario()).toContain('não ultrapasse');
    expect(pagarParcialmente).not.toHaveBeenCalled();
  });

  it('registra pagamento parcial dentro do saldo somente após confirmação', async () => {
    const fixture = await montar();
    const pagina = fixture.componentInstance;
    pagina.selecionarModo('PARCIAL');
    pagina.form.patchValue({ contaFinanceiraId: 7,
      dataPagamento: dataHojeLocal(), valorPago: '20,01' });
    pagina.prepararConfirmacao();
    expect(pagina.confirmando()).toBeTrue();
    expect(pagarParcialmente).not.toHaveBeenCalled();
    await pagina.confirmarPagamento();
    expect(pagarParcialmente).toHaveBeenCalledWith(5, '2026-11',
      jasmine.objectContaining({ valorPago: '20.01', contaFinanceiraId: 7 }));
  });

  it('permite corrigir os dados sem registrar pagamento', async () => {
    const fixture = await montar();
    const pagina = fixture.componentInstance;
    pagina.form.patchValue({ contaFinanceiraId: 7, dataPagamento: dataHojeLocal() });
    pagina.prepararConfirmacao();
    pagina.voltarEdicao();
    expect(pagina.confirmando()).toBeFalse();
    expect(pagarParcialmente).not.toHaveBeenCalled();
  });

  it('rejeita conta inativa e data de pagamento futura', async () => {
    const fixture = await montar();
    const pagina = fixture.componentInstance;
    pagina.form.patchValue({ contaFinanceiraId: 8, dataPagamento: dataHojeLocal() });
    pagina.prepararConfirmacao();
    expect(pagina.confirmando()).toBeFalse();
    expect(pagina.erroFormulario()).toContain('conta financeira ativa');
    pagina.form.patchValue({ contaFinanceiraId: 7, dataPagamento: '2099-12-31' });
    pagina.prepararConfirmacao();
    expect(pagina.confirmando()).toBeFalse();
    expect(pagina.erroFormulario()).toContain('até hoje');
    expect(pagarParcialmente).not.toHaveBeenCalled();
  });

  it('não aceita registrar fatura sem saldo pendente', async () => {
    listarPagamentos.and.returnValue(of({
      faturaCartaoId: 8, competencia: '2026-11-01',
      totalFatura: '66.6666', totalPago: '66.6666',
      saldoRestante: '0', quitada: true, pagamentos: [],
    }));
    const fixture = await montar();
    fixture.componentInstance.form.patchValue({ contaFinanceiraId: 7 });
    fixture.componentInstance.prepararConfirmacao();
    expect(fixture.componentInstance.confirmando()).toBeFalse();
    expect(pagarParcialmente).not.toHaveBeenCalled();
  });

  it('não envia duas vezes ao confirmar durante gravação', async () => {
    const fixture = await montar();
    const pagina = fixture.componentInstance;
    pagina.form.patchValue({ contaFinanceiraId: 7, dataPagamento: dataHojeLocal() });
    pagina.prepararConfirmacao();
    const primeira = pagina.confirmarPagamento();
    const segunda = pagina.confirmarPagamento();
    await Promise.all([primeira, segunda]);
    expect(pagarParcialmente).toHaveBeenCalledTimes(1);
  });

  it('mantém dados para correção quando a API recusa o pagamento', async () => {
    pagarParcialmente.and.returnValue(throwError(() => ({ status: 409,
      error: { mensagem: 'Pagamento já registrado' } })));
    const fixture = await montar();
    const pagina = fixture.componentInstance;
    pagina.form.patchValue({ contaFinanceiraId: 7, dataPagamento: dataHojeLocal() });
    pagina.prepararConfirmacao();
    await pagina.confirmarPagamento();
    expect(pagina.confirmando()).toBeFalse();
    expect(pagina.erroFormulario()).not.toBeNull();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('não revela valores quando a privacidade está ativa', async () => {
    const fixture = await montar();
    TestBed.inject(PrivacidadeValoresService).ocultar();
    fixture.componentInstance.form.patchValue({ contaFinanceiraId: 7 });
    fixture.componentInstance.prepararConfirmacao();
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('66,67');
    expect(texto).toContain('••••••');
  });
});
