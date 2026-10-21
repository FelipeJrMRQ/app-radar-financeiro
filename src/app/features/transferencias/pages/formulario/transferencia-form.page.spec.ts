import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { ContasFinanceirasService } from '../../../contas-financeiras/services/contas-financeiras.service';
import { TransferenciasService } from '../../services/transferencias.service';
import { TransferenciaFormPage } from './transferencia-form.page';

describe('TransferenciaFormPage', () => {
  const contas = [
    { id: 1, nome: 'Itaú', ativo: true },
    { id: 2, nome: 'Mercado Pago', ativo: true },
  ];
  const criar = jasmine.createSpy('criar').and.returnValue(of({ id: 7 }));
  const listar = jasmine.createSpy('listar').and.returnValue(of(contas));

  beforeEach(async () => {
    criar.calls.reset();
    listar.calls.reset();
    await TestBed.configureTestingModule({
      imports: [TransferenciaFormPage],
      providers: [
        provideRouter([]),
        { provide: ContasFinanceirasService, useValue: { listar } },
        { provide: TransferenciasService, useValue: { criar } },
      ],
    }).compileComponents();
  });

  it('rejeita transferência para a própria conta sem chamar a API', async () => {
    const fixture = TestBed.createComponent(TransferenciaFormPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const pagina = fixture.componentInstance;
    pagina.form.patchValue({
      contaOrigemId: 1, contaDestinoId: 1, valor: '50,00', descricao: 'Reserva',
    });
    await pagina.salvar();
    expect(criar).not.toHaveBeenCalled();
    expect(pagina.erroValidacao()).toContain('contas diferentes');
    fixture.destroy();
  });

  it('salva decimal exato e contas diferentes sem gerar receita ou despesa', async () => {
    const fixture = TestBed.createComponent(TransferenciaFormPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const pagina = fixture.componentInstance;
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    pagina.form.patchValue({
      contaOrigemId: 1, contaDestinoId: 2, valor: '1.234,56',
      dataTransferencia: '2026-10-21', descricao: '  Reserva mensal  ',
      observacao: ' ',
    });
    await pagina.salvar();
    expect(criar).toHaveBeenCalledOnceWith({
      contaOrigemId: 1, contaDestinoId: 2, valor: '1234.56',
      dataTransferencia: '2026-10-21', descricao: 'Reserva mensal', observacao: null,
    });
    expect(navigate).toHaveBeenCalledWith(['/transferencias'], { queryParams: { resultado: 'criada' } });
    fixture.destroy();
  });
});
