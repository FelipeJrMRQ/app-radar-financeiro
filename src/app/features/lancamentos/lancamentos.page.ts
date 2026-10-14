import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';

import { mensagemDeErro } from '../../core/http/api-error';
import { ContaFinanceira } from '../contas-financeiras/contas-financeiras.model';
import { ContasFinanceirasService } from '../contas-financeiras/contas-financeiras.service';
import { formatarDataLocal, formatarMoeda } from '../../shared/valor-monetario';
import { TipoCategoria } from '../categorias/categoria.model';
import { Lancamento } from './lancamento.model';
import { LancamentosService } from './lancamentos.service';

type FiltroTipo = 'TODOS' | TipoCategoria;

@Component({
  selector: 'app-lancamentos-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './lancamentos.page.html',
  styleUrl: './lancamentos.page.scss',
})
export class LancamentosPage implements OnInit {
  private readonly api = inject(LancamentosService);
  private readonly contasApi = inject(ContasFinanceirasService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private destruida = false;
  private versaoConsulta = 0;

  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly contas = signal<ContaFinanceira[]>([]);
  readonly lancamentos = signal<Lancamento[]>([]);
  readonly filtroTipo = signal<FiltroTipo>('TODOS');
  readonly contaSelecionada = signal<number | null>(null);
  readonly limiteExibicao = signal(30);
  readonly paginaCriada = this.route.snapshot.queryParamMap.get('criado') === 'ok';

  readonly filtrados = computed(() =>
    this.lancamentos().filter((l) => this.filtroTipo() === 'TODOS' || l.tipo === this.filtroTipo()),
  );
  readonly visiveis = computed(() => this.filtrados().slice(0, this.limiteExibicao()));
  readonly moeda = formatarMoeda;
  readonly data = formatarDataLocal;

  constructor() {
    this.destroyRef.onDestroy(() => { this.destruida = true; this.versaoConsulta++; });
  }

  ngOnInit(): void { void this.carregar(); }

  alterarTipo(tipo: FiltroTipo): void {
    this.filtroTipo.set(tipo);
    this.limiteExibicao.set(30);
  }

  alterarConta(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;
    const id = Number(valor);
    this.contaSelecionada.set(valor === '' || !Number.isSafeInteger(id) || id <= 0 ? null : id);
    this.limiteExibicao.set(30);
    void this.carregar();
  }

  async carregar(): Promise<void> {
    const consulta = ++this.versaoConsulta;
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const resultado = await firstValueFrom(forkJoin({
        contas: this.contasApi.listar(),
        lancamentos: this.api.listar(this.contaSelecionada()),
      }));
      if (this.destruida || consulta !== this.versaoConsulta) return;
      this.contas.set(resultado.contas);
      this.lancamentos.set(resultado.lancamentos);
    } catch (erro) {
      if (!this.destruida && consulta === this.versaoConsulta) {
        this.erro.set(mensagemDeErro(erro));
        this.lancamentos.set([]);
      }
    } finally {
      if (!this.destruida && consulta === this.versaoConsulta) this.carregando.set(false);
    }
  }
}
