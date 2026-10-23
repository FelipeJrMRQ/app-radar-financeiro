import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TemaService } from '../../../../core/tema/tema.service';
import { PrivacidadeValoresService } from '../../../../core/privacidade/privacidade-valores.service';
import { CentralConfiguracoesPage } from './central-configuracoes.page';

describe('Ícones de navegação das configurações', () => {
  it('utiliza cinco ícones Font Awesome e setas apenas nos três links disponíveis', async () => {
    await TestBed.configureTestingModule({
      imports: [CentralConfiguracoesPage],
      providers: [
        provideRouter([]),
        {
          provide: TemaService,
          useValue: {
            preferencia: signal('ESCURO'),
            carregando: signal(false),
            salvando: signal(false),
            erro: signal(null),
          },
        },
        {
          provide: PrivacidadeValoresService,
          useValue: { valoresVisiveis: signal(true) },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CentralConfiguracoesPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelectorAll('.menu-card .card-icon fa-icon svg').length).toBe(5);
    expect(raiz.querySelectorAll('a.menu-card .card-arrow fa-icon svg').length).toBe(3);
    expect(raiz.querySelectorAll('.unavailable .card-arrow').length).toBe(0);
  });
});
