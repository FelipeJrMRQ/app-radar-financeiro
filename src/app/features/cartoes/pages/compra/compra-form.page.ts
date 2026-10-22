import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { mensagemDeErro } from '../../../../core/http/api-error';
import { MoedaBrInputDirective } from '../../../../shared/directives/moeda-br-input.directive';
import { dataHojeLocal, decimalPositivo } from '../../../../shared/valor-monetario';
import { Categoria } from '../../../categorias/models/categoria.model';
import { CategoriasService } from '../../../categorias/services/categorias.service';
import { CartaoCredito } from '../../models/cartao.model';
import { CartoesService } from '../../services/cartoes.service';

function valorValido(controle: AbstractControl): ValidationErrors | null {
  return typeof controle.value === 'string' && decimalPositivo(controle.value) !== null
    ? null : { valorInvalido: true };
}

@Component({
  selector: 'app-compra-cartao-form',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MoedaBrInputDirective],
  templateUrl: './compra-form.page.html',
  styleUrl: '../../styles/_cartoes.page.scss',
})
export class CompraCartaoFormPage implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(CartoesService);
  private readonly categoriasApi = inject(CategoriasService);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);
  private readonly cartaoTexto = this.rota.snapshot.paramMap.get('cartaoId');
  private readonly compraTexto = this.rota.snapshot.paramMap.get('compraId');
  readonly cartaoId = Number(this.cartaoTexto);
  private readonly compraId = Number(this.compraTexto);
  readonly editando = this.compraTexto !== null;
  readonly hoje = dataHojeLocal();
  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly cartao = signal<CartaoCredito | null>(null);
  readonly categorias = signal<Categoria[]>([]);
  readonly form = this.fb.group({
    categoriaId: this.fb.control<number | null>(null, Validators.required),
    descricao: ['', [Validators.required, Validators.maxLength(200)]],
    valorTotal: ['', valorValido],
    dataCompra: [dataHojeLocal(), Validators.required],
    quantidadeParcelas: [1, [Validators.required, Validators.min(1), Validators.max(120)]],
    observacao: ['', Validators.maxLength(500)],
  });

  ngOnInit(): void { void this.carregar(); }

  async carregar(): Promise<void> {
    if (!this.cartaoTexto || !/^[1-9]\d*$/.test(this.cartaoTexto) ||
      !Number.isSafeInteger(this.cartaoId) ||
      (this.editando && (!this.compraTexto || !/^[1-9]\d*$/.test(this.compraTexto) ||
        !Number.isSafeInteger(this.compraId)))) {
      this.erro.set('Identificador inválido.');
      this.carregando.set(false);
      return;
    }
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const dados = await firstValueFrom(forkJoin({
        cartao: this.api.buscar(this.cartaoId),
        categorias: this.categoriasApi.listar(),
      }));
      if (this.destruir.destroyed) return;
      if (!dados.cartao.ativo) {
        this.erro.set('Não é permitido cadastrar compras em cartão inativo.');
        return;
      }
      this.cartao.set(dados.cartao);
      this.categorias.set(dados.categorias.filter(c => c.ativo && c.tipo === 'DESPESA'));
      if (this.editando) {
        const compra = await firstValueFrom(this.api.buscarCompra(this.cartaoId, this.compraId));
        if (this.destruir.destroyed) return;
        if (!compra.ativo || compra.quantidadeParcelas > 1) {
          this.erro.set('A edição desta compra parcelada ou inativa não está disponível neste formulário.');
          return;
        }
        this.form.reset({
          categoriaId: compra.categoriaId, descricao: compra.descricao,
          valorTotal: String(compra.valorTotal).replace('.', ','),
          dataCompra: compra.dataCompra, quantidadeParcelas: 1, observacao: compra.observacao ?? '',
        });
      }
    } catch (e) {
      if (!this.destruir.destroyed) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruir.destroyed) this.carregando.set(false);
    }
  }

  async salvar(): Promise<void> {
    this.form.markAllAsTouched();
    const f = this.form.getRawValue();
    const valor = decimalPositivo(f.valorTotal);
    if (this.form.invalid || !f.categoriaId || !f.descricao.trim() || !valor ||
        !Number.isInteger(f.quantidadeParcelas) || f.quantidadeParcelas < 1 ||
        f.quantidadeParcelas > 120 || f.dataCompra > dataHojeLocal() ||
        !this.categorias().some(c => c.id === f.categoriaId) ||
        this.salvando() || this.carregando() || !!this.erro()) return;
    this.salvando.set(true);
    this.erro.set(null);
    const payload = {
      categoriaId: f.categoriaId, descricao: f.descricao.trim(), valorTotal: valor,
      dataCompra: f.dataCompra, observacao: f.observacao.trim() || null,
    };
    try {
      if (this.editando) {
        await firstValueFrom(this.api.atualizarCompra(this.cartaoId, this.compraId, payload));
      } else if (f.quantidadeParcelas > 1) {
        await firstValueFrom(this.api.comprarParcelado(this.cartaoId, {
          ...payload, quantidadeParcelas: f.quantidadeParcelas,
        }));
      } else {
        await firstValueFrom(this.api.comprar(this.cartaoId, payload));
      }
      if (!this.destruir.destroyed) {
        await this.router.navigate(['/cartoes', this.cartaoId], {
          queryParams: { resultado: this.editando ? 'compra-editada' : 'compra-criada' },
        });
      }
    } catch (e) {
      if (!this.destruir.destroyed) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruir.destroyed) this.salvando.set(false);
    }
  }
}
