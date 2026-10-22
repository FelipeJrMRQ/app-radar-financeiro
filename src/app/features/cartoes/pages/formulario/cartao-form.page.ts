import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { mensagemDeErro } from '../../../../core/http/api-error';
import { MoedaBrInputDirective } from '../../../../shared/directives/moeda-br-input.directive';
import { decimalPositivo } from '../../../../shared/valor-monetario';
import { CartoesService } from '../../services/cartoes.service';

function valorValido(controle: AbstractControl): ValidationErrors | null {
  return typeof controle.value === 'string' && decimalPositivo(controle.value) !== null
    ? null : { valorInvalido: true };
}

@Component({
  selector: 'app-cartao-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MoedaBrInputDirective],
  templateUrl: './cartao-form.page.html',
  styleUrl: '../../styles/_cartoes.page.scss',
})
export class CartaoFormPage implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(CartoesService);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);
  private readonly idTexto = this.rota.snapshot.paramMap.get('cartaoId');
  private readonly id = Number(this.idTexto);

  readonly editando = this.idTexto !== null;
  readonly carregando = signal(this.editando);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(150)]],
    limiteCredito: ['', valorValido],
    diaFechamento: [10, [Validators.required, Validators.min(1), Validators.max(31)]],
    diaVencimento: [17, [Validators.required, Validators.min(1), Validators.max(31)]],
  });

  ngOnInit(): void { if (this.editando) void this.carregar(); }

  async carregar(): Promise<void> {
    if (!this.idTexto || !/^[1-9]\d*$/.test(this.idTexto) || !Number.isSafeInteger(this.id)) {
      this.erro.set('Identificador de cartão inválido.');
      this.carregando.set(false);
      return;
    }
    this.carregando.set(true);
    try {
      const cartao = await firstValueFrom(this.api.buscar(this.id));
      if (this.destruir.destroyed) return;
      if (!cartao.ativo) { this.erro.set('Não é possível editar um cartão inativo.'); return; }
      this.form.reset({
        nome: cartao.nome, limiteCredito: String(cartao.limiteCredito).replace('.', ','),
        diaFechamento: cartao.diaFechamento, diaVencimento: cartao.diaVencimento,
      });
    } catch (e) {
      if (!this.destruir.destroyed) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruir.destroyed) this.carregando.set(false);
    }
  }

  async salvar(): Promise<void> {
    this.form.markAllAsTouched();
    const f = this.form.getRawValue();
    const limite = decimalPositivo(f.limiteCredito);
    if (this.form.invalid || !f.nome.trim() || limite === null ||
        !Number.isInteger(f.diaFechamento) || !Number.isInteger(f.diaVencimento) ||
        this.salvando() || this.carregando()) return;

    this.salvando.set(true);
    this.erro.set(null);
    try {
      const dados = {
        nome: f.nome.trim(), limiteCredito: limite,
        diaFechamento: f.diaFechamento, diaVencimento: f.diaVencimento,
      };
      if (this.editando) await firstValueFrom(this.api.atualizar(this.id, dados));
      else await firstValueFrom(this.api.criar(dados));
      if (!this.destruir.destroyed)
        await this.router.navigate(['/cartoes']);
    } catch (e) {
      if (!this.destruir.destroyed) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruir.destroyed) this.salvando.set(false);
    }
  }
}
