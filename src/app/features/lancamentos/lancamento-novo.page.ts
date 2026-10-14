import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';

import { mensagemDeErro } from '../../core/http/api-error';
import { MoedaBrInputDirective } from '../../shared/directives/moeda-br-input.directive';
import { decimalPositivo, dataHojeLocal } from '../../shared/valor-monetario';
import { Categoria, TipoCategoria } from '../categorias/categoria.model';
import { CategoriasService } from '../categorias/categorias.service';
import { ContaFinanceira } from '../contas-financeiras/contas-financeiras.model';
import { ContasFinanceirasService } from '../contas-financeiras/contas-financeiras.service';
import { LancamentosService } from './lancamentos.service';
import { SituacaoLancamento } from './lancamento.model';

type ModalidadeLancamento = 'UNICO' | 'RECORRENTE' | 'PARCELADO';

function valorLancamentoValido(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && decimalPositivo(control.value) !== null
    ? null : { valorInvalido: true };
}

@Component({
  selector: 'app-lancamento-novo-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MoedaBrInputDirective],
  templateUrl: './lancamento-novo.page.html',
  styleUrl: './lancamentos.page.scss',
})
export class LancamentoNovoPage implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(LancamentosService);
  private readonly contasApi = inject(ContasFinanceirasService);
  private readonly categoriasApi = inject(CategoriasService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private destruida = false;

  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly erroInicial = signal<string | null>(null);
  readonly contas = signal<ContaFinanceira[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly tipo = signal<TipoCategoria>('DESPESA');
  readonly modalidade = signal<ModalidadeLancamento>('UNICO');
  readonly erroValidacao = signal<string | null>(null);
  readonly categoriasDisponiveis = computed(() =>
    this.categorias().filter((categoria) => categoria.ativo && categoria.tipo === this.tipo()),
  );
  readonly form = this.fb.group({
    contaFinanceiraId: this.fb.control<number | null>(null, Validators.required),
    categoriaId: this.fb.control<number | null>(null, Validators.required),
    descricao: ['', [Validators.required, Validators.maxLength(200)]],
    valor: ['', [valorLancamentoValido]],
    dataLancamento: [dataHojeLocal(), Validators.required],
    situacaoInicial: this.fb.control<SituacaoLancamento>('PREVISTO', Validators.required),
    quantidadeParcelas: this.fb.control(2, [Validators.min(2), Validators.max(120)]),
    dataFim: [''],
    observacao: ['', Validators.maxLength(500)],
  });

  constructor() { this.destroyRef.onDestroy(() => { this.destruida = true; }); }

  ngOnInit(): void { void this.carregarOpcoes(); }

  selecionarModalidade(modalidade: ModalidadeLancamento): void {
    this.modalidade.set(modalidade);
    this.erroValidacao.set(null);
  }

  selecionarTipo(tipo: TipoCategoria): void {
    this.tipo.set(tipo);
    this.form.controls.categoriaId.setValue(null);
  }

  async carregarOpcoes(): Promise<void> {
    this.carregando.set(true);
    this.erroInicial.set(null);
    try {
      const resultado = await firstValueFrom(forkJoin({
        contas: this.contasApi.listar(),
        categorias: this.categoriasApi.listar(),
      }));
      if (this.destruida) return;
      this.contas.set(resultado.contas);
      this.categorias.set(resultado.categorias);
    } catch (erro) {
      if (!this.destruida) this.erroInicial.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruida) this.carregando.set(false);
    }
  }

  async salvar(): Promise<void> {
    if (this.salvando() || this.carregando()) return;
    this.form.markAllAsTouched();
    const form = this.form.getRawValue();
    this.erroValidacao.set(null);
    const decimal = decimalPositivo(form.valor);
    if (this.form.invalid || !form.descricao.trim() || decimal === null
        || form.contaFinanceiraId === null || form.categoriaId === null
        || !this.contas().some(c => c.id === form.contaFinanceiraId)
        || !this.categoriasDisponiveis().some(c => c.id === form.categoriaId)) return;

    if (this.modalidade() === 'UNICO' && form.situacaoInicial === 'CONFIRMADO'
        && form.dataLancamento > dataHojeLocal()) {
      this.erroValidacao.set('Um lançamento futuro não pode ser marcado como realizado.');
      return;
    }
    if (this.modalidade() === 'RECORRENTE' &&
        (form.dataLancamento < dataHojeLocal() || (form.dataFim && form.dataFim < form.dataLancamento))) {
      this.erroValidacao.set('A recorrência deve começar hoje ou depois e a data final não pode ser anterior ao início.');
      return;
    }
    if (this.modalidade() === 'PARCELADO' &&
        (!Number.isInteger(form.quantidadeParcelas) || form.quantidadeParcelas < 2 || form.quantidadeParcelas > 120)) {
      this.erroValidacao.set('Informe uma quantidade entre 2 e 120 parcelas.');
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);
    try {
      const dados = {
        contaFinanceiraId: form.contaFinanceiraId,
        categoriaId: form.categoriaId,
        descricao: form.descricao.trim(),
        observacao: form.observacao.trim() || null,
      };
      if (this.modalidade() === 'RECORRENTE') {
        await firstValueFrom(this.api.criarRecorrencia({
          ...dados, valor: decimal, dataInicio: form.dataLancamento,
          dataFim: form.dataFim || null,
        }));
      } else if (this.modalidade() === 'PARCELADO') {
        await firstValueFrom(this.api.criarParcelamento({
          ...dados, valorTotal: decimal, quantidadeParcelas: form.quantidadeParcelas,
          primeiroVencimento: form.dataLancamento,
        }));
      } else {
        await firstValueFrom(this.api.criar({
          ...dados, valor: decimal, dataLancamento: form.dataLancamento,
          situacaoInicial: form.situacaoInicial,
        }));
      }
      if (!this.destruida) {
        await this.router.navigate(['/lancamentos'], { queryParams: { criado: 'ok' } });
      }
    } catch (erro) {
      if (!this.destruida) this.erro.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruida) this.salvando.set(false);
    }
  }
}
