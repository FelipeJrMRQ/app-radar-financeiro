import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartaoPainel } from '../../models/painel-cartoes.model';
import { MeusCartoesCardComponent } from './meus-cartoes.component';

describe('Meus cartões no dashboard', () => {
  const cartao: CartaoPainel = {
    cartaoCreditoId: 7,
    nome: 'Cartão de teste',
    competencia: '2026-10-01',
    dataFechamento: '2026-10-25',
    dataVencimento: '2026-11-05',
    limiteTotal: '8000.00',
    limiteComprometidoEstimado: '4800.00',
    limiteDisponivelEstimado: '3200.00',
    percentualUtilizacao: 60,
    totalFatura: '2450.00',
    totalPago: '0',
    saldoRestante: '2450.00',
    situacaoFatura: 'EM_ABERTO',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeusCartoesCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('apresenta fatura, limite, ciclo e link para o cartão', () => {
    const fixture = TestBed.createComponent(MeusCartoesCardComponent);
    fixture.componentRef.setInput('cartoes', [cartao]);
    fixture.componentRef.setInput('competencia', '2026-10');
    fixture.componentRef.setInput('valoresVisiveis', true);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const texto = (raiz.textContent ?? '').replaceAll('\u00A0', ' ');
    expect(texto).toContain('R$ 2.450,00');
    expect(texto).toContain('R$ 3.200,00');
    expect(texto).toContain('R$ 8.000,00');
    expect(raiz.textContent).toContain('60%');
    expect(raiz.querySelector('a[href="/cartoes/7"]')).not.toBeNull();
    expect(raiz.textContent).not.toContain('Restante a pagar');
  });

  it('exibe restante a pagar apenas após pagamento parcial', () => {
    const fixture = TestBed.createComponent(MeusCartoesCardComponent);
    fixture.componentRef.setInput('cartoes', [{
      ...cartao, totalPago: '400.00', saldoRestante: '2050.00',
    }]);
    fixture.componentRef.setInput('competencia', '2026-10');
    fixture.detectChanges();
    const texto = ((fixture.nativeElement as HTMLElement).textContent ?? '').replaceAll('\u00A0', ' ');
    expect(texto).toContain('Fatura do mês');
    expect(texto).toContain('R$ 2.450,00');
    expect(texto).toContain('Restante a pagar: R$ 2.050,00');
  });

  it('não repete zero ou total em faturas vazias e sem pagamentos', () => {
    const fixture = TestBed.createComponent(MeusCartoesCardComponent);
    fixture.componentRef.setInput('cartoes', [{
      ...cartao, totalFatura: '0.00', totalPago: '0.00',
      saldoRestante: '0.00', situacaoFatura: 'SEM_MOVIMENTACAO',
    }]);
    fixture.componentRef.setInput('competencia', '2026-10');
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Sem compras');
    expect(texto).not.toContain('Restante a pagar');
  });

  it('não duplica saldo de fatura quitada; status informa a quitação', () => {
    const fixture = TestBed.createComponent(MeusCartoesCardComponent);
    fixture.componentRef.setInput('cartoes', [{
      ...cartao, totalPago: '2450.00', saldoRestante: '0.00',
      situacaoFatura: 'QUITADA',
    }]);
    fixture.componentRef.setInput('competencia', '2026-10');
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Quitada');
    expect(texto).not.toContain('Restante a pagar');
  });

  it('respeita privacidade ao exibir saldo após pagamento parcial', () => {
    const fixture = TestBed.createComponent(MeusCartoesCardComponent);
    fixture.componentRef.setInput('cartoes', [{
      ...cartao, totalPago: '400.00', saldoRestante: '2050.00',
    }]);
    fixture.componentRef.setInput('competencia', '2026-10');
    fixture.componentRef.setInput('valoresVisiveis', false);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Restante a pagar');
    expect(texto).not.toContain('2.050,00');
    expect(texto).toContain('••••••');
  });

  it('não revela valores nem percentual visual se privacidade estiver ativa', () => {
    const fixture = TestBed.createComponent(MeusCartoesCardComponent);
    fixture.componentRef.setInput('cartoes', [cartao]);
    fixture.componentRef.setInput('competencia', '2026-10');
    fixture.componentRef.setInput('valoresVisiveis', false);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).not.toContain('2.450,00');
    expect(raiz.textContent).not.toContain('3.200,00');
    expect(raiz.textContent).not.toContain('60%');
    expect(raiz.textContent).toContain('••••••');
    expect((raiz.querySelector('.rf-cartao-progresso > div') as HTMLElement).style.width).toBe('0%');
    expect(raiz.querySelector('.rf-cartao-progresso')?.getAttribute('aria-valuenow')).toBeNull();
  });

  const outroCartao: CartaoPainel = {
    ...cartao, cartaoCreditoId: 9, nome: 'Cartão Itaú',
    totalFatura: '850.00', limiteDisponivelEstimado: '4500.00',
    percentualUtilizacao: 25,
  };

  it('mostra somente um cartão por vez e alterna pelos controles, sem navegar para outra página', () => {
    const fixture = TestBed.createComponent(MeusCartoesCardComponent);
    fixture.componentRef.setInput('cartoes', [cartao, outroCartao]);
    fixture.componentRef.setInput('competencia', '2026-10');
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelectorAll('.rf-cartao-item').length).toBe(1);
    expect(raiz.textContent).toContain('Cartão de teste');
    expect(raiz.textContent).not.toContain('Cartão Itaú');
    expect(raiz.textContent).toContain('1 de 2');
    expect(raiz.querySelector('a[href="/cartoes/7"]')).not.toBeNull();
    expect(raiz.querySelector('a[href="/cartoes"]')).toBeNull();

    (raiz.querySelector('button[aria-label="Próximo cartão"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(raiz.querySelectorAll('.rf-cartao-item').length).toBe(1);
    expect(raiz.textContent).toContain('Cartão Itaú');
    expect(raiz.textContent).not.toContain('Cartão de teste');
    expect(raiz.textContent).toContain('2 de 2');
    expect(raiz.querySelector('a[href="/cartoes/9"]')).not.toBeNull();

    (raiz.querySelector('button[aria-label="Próximo cartão"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(raiz.textContent).toContain('1 de 2');
    expect(raiz.textContent).toContain('Cartão de teste');

    (raiz.querySelector('button[aria-label="Cartão anterior"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(raiz.textContent).toContain('2 de 2');
    expect(raiz.textContent).toContain('Cartão Itaú');
  });

  it('oculta a navegação quando só há um cartão', () => {
    const fixture = TestBed.createComponent(MeusCartoesCardComponent);
    fixture.componentRef.setInput('cartoes', [cartao]);
    fixture.componentRef.setInput('competencia', '2026-10');
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.rf-cartoes-navegacao')).toBeNull();
    expect(raiz.querySelectorAll('.rf-cartao-item').length).toBe(1);
    expect(raiz.querySelector('a[href="/cartoes/7"]')).not.toBeNull();
  });

  it('preserva cartão escolhido ao atualizar dados e competência', () => {
    const fixture = TestBed.createComponent(MeusCartoesCardComponent);
    fixture.componentRef.setInput('cartoes', [cartao, outroCartao]);
    fixture.componentRef.setInput('competencia', '2026-10');
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    (raiz.querySelector('button[aria-label="Próximo cartão"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(raiz.textContent).toContain('Cartão Itaú');

    fixture.componentRef.setInput('cartoes', [
      { ...outroCartao, totalFatura: '950.00', competencia: '2026-11-01' },
      { ...cartao, competencia: '2026-11-01' },
    ]);
    fixture.componentRef.setInput('competencia', '2026-11');
    fixture.detectChanges();
    expect(raiz.querySelectorAll('.rf-cartao-item').length).toBe(1);
    expect(raiz.textContent).toContain('Cartão Itaú');
    expect(raiz.textContent).toContain('1 de 2');
    expect(raiz.querySelector('a[href="/cartoes/9"]')).not.toBeNull();
    expect((raiz.textContent ?? '').replaceAll('\u00A0', ' ')).toContain('R$ 950,00');
  });

  it('retorna ao primeiro cartão se o selecionado foi removido', () => {
    const fixture = TestBed.createComponent(MeusCartoesCardComponent);
    fixture.componentRef.setInput('cartoes', [cartao, outroCartao]);
    fixture.componentRef.setInput('competencia', '2026-10');
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    (raiz.querySelector('button[aria-label="Próximo cartão"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    fixture.componentRef.setInput('cartoes', [cartao]);
    fixture.detectChanges();
    expect(raiz.textContent).toContain('Cartão de teste');
    expect(raiz.querySelector('.rf-cartoes-navegacao')).toBeNull();
    expect(raiz.querySelector('a[href="/cartoes/7"]')).not.toBeNull();
  });

  it('mantém a privacidade ao trocar de cartão', () => {
    const fixture = TestBed.createComponent(MeusCartoesCardComponent);
    fixture.componentRef.setInput('cartoes', [cartao, outroCartao]);
    fixture.componentRef.setInput('competencia', '2026-10');
    fixture.componentRef.setInput('valoresVisiveis', false);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    (raiz.querySelector('button[aria-label="Próximo cartão"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(raiz.textContent).toContain('Cartão Itaú');
    expect(raiz.textContent).not.toContain('850,00');
    expect(raiz.textContent).not.toContain('4.500,00');
    expect(raiz.textContent).toContain('••••••');
    expect(raiz.querySelector('.rf-cartao-progresso')?.getAttribute('aria-valuenow')).toBeNull();
  });

  it('oferece cadastro quando não há cartões', () => {
    const fixture = TestBed.createComponent(MeusCartoesCardComponent);
    fixture.componentRef.setInput('cartoes', []);
    fixture.componentRef.setInput('competencia', '2026-10');
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Você ainda não possui cartões ativos.');
    expect(raiz.querySelector('a[href="/cartoes/novo"]')).not.toBeNull();
  });
});
