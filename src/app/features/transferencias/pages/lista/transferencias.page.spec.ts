import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { dataHojeLocal } from '../../../../shared/valor-monetario';
import { TransferenciasService } from '../../services/transferencias.service';
import { TransferenciasPage } from './transferencias.page';

describe('TransferenciasPage', () => {
  const listar = jasmine.createSpy('listar');
  const confirmar = jasmine.createSpy('confirmar').and.returnValue(of({ id: 3, situacao: 'CONFIRMADO' }));
  const excluir = jasmine.createSpy('excluir').and.returnValue(of(undefined));

  beforeEach(async () => {
    listar.calls.reset();
    confirmar.calls.reset();
    excluir.calls.reset();
    const hoje = dataHojeLocal();
    listar.and.returnValue(of([{
      id: 3, contaOrigemId: 1, contaOrigemNome: 'Itaú',
      contaDestinoId: 2, contaDestinoNome: 'Mercado Pago',
      valor: '150.00', dataTransferencia: hoje,
      descricao: 'Mover saldo', observacao: null, situacao: 'PREVISTO',
      valorEfetivo: null, dataEfetiva: null, ativo: true,
      criadoEm: '', atualizadoEm: '',
    }]));
    await TestBed.configureTestingModule({
      imports: [TransferenciasPage],
      providers: [
        provideRouter([]),
        { provide: TransferenciasService, useValue: { listar, confirmar, excluir } },
      ],
    }).compileComponents();
  });

  it('respeita o mês solicitado na navegação após cadastrar', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: convertToParamMap({ mes: '2027-03' }) } },
    });
    const pagina = TestBed.createComponent(TransferenciasPage).componentInstance;
    expect(pagina.mes().getFullYear()).toBe(2027);
    expect(pagina.mes().getMonth()).toBe(2);
  });

  it('mostra transferência como movimentação entre contas, não receita/despesa', async () => {
    const fixture = TestBed.createComponent(TransferenciasPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Itaú → Mercado Pago');
    expect(root.textContent).toContain('Prevista');
    expect(root.textContent).toContain('R$');
    fixture.destroy();
  });

  it('bloqueia confirmação com data futura e permite confirmar com data atual', async () => {
    const fixture = TestBed.createComponent(TransferenciasPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const pagina = fixture.componentInstance;
    pagina.prepararAcao(pagina.lista()[0], 'CONFIRMAR');
    pagina.dataEfetiva.setValue('2999-12-31');
    await pagina.executarAcao();
    expect(confirmar).not.toHaveBeenCalled();
    expect(pagina.erroAcao()).toContain('não futura');

    pagina.dataEfetiva.setValue(dataHojeLocal());
    pagina.valorEfetivo.setValue('150,00');
    await pagina.executarAcao();
    expect(confirmar).toHaveBeenCalledWith(3, {
      valorEfetivo: '150.00', dataEfetiva: dataHojeLocal(),
    });
    fixture.destroy();
  });

  it('exige confirmação explícita antes da exclusão', async () => {
    const fixture = TestBed.createComponent(TransferenciasPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const pagina = fixture.componentInstance;
    expect(excluir).not.toHaveBeenCalled();
    pagina.prepararAcao(pagina.lista()[0], 'EXCLUIR');
    expect(excluir).not.toHaveBeenCalled();
    await pagina.executarAcao();
    expect(excluir).toHaveBeenCalledOnceWith(3);
    fixture.destroy();
  });
});
