import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import {
  PrimeirosPassosService, ProgressoPrimeirosPassos,
} from '../../services/primeiros-passos.service';
import { PrimeirosPassosComponent } from './primeiros-passos.component';

describe('Primeiros passos de novos usuários', () => {
  const inicial: ProgressoPrimeirosPassos = {
    boasVindasConcluidas: false,
    primeiraContaConcluida: false,
    primeiroLancamentoConcluido: false,
    painelConhecido: false,
    dispensado: false,
    concluido: false,
  };
  let registrar: jasmine.Spy;

  async function montar(progresso: ProgressoPrimeirosPassos = inicial) {
    registrar = jasmine.createSpy('registrar').and.callFake((acao: string) =>
      of(acao === 'PAUSAR' ? { ...progresso, dispensado: true }
        : acao === 'RETOMAR' ? { ...progresso, dispensado: false }
        : acao === 'CONCLUIR_BOAS_VINDAS' ? { ...progresso, boasVindasConcluidas: true }
        : { ...progresso, painelConhecido: true }));
    await TestBed.configureTestingModule({
      imports: [PrimeirosPassosComponent],
      providers: [
        provideRouter([]),
        { provide: PrimeirosPassosService, useValue: {
          consultar: () => of(progresso), registrar,
        } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PrimeirosPassosComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('exibe os quatro passos e links corretos ao cadastrar', async () => {
    const fixture = await montar();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelectorAll('.passos-lista li')).toHaveSize(4);
    expect(raiz.querySelector('a[href="/contas/nova"]')).toBeTruthy();
    expect(raiz.querySelector('a[href="/lancamentos/novo"]')).toBeTruthy();
    expect(raiz.textContent).toContain('0 de 4 etapas');
    expect(raiz.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('0');
  });

  it('permite pausar e retomar sem apagar progresso', async () => {
    const fixture = await montar();
    const raiz = fixture.nativeElement as HTMLElement;
    (raiz.querySelector('.passos-pausar') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(registrar).toHaveBeenCalledWith('PAUSAR');
    expect(raiz.textContent).toContain('Retomar primeiros passos');
    (raiz.querySelector('.primeiros-passos-retomar button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(registrar).toHaveBeenCalledWith('RETOMAR');
    expect(raiz.querySelector('.passos-lista')).toBeTruthy();
  });

  it('não apresenta o tutorial a quem já o concluiu', async () => {
    const fixture = await montar({
      ...inicial, boasVindasConcluidas: true, primeiraContaConcluida: true,
      primeiroLancamentoConcluido: true, painelConhecido: true, concluido: true,
    });
    expect((fixture.nativeElement as HTMLElement).querySelector('.primeiros-passos')).toBeNull();
  });
});
