import { signal } from '@angular/core';
import { TemaService } from '../../../../core/tema/tema.service';
import { TestBed } from '@angular/core/testing';

import { DespesasCategoriaCardComponent } from './despesas-categoria.component';

describe('Despesas por categoria com Chart.js Doughnut', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [{ provide: TemaService, useValue: { efetivo: signal('CLARO') } }],
      imports: [DespesasCategoriaCardComponent],
    }).compileComponents();
  });

  it('mostra título, rosca e total realizado sem barras horizontais', async () => {
    const fixture = TestBed.createComponent(DespesasCategoriaCardComponent);
    fixture.componentRef.setInput('categorias', [
      { categoriaId: 1, categoriaNome: 'Compras', valor: '750.00' },
      { categoriaId: 2, categoriaNome: 'Moradia', valor: '90.12' },
      { categoriaId: 3, categoriaNome: 'Lazer', valor: '40.12' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('h2')?.textContent).toContain('Despesas por categoria');
    expect(raiz.querySelectorAll('.category-doughnut-figure canvas').length).toBe(1);
    expect(raiz.querySelectorAll('.category-bars, .category-track').length).toBe(0);
    expect(raiz.querySelector('.category-doughnut-center')?.textContent)
      .toContain('880,24');
    expect(raiz.querySelectorAll('.category-doughnut-legend-item').length).toBe(3);
    expect(raiz.textContent).toContain('85,2%');
    expect(raiz.textContent).toContain('R$');
    fixture.destroy();
  });

  it('agrupa mais de cinco categorias na legenda Outras e mantém o valor exato', () => {
    const fixture = TestBed.createComponent(DespesasCategoriaCardComponent);
    fixture.componentRef.setInput('categorias', [
      { categoriaId: 1, categoriaNome: 'A', valor: 600 },
      { categoriaId: 2, categoriaNome: 'B', valor: 200 },
      { categoriaId: 3, categoriaNome: 'C', valor: 100 },
      { categoriaId: 4, categoriaNome: 'D', valor: 50 },
      { categoriaId: 5, categoriaNome: 'E', valor: 25 },
      { categoriaId: 6, categoriaNome: 'F', valor: '10.01' },
      { categoriaId: 7, categoriaNome: 'G', valor: '0.02' },
    ]);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelectorAll('.category-doughnut-legend-item').length).toBe(6);
    expect(raiz.textContent).toContain('Outras');
    expect(raiz.textContent).toContain('2 categorias');
    expect(raiz.textContent).toContain('R$');
    expect(fixture.componentInstance.dadosRosca().fatias.at(-1)?.valor)
      .toBe('10.0300');
    fixture.destroy();
  });

  it('preserva o estado vazio quando a API não retorna despesas realizadas', () => {
    const fixture = TestBed.createComponent(DespesasCategoriaCardComponent);
    fixture.componentRef.setInput('categorias', []);
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Sem despesas realizadas neste período.');
    expect(raiz.querySelector('canvas')).toBeNull();
    fixture.destroy();
  });

  it('prioriza mensagens de erro sem exibir gráfico desatualizado', () => {
    const fixture = TestBed.createComponent(DespesasCategoriaCardComponent);
    fixture.componentRef.setInput('categorias', [
      { categoriaId: 1, categoriaNome: 'Compras', valor: 100 },
    ]);
    fixture.detectChanges();
    fixture.componentRef.setInput('erroCategorias', 'Falha ao consultar as despesas.');
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('[role="alert"]')?.textContent)
      .toContain('Falha ao consultar as despesas.');
    expect(raiz.querySelector('canvas')).toBeNull();
    fixture.destroy();
  });

  it('atualiza a legenda e o total quando os dados do período são alterados', () => {
    const fixture = TestBed.createComponent(DespesasCategoriaCardComponent);
    fixture.componentRef.setInput('categorias', [
      { categoriaId: 1, categoriaNome: 'Compras', valor: 750 },
    ]);
    fixture.detectChanges();

    fixture.componentRef.setInput('categorias', [
      { categoriaId: 2, categoriaNome: 'Moradia', valor: '99.99' },
    ]);
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Moradia');
    expect(raiz.textContent).not.toContain('Compras');
    expect(raiz.querySelector('.category-doughnut-center')?.textContent).toContain('99,99');
    fixture.destroy();
  });
});
