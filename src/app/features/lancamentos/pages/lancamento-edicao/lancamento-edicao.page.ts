import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';

import { mensagemDeErro } from '../../../../core/http/api-error';
import { MoedaBrInputDirective } from '../../../../shared/directives/moeda-br-input.directive';
import { dataHojeLocal, decimalPositivo } from '../../../../shared/valor-monetario';
import { Categoria } from '../../../categorias/models/categoria.model';
import { CategoriasService } from '../../../categorias/services/categorias.service';
import { ContaFinanceira } from '../../../contas-financeiras/models/contas-financeiras.model';
import { ContasFinanceirasService } from '../../../contas-financeiras/services/contas-financeiras.service';
import {
  EscopoSequencia, Lancamento, modalidadeLancamento, permiteSequencia,
} from '../../models/lancamento.model';
import { LancamentosService } from '../../services/lancamentos.service';

@Component({
  selector: 'app-lancamento-edicao',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MoedaBrInputDirective],
  templateUrl: './lancamento-edicao.page.html',
  styleUrl: './lancamento-edicao.page.scss',
})
export class LancamentoEdicaoPage implements OnInit {
  private readonly api = inject(LancamentosService);
  private readonly contasApi = inject(ContasFinanceirasService);
  private readonly categoriasApi = inject(CategoriasService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly destroyRef = inject(DestroyRef);
  private destruido = false;

  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly lancamento = signal<Lancamento | null>(null);
  readonly contas = signal<ContaFinanceira[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly escopo = signal<EscopoSequencia>('ATUAL');
  readonly categoriasDisponiveis = computed(() =>
    this.categorias().filter(c => c.ativo && c.tipo === this.lancamento()?.tipo));
  readonly sequenciaElegivel = computed(() => {
    const l = this.lancamento();
    return l !== null && permiteSequencia(l, dataHojeLocal());
  });
  readonly modalidade = computed(() =>
    this.lancamento() ? modalidadeLancamento(this.lancamento()!) : 'UNICO');

  readonly form = this.fb.group({
    contaFinanceiraId: this.fb.control<number | null>(null, Validators.required),
    categoriaId: this.fb.control<number | null>(null, Validators.required),
    descricao: ['', [Validators.required, Validators.maxLength(200)]],
    valor: ['', Validators.required],
    dataLancamento: ['', Validators.required],
    observacao: ['', Validators.maxLength(500)],
  });

  constructor() {
    this.destroyRef.onDestroy(() => { this.destruido = true; });
  }

  ngOnInit(): void { void this.carregar(); }

  async carregar(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('lancamentoId'));
    if (!Number.isSafeInteger(id) || id <= 0) {
      this.erro.set('Identificador de lançamento inválido.');
      this.carregando.set(false);
      return;
    }
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const dados = await firstValueFrom(forkJoin({
        lancamento: this.api.buscar(id),
        contas: this.contasApi.listar(),
        categorias: this.categoriasApi.listar(),
      }));
      if (this.destruido) return;
      if (!dados.lancamento.ativo) {
        this.erro.set('Não é permitido editar lançamento excluído.');
        return;
      }
      this.lancamento.set(dados.lancamento);
      this.contas.set(dados.contas);
      this.categorias.set(dados.categorias);
      this.escopo.set('ATUAL');
      // Conserva todas as casas do BigDecimal no formulário; a máscara formatará o pt-BR.
      const valor = String(dados.lancamento.valor).replace('.', ',');
      this.form.patchValue({
        contaFinanceiraId: dados.lancamento.contaFinanceiraId,
        categoriaId: dados.lancamento.categoriaId,
        descricao: dados.lancamento.descricao,
        valor,
        dataLancamento: dados.lancamento.dataLancamento,
        observacao: dados.lancamento.observacao ?? '',
      });
    } catch (e) {
      if (!this.destruido) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruido) this.carregando.set(false);
    }
  }

  definirEscopo(valor: EscopoSequencia): void {
    if (valor === 'SEGUINTES' && !this.sequenciaElegivel()) return;
    this.escopo.set(valor);
    this.erro.set(null);
  }

  async salvar(): Promise<void> {
    const l = this.lancamento();
    if (!l || this.carregando() || this.salvando()) return;
    this.form.markAllAsTouched();
    const f = this.form.getRawValue();
    const decimal = decimalPositivo(f.valor);
    if (this.form.invalid || !decimal || !f.contaFinanceiraId || !f.categoriaId
      || !f.descricao.trim() || !this.categoriasDisponiveis().some(c => c.id === f.categoriaId)) {
      this.erro.set('Confira conta, categoria, descrição, valor e data do lançamento.');
      return;
    }
    if (this.escopo() === 'SEGUINTES' &&
        (!this.sequenciaElegivel() || f.dataLancamento !== l.dataLancamento)) {
      this.erro.set('Na alteração em sequência, o vencimento da ocorrência selecionada deve ser mantido.');
      return;
    }
    this.salvando.set(true);
    this.erro.set(null);
    try {
      const escopo = this.escopo();
      const descricao = escopo === 'SEGUINTES' && l.parcelamentoLancamentoId !== null
        ? f.descricao.trim().replace(/ \(\d+\/\d+\)$/, '') : f.descricao.trim();
      await firstValueFrom(this.api.editar(l.id, {
        contaFinanceiraId: f.contaFinanceiraId,
        categoriaId: f.categoriaId,
        descricao,
        valor: decimal,
        dataLancamento: f.dataLancamento,
        observacao: f.observacao.trim() || null,
      }, escopo, l.parcelamentoLancamentoId !== null));
      if (!this.destruido) {
        await this.router.navigate(['/lancamentos'], {
          queryParams: { mes: f.dataLancamento.slice(0, 7), tipo: l.tipo },
        });
      }
    } catch (e) {
      if (!this.destruido) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruido) this.salvando.set(false);
    }
  }
}
