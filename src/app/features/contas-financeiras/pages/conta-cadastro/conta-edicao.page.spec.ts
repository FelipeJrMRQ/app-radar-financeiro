import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { ContasFinanceirasService } from '../../services/contas-financeiras.service';
import { ContaNovaPage } from './conta-nova.page';

describe('Edição de conta financeira', () => {
  let buscar: jasmine.Spy;
  let atualizar: jasmine.Spy;
  let router: Router;

  beforeEach(async () => {
    buscar = jasmine.createSpy('buscar').and.returnValue(of({
      id: 9, nome: 'Nome antigo', tipo: 'CONTA_CORRENTE',
      saldoInicial: '100.5000', ativo: true, criadoEm: '', atualizadoEm: '',
    }));
    atualizar = jasmine.createSpy('atualizar').and.returnValue(of({
      id: 9, nome: 'Conta corrigida', tipo: 'POUPANCA',
      saldoInicial: '100.5000', ativo: true, criadoEm: '', atualizadoEm: '',
    }));
    await TestBed.configureTestingModule({
      imports: [ContaNovaPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {
          snapshot: { paramMap: convertToParamMap({ contaId: '9' }) },
        } },
        { provide: ContasFinanceirasService, useValue: { buscar, atualizar } },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  it('preenche dados do backend e não altera precisão do saldo sem edição', async () => {
    const fixture = TestBed.createComponent(ContaNovaPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const pagina = fixture.componentInstance;
    expect(buscar).toHaveBeenCalledOnceWith(9);
    expect(pagina.editando).toBeTrue();
    expect(pagina.formulario.controls.nome.value).toBe('Nome antigo');
    expect(pagina.formulario.controls.saldoInicial.value).toBe('100,5000');
    expect(pagina.saldoAlterado()).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Editar conta financeira');
  });

  it('obriga confirmação ao corrigir saldo inicial e envia decimal exato', async () => {
    const fixture = TestBed.createComponent(ContaNovaPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const pagina = fixture.componentInstance;
    pagina.formulario.patchValue({
      nome: 'Conta corrigida', tipo: 'POUPANCA', saldoInicial: '-1.234,5678',
    });
    fixture.detectChanges();
    expect(pagina.saldoAlterado()).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Atenção à correção');
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[type="submit"]')?.disabled).toBeTrue();

    await pagina.salvar();
    expect(atualizar).not.toHaveBeenCalled();
    pagina.confirmouMudancaSaldo.set(true);
    await pagina.salvar();

    expect(atualizar).toHaveBeenCalledOnceWith(9, {
      nome: 'Conta corrigida', tipo: 'POUPANCA', saldoInicial: '-1234.5678',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/contas', 9], {
      queryParams: { resultado: 'atualizada' },
    });
  });

  it('permite corrigir somente o nome sem confirmar mudança de saldo', async () => {
    const fixture = TestBed.createComponent(ContaNovaPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const pagina = fixture.componentInstance;
    pagina.formulario.controls.nome.setValue('Conta corrigida');
    await pagina.salvar();

    expect(pagina.saldoAlterado()).toBeFalse();
    expect(atualizar).toHaveBeenCalledWith(9, jasmine.objectContaining({
      nome: 'Conta corrigida', saldoInicial: '100.5000',
    }));
  });
});
