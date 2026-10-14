import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { mensagemDeErro } from '../../core/http/api-error';
import { TIPOS_CONTA, TipoContaFinanceira } from './contas-financeiras.model';
import { ContasFinanceirasService } from './contas-financeiras.service';
import { normalizarSaldoInicial } from './formatacao-contas';

function saldoValido(controle: AbstractControl): ValidationErrors | null {
  return typeof controle.value === 'string' && normalizarSaldoInicial(controle.value) !== null
    ? null
    : { saldoInvalido: true };
}

@Component({
  selector: 'app-conta-nova-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './conta-nova.page.html',
  styleUrl: './contas-financeiras.scss',
})
export class ContaNovaPage {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(ContasFinanceirasService);
  private readonly router = inject(Router);

  readonly tipos = TIPOS_CONTA;
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly formulario = this.fb.group({
    nome: this.fb.control('', [Validators.required, Validators.maxLength(150)]),
    tipo: this.fb.control<TipoContaFinanceira>('CONTA_CORRENTE', Validators.required),
    saldoInicial: this.fb.control('0,00', saldoValido),
  });

  async salvar(): Promise<void> {
    if (this.salvando()) return;
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;
    const dados = this.formulario.getRawValue();
    const saldoInicial = normalizarSaldoInicial(dados.saldoInicial);
    if (saldoInicial === null) return;

    this.salvando.set(true);
    this.erro.set(null);
    try {
      const conta = await firstValueFrom(this.api.criar({
        nome: dados.nome.trim(),
        tipo: dados.tipo,
        saldoInicial,
      }));
      await this.router.navigate(['/contas', conta.id]);
    } catch (erro) {
      this.erro.set(mensagemDeErro(erro));
    } finally {
      this.salvando.set(false);
    }
  }
}
