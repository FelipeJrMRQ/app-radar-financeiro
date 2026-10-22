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
    expect(raiz.textContent).toContain('R$ 2.450,00');
    expect(raiz.textContent).toContain('R$ 3.200,00');
    expect(raiz.textContent).toContain('R$ 8.000,00');
    expect(raiz.textContent).toContain('60%');
    expect(raiz.querySelector('a[href="/cartoes/7"]')).not.toBeNull();
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
