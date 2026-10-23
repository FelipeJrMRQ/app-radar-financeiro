import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { PrivacidadeValoresService } from '../../../../core/privacidade/privacidade-valores.service';
import { CategoriasService } from '../../../categorias/services/categorias.service';
import { CartoesService } from '../../services/cartoes.service';
import { ConciliacaoInicialPage } from './conciliacao-inicial.page';

describe('Conciliação inicial de cartão já utilizado', () => {
  let cartoes: jasmine.SpyObj<CartoesService>;
  let categorias: jasmine.SpyObj<CategoriasService>;

  beforeEach(async () => {
    cartoes = jasmine.createSpyObj<CartoesService>('CartoesService', [
      'buscar', 'previaConciliacaoInicial', 'confirmarConciliacaoInicial',
    ]);
    categorias = jasmine.createSpyObj<CategoriasService>('CategoriasService', ['listar']);
    cartoes.buscar.and.returnValue(of({
      id: 7, nome: 'Cartão já usado', limiteCredito: '5000.00',
      diaFechamento: 17, diaVencimento: 25, ativo: true,
      criadoEm: '2026-10-01T00:00:00', atualizadoEm: '2026-10-01T00:00:00',
    }));
    categorias.listar.and.returnValue(of([{
      id: 5, nome: 'Compras', tipo: 'DESPESA', ativo: true,
    }] as ReturnType<typeof categorias.listar> extends import('rxjs').Observable<infer T> ? T : never));

    await TestBed.configureTestingModule({
      imports: [ConciliacaoInicialPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {
          snapshot: {
            paramMap: convertToParamMap({ cartaoId: '7' }),
            queryParamMap: convertToParamMap({ competencia: '2026-11' }),
          },
        } },
        { provide: CartoesService, useValue: cartoes },
        { provide: CategoriasService, useValue: categorias },
        { provide: PrivacidadeValoresService, useValue: { valoresVisiveis: signal(true) } },
      ],
    }).compileComponents();
  });

  async function tela() {
    const fixture = TestBed.createComponent(ConciliacaoInicialPage);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  function informarDados(pagina: ConciliacaoInicialPage) {
    pagina.faturaBanco = '1.480,00';
    pagina.linhas[0].descricao = 'Celular';
    pagina.linhas[0].categoriaId = 5;
    pagina.linhas[0].valorParcela = '143,79';
    pagina.linhas[0].numeroParcela = 6;
    pagina.linhas[0].quantidadeParcelas = 15;
    pagina.adicionarLinha();
    pagina.linhas[1].descricao = 'Geladeira';
    pagina.linhas[1].categoriaId = 5;
    pagina.linhas[1].valorParcela = '250,00';
    pagina.linhas[1].numeroParcela = 3;
    pagina.linhas[1].quantidadeParcelas = 10;
    pagina.incluirAjuste = true;
    pagina.ajusteDescricao = 'Outras despesas';
    pagina.ajusteCategoriaId = 5;
    pagina.ajusteValor = '1.086,21';
  }

  it('aplica a mesma máscara monetária BRL da compra na fatura, nos itens e no ajuste negativo', async () => {
    const fixture = await tela();
    fixture.componentInstance.incluirAjuste = true;
    fixture.detectChanges();
    await fixture.whenStable();

    const campos = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('input[rfMoedaBr]');
    expect(campos.length).toBe(3);

    campos[0].value = '25000';
    campos[0].dispatchEvent(new Event('input', { bubbles: true }));
    campos[1].value = '12500';
    campos[1].dispatchEvent(new Event('input', { bubbles: true }));
    campos[2].value = '-500';
    campos[2].dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(campos[0].value).toBe('R$ 250,00');
    expect(campos[1].value).toBe('R$ 125,00');
    expect(campos[2].value).toBe('R$ -5,00');
    expect(fixture.componentInstance.faturaBanco).toBe('250,00');
    expect(fixture.componentInstance.linhas[0].valorParcela).toBe('125,00');
    expect(fixture.componentInstance.ajusteValor).toBe('-5,00');
  });

  it('envia parcela 6/15 sem recalcular valores no Angular', async () => {
    const fixture = await tela();
    informarDados(fixture.componentInstance);
    cartoes.previaConciliacaoInicial.and.returnValue(of({
      competencia: '2026-11', valorFaturaBanco: '1480.00', valorAtualRadar: '0.00',
      valorItensImportados: '393.79', valorAjusteDeclarado: '1086.21',
      totalConciliado: '1480.00', diferenca: '0.00',
      proximasFaturas: [{ competencia: '2026-12', totalPrevisto: '393.79' }],
    }));
    await fixture.componentInstance.conferir();
    const dados = cartoes.previaConciliacaoInicial.calls.mostRecent().args[1];
    expect(dados.itens[0]).toEqual({
      descricao: 'Celular', categoriaId: 5, valorParcela: '143.79',
      numeroParcela: 6, quantidadeParcelas: 15,
    });
    expect(dados.itens[1].numeroParcela).toBe(3);
    expect(dados.ajuste?.valor).toBe('1086.21');
    expect(fixture.componentInstance.diferencaZerada(
      fixture.componentInstance.previa()!.diferenca)).toBeTrue();
  });

  it('não confirma quando a prévia indica diferença e invalida a prévia após edição', async () => {
    const fixture = await tela();
    informarDados(fixture.componentInstance);
    cartoes.previaConciliacaoInicial.and.returnValue(of({
      competencia: '2026-11', valorFaturaBanco: '1480.00', valorAtualRadar: 0,
      valorItensImportados: '393.79', valorAjusteDeclarado: 0,
      totalConciliado: '393.79', diferenca: '1086.21', proximasFaturas: [],
    }));
    await fixture.componentInstance.conferir();
    await fixture.componentInstance.confirmar();
    expect(cartoes.confirmarConciliacaoInicial).not.toHaveBeenCalled();
    fixture.componentInstance.alterou();
    expect(fixture.componentInstance.previa()).toBeNull();
  });

  it('só navega após confirmação do backend', async () => {
    const fixture = await tela();
    informarDados(fixture.componentInstance);
    cartoes.previaConciliacaoInicial.and.returnValue(of({
      competencia: '2026-11', valorFaturaBanco: '1480.00', valorAtualRadar: 0,
      valorItensImportados: '393.79', valorAjusteDeclarado: '1086.21',
      totalConciliado: '1480.00', diferenca: '0.00', proximasFaturas: [],
    }));
    cartoes.confirmarConciliacaoInicial.and.returnValue(of({
      jaConfirmada: false, competencia: '2026-11', totalConciliado: '1480.00',
    }));
    const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    await fixture.componentInstance.conferir();
    await fixture.componentInstance.confirmar();
    expect(cartoes.confirmarConciliacaoInicial).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith(['/cartoes', 7], {
      queryParams: { competencia: '2026-11', resultado: 'conciliacao-concluida' },
    });
  });
});
