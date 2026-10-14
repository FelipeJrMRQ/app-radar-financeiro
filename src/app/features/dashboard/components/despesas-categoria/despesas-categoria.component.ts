import { Component, computed, input } from '@angular/core';
import { formatarMoeda } from '../../../../shared/valor-monetario';
import { TotalCategoria } from '../../models/painel-financeiro.model';
import { largurasCategorias } from '../../utils/painel-visuais';

@Component({ selector: 'app-despesas-categoria-card', standalone: true,
  templateUrl: './despesas-categoria.component.html' })
export class DespesasCategoriaCardComponent {
  readonly categorias = input.required<TotalCategoria[]>();
  readonly erroCategorias = input<string | null>(null);
  readonly categoriasGraficos = computed(() => largurasCategorias(this.categorias()).slice(0,7));
  readonly moeda = formatarMoeda;
}
