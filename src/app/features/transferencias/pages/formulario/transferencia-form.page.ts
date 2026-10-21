import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';

import { mensagemDeErro } from '../../../../core/http/api-error';
import { MoedaBrInputDirective } from '../../../../shared/directives/moeda-br-input.directive';
import { dataHojeLocal, decimalPositivo } from '../../../../shared/valor-monetario';
import { ContaFinanceira } from '../../../contas-financeiras/models/contas-financeiras.model';
import { ContasFinanceirasService } from '../../../contas-financeiras/services/contas-financeiras.service';
import { TransferenciasService } from '../../services/transferencias.service';

function valorValido(controle: AbstractControl): ValidationErrors | null {
  return typeof controle.value === 'string' && decimalPositivo(controle.value) !== null
    ? null : { valorInvalido: true };
}

@Component({
  selector: 'app-transferencia-form-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MoedaBrInputDirective],
  templateUrl: './transferencia-form.page.html',
  styleUrl: './transferencia-form.page.scss',
})
export class TransferenciaFormPage implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(TransferenciasService);
  private readonly contasApi = inject(ContasFinanceirasService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly destruir = inject(DestroyRef);
  private readonly idTexto = this.rota.snapshot.paramMap.get('transferenciaId');
  private readonly id = Number(this.idTexto);
  readonly editando = this.idTexto !== null;
  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly erroInicial = signal<string | null>(null);
  readonly erro = signal<string | null>(null);
  readonly erroValidacao = signal<string | null>(null);
  readonly contas = signal<ContaFinanceira[]>([]);
  readonly form = this.fb.group({
    contaOrigemId: this.fb.control<number | null>(null, Validators.required),
    contaDestinoId: this.fb.control<number | null>(null, Validators.required),
    valor: ['', valorValido],
    dataTransferencia: [dataHojeLocal(), Validators.required],
    descricao: ['', [Validators.required, Validators.maxLength(200)]],
    observacao: ['', Validators.maxLength(500)],
  });

  ngOnInit(): void { void this.carregar(); }

  async carregar(): Promise<void> {
    if (this.editando && (!this.idTexto || !/^[1-9]\d*$/.test(this.idTexto)
        || !Number.isSafeInteger(this.id))) {
      this.erroInicial.set('Identificador de transferência inválido.');
      this.carregando.set(false);
      return;
    }
    this.carregando.set(true);
    this.erroInicial.set(null);
    try {
      const contas = await firstValueFrom(this.contasApi.listar());
      if (this.destruir.destroyed) return;
      this.contas.set(contas.filter(c => c.ativo));
      if (this.editando) {
        const transferencia = await firstValueFrom(this.api.buscar(this.id));
        if (this.destruir.destroyed) return;
        if (!transferencia.ativo) {
          this.erroInicial.set('Esta transferência está inativa e não pode ser editada.');
          return;
        }
        this.form.reset({
          contaOrigemId: transferencia.contaOrigemId,
          contaDestinoId: transferencia.contaDestinoId,
          valor: String(transferencia.valor).replace('.', ','),
          dataTransferencia: transferencia.dataTransferencia,
          descricao: transferencia.descricao,
          observacao: transferencia.observacao ?? '',
        });
      }
    } catch (erro) {
      if (!this.destruir.destroyed) this.erroInicial.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruir.destroyed) this.carregando.set(false);
    }
  }

  async salvar(): Promise<void> {
    if (this.carregando() || this.salvando() || this.erroInicial()) return;
    this.form.markAllAsTouched();
    this.erroValidacao.set(null);
    const f = this.form.getRawValue();
    const valor = decimalPositivo(f.valor);
    if (this.form.invalid || valor === null || !f.descricao.trim()
        || f.contaOrigemId === null || f.contaDestinoId === null) return;
    if (f.contaOrigemId === f.contaDestinoId) {
      this.erroValidacao.set('Escolha contas diferentes para origem e destino.');
      return;
    }
    if (!this.contas().some(c => c.id === f.contaOrigemId)
        || !this.contas().some(c => c.id === f.contaDestinoId)) {
      this.erroValidacao.set('Selecione duas contas ativas do seu espaço financeiro.');
      return;
    }
    this.salvando.set(true);
    this.erro.set(null);
    try {
      const dados = {
        contaOrigemId: f.contaOrigemId,
        contaDestinoId: f.contaDestinoId,
        valor,
        dataTransferencia: f.dataTransferencia,
        descricao: f.descricao.trim(),
        observacao: f.observacao.trim() || null,
      };
      if (this.editando) {
        await firstValueFrom(this.api.atualizar(this.id, dados));
      } else {
        await firstValueFrom(this.api.criar(dados));
      }
      if (!this.destruir.destroyed) {
        await this.router.navigate(['/transferencias'], {
          queryParams: {
            resultado: this.editando ? 'editada' : 'criada',
            mes: dados.dataTransferencia.slice(0, 7),
          },
        });
      }
    } catch (erro) {
      if (!this.destruir.destroyed) this.erro.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruir.destroyed) this.salvando.set(false);
    }
  }
}
