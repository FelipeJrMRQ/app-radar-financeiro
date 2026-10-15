import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { mensagemDeErro } from '../../../../core/http/api-error';
import { MoedaBrInputDirective } from '../../../../shared/directives/moeda-br-input.directive';
import { ContaFinanceira, TIPOS_CONTA, TipoContaFinanceira } from '../../models/contas-financeiras.model';
import { ContasFinanceirasService } from '../../services/contas-financeiras.service';
import { normalizarSaldoInicial } from '../../utils/formatacao-contas';

function saldoValido(controle: AbstractControl): ValidationErrors | null {
  return typeof controle.value === 'string' && normalizarSaldoInicial(controle.value) !== null
    ? null
    : { saldoInvalido: true };
}

/** Comparação textual de decimais, sem arredondar saldo financeiro com Number. */
function saldoComparavel(valor: string | null): string | null {
  if (valor === null) return null;
  const [inteiro, fracao = ''] = valor.split('.');
  const fracaoSemZeros = fracao.replace(/0+$/, '');
  return inteiro + (fracaoSemZeros ? '.' + fracaoSemZeros : '');
}

/** O saldo inicial recebido da API é decimal; a máscara/formulário utilizam vírgula. */
function saldoParaFormulario(conta: ContaFinanceira): string {
  return String(conta.saldoInicial).replace('.', ',');
}

@Component({
  selector: 'app-conta-nova-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MoedaBrInputDirective],
  templateUrl: './conta-nova.page.html',
  styleUrl: './conta-nova.page.scss',
})
export class ContaNovaPage implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(ContasFinanceirasService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly idTexto = this.route.snapshot.paramMap.get('contaId');
  private readonly contaId = Number(this.idTexto);
  private saldoOriginal: string | null = null;

  readonly editando = this.idTexto !== null;
  readonly tipos = TIPOS_CONTA;
  readonly carregando = signal(this.editando);
  readonly erroCarregamento = signal<string | null>(null);
  readonly contaAtiva = signal(true);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly saldoAlterado = signal(false);
  readonly confirmouMudancaSaldo = signal(false);
  readonly formulario = this.fb.group({
    nome: this.fb.control('', [Validators.required, Validators.maxLength(150)]),
    tipo: this.fb.control<TipoContaFinanceira>('CONTA_CORRENTE', Validators.required),
    saldoInicial: this.fb.control('', saldoValido),
  });

  constructor() {
    this.formulario.controls.saldoInicial.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(valor => {
        const alterou = this.editando && this.saldoOriginal !== null
          && saldoComparavel(normalizarSaldoInicial(valor)) !== this.saldoOriginal;
        this.saldoAlterado.set(alterou);
        this.confirmouMudancaSaldo.set(false);
      });
  }

  ngOnInit(): void {
    if (!this.editando) return;
    if (!this.idTexto || !/^[1-9]\d*$/.test(this.idTexto)
        || !Number.isSafeInteger(this.contaId)) {
      this.erroCarregamento.set('Identificador de conta inválido.');
      this.carregando.set(false);
      return;
    }
    void this.carregar();
  }

  async carregar(): Promise<void> {
    if (!this.editando) return;
    this.carregando.set(true);
    this.erroCarregamento.set(null);
    try {
      const conta = await firstValueFrom(this.api.buscar(this.contaId));
      if (this.destroyRef.destroyed) return;
      this.contaAtiva.set(conta.ativo);
      this.saldoOriginal = saldoComparavel(String(conta.saldoInicial))!;
      this.formulario.reset({
        nome: conta.nome,
        tipo: conta.tipo,
        saldoInicial: saldoParaFormulario(conta),
      });
      this.saldoAlterado.set(false);
      this.confirmouMudancaSaldo.set(false);
    } catch (erro) {
      if (!this.destroyRef.destroyed) this.erroCarregamento.set(mensagemDeErro(erro));
    } finally {
      if (!this.destroyRef.destroyed) this.carregando.set(false);
    }
  }

  marcarConfirmacaoSaldo(evento: Event): void {
    this.confirmouMudancaSaldo.set((evento.target as HTMLInputElement).checked);
  }

  async salvar(): Promise<void> {
    if (this.salvando() || this.carregando() || this.erroCarregamento()) return;
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;
    const dados = this.formulario.getRawValue();
    if (!dados.nome.trim()) {
      this.erro.set('O nome da conta não pode conter apenas espaços.');
      return;
    }
    const saldoInicial = normalizarSaldoInicial(dados.saldoInicial);
    if (saldoInicial === null) return;
    if (this.editando && this.saldoAlterado() && !this.confirmouMudancaSaldo()) {
      this.erro.set('Confirme que compreende o impacto da alteração do saldo inicial nos saldos e extratos.');
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);
    try {
      const payload = { nome: dados.nome.trim(), tipo: dados.tipo, saldoInicial };
      const conta = await firstValueFrom(this.editando
        ? this.api.atualizar(this.contaId, payload)
        : this.api.criar(payload));
      if (this.destroyRef.destroyed) return;
      await this.router.navigate(['/contas', conta.id], {
        queryParams: { resultado: this.editando ? 'atualizada' : 'criada' },
      });
    } catch (erro) {
      if (!this.destroyRef.destroyed) this.erro.set(mensagemDeErro(erro));
    } finally {
      if (!this.destroyRef.destroyed) this.salvando.set(false);
    }
  }

  readonly voltar = () => this.editando ? ['/contas', this.contaId] : ['/contas'];
}
