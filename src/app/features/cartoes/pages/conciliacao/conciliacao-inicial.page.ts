import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';

import { mensagemDeErro } from '../../../../core/http/api-error';
import { PrivacidadeValoresService } from '../../../../core/privacidade/privacidade-valores.service';
import { dataHojeLocal, decimalPositivo, formatarMoeda, normalizarDecimalBr } from '../../../../shared/valor-monetario';
import { Categoria } from '../../../categorias/models/categoria.model';
import { CategoriasService } from '../../../categorias/services/categorias.service';
import {
  CartaoCredito, DadosConciliacaoInicial, ItemConciliacaoInicial, PreviaConciliacaoInicial,
} from '../../models/cartao.model';
import { CartoesService } from '../../services/cartoes.service';

interface Linha {
  idLocal: number;
  descricao: string;
  categoriaId: number | null;
  valorParcela: string;
  numeroParcela: number;
  quantidadeParcelas: number;
}

@Component({
  selector: 'app-conciliacao-inicial',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './conciliacao-inicial.page.html',
  styleUrl: './conciliacao-inicial.page.scss',
})
export class ConciliacaoInicialPage implements OnInit {
  private readonly api = inject(CartoesService);
  private readonly categoriasApi = inject(CategoriasService);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);
  readonly privacidade = inject(PrivacidadeValoresService);
  readonly moeda = formatarMoeda;
  readonly cartaoId = Number(this.rota.snapshot.paramMap.get('cartaoId'));
  private readonly chaveIdempotencia = crypto.randomUUID();
  private proximoId = 1;

  readonly carregando = signal(true);
  readonly operando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly cartao = signal<CartaoCredito | null>(null);
  readonly categorias = signal<Categoria[]>([]);
  readonly previa = signal<PreviaConciliacaoInicial | null>(null);

  competencia = this.rota.snapshot.queryParamMap.get('competencia') || dataHojeLocal().slice(0, 7);
  faturaBanco = '';
  linhas: Linha[] = [];
  incluirAjuste = false;
  ajusteDescricao = '';
  ajusteCategoriaId: number | null = null;
  ajusteValor = '';

  ngOnInit(): void {
    this.adicionarLinha();
    void this.carregar();
  }

  async carregar(): Promise<void> {
    if (!Number.isSafeInteger(this.cartaoId) || this.cartaoId <= 0) {
      this.erro.set('Cartão inválido.');
      this.carregando.set(false);
      return;
    }
    try {
      const dados = await firstValueFrom(forkJoin({
        cartao: this.api.buscar(this.cartaoId),
        categorias: this.categoriasApi.listar(),
      }));
      if (this.destruir.destroyed) return;
      if (!dados.cartao.ativo) { this.erro.set('Cartão inativo.'); return; }
      this.cartao.set(dados.cartao);
      this.categorias.set(dados.categorias.filter(c => c.ativo && c.tipo === 'DESPESA'));
    } catch (erro) {
      if (!this.destruir.destroyed) this.erro.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruir.destroyed) this.carregando.set(false);
    }
  }

  adicionarLinha(): void {
    this.linhas.push({
      idLocal: this.proximoId++, descricao: '', categoriaId: null,
      valorParcela: '', numeroParcela: 1, quantidadeParcelas: 1,
    });
    this.alterou();
  }

  removerLinha(id: number): void {
    if (this.linhas.length <= 1) return;
    this.linhas = this.linhas.filter(l => l.idLocal !== id);
    this.alterou();
  }

  alterou(): void {
    this.previa.set(null);
    this.erro.set(null);
  }

  private validarValor(valor: string, permitirNegativo: boolean): string | null {
    const texto = permitirNegativo ? normalizarDecimalBr(valor) : decimalPositivo(valor);
    if (texto === null || !/^-?\d+(?:\.\d{1,2})?$/.test(texto)
        || (!permitirNegativo && texto.startsWith('-'))
        || (permitirNegativo && !/[1-9]/.test(texto))) return null;
    return texto;
  }

  private preparar(): DadosConciliacaoInicial | null {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(this.competencia)) {
      this.erro.set('Selecione o mês de referência da fatura.');
      return null;
    }
    const banco = normalizarDecimalBr(this.faturaBanco);
    if (banco === null || banco.startsWith('-') || !/^\d+(?:\.\d{1,2})?$/.test(banco)) {
      this.erro.set('Informe o valor da fatura bancária em reais e centavos.');
      return null;
    }
    if (!this.linhas.length || this.linhas.length > 30) {
      this.erro.set('Informe de 1 a 30 itens.');
      return null;
    }
    const itens: ItemConciliacaoInicial[] = [];
    for (const linha of this.linhas) {
      const valor = this.validarValor(linha.valorParcela, false);
      if (!linha.descricao.trim() || linha.descricao.trim().length > 200 ||
          !linha.categoriaId || !this.categorias().some(c => c.id === linha.categoriaId) ||
          valor === null || !Number.isInteger(linha.numeroParcela) ||
          !Number.isInteger(linha.quantidadeParcelas) || linha.numeroParcela < 1 ||
          linha.quantidadeParcelas > 500 || linha.numeroParcela > linha.quantidadeParcelas) {
        this.erro.set('Confira descrição, categoria, valor e numeração de cada parcela.');
        return null;
      }
      itens.push({
        descricao: linha.descricao.trim(), categoriaId: linha.categoriaId, valorParcela: valor,
        numeroParcela: linha.numeroParcela, quantidadeParcelas: linha.quantidadeParcelas,
      });
    }
    let ajuste = null;
    if (this.incluirAjuste) {
      const valor = this.validarValor(this.ajusteValor, true);
      if (!this.ajusteDescricao.trim() || !this.ajusteCategoriaId || valor === null) {
        this.erro.set('O ajuste precisa de descrição, categoria e valor (positivo ou negativo).');
        return null;
      }
      ajuste = {
        descricao: this.ajusteDescricao.trim(), categoriaId: this.ajusteCategoriaId, valor,
      };
    }
    return {
      chaveIdempotencia: this.chaveIdempotencia, competencia: this.competencia,
      valorFaturaBanco: banco, itens, ajuste,
    };
  }

  async conferir(): Promise<void> {
    if (this.operando() || this.carregando()) return;
    const dados = this.preparar();
    if (!dados) return;
    this.operando.set(true);
    this.erro.set(null);
    try {
      const previa = await firstValueFrom(this.api.previaConciliacaoInicial(this.cartaoId, dados));
      if (!this.destruir.destroyed) this.previa.set(previa);
    } catch (erro) {
      if (!this.destruir.destroyed) this.erro.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruir.destroyed) this.operando.set(false);
    }
  }

  diferencaZerada(valor: number | string): boolean { return Number(valor) === 0; }

  async confirmar(): Promise<void> {
    if (this.operando() || !this.previa() || Number(this.previa()!.diferenca) !== 0) return;
    const dados = this.preparar();
    if (!dados) return;
    this.operando.set(true);
    this.erro.set(null);
    try {
      const resultado = await firstValueFrom(this.api.confirmarConciliacaoInicial(this.cartaoId, dados));
      if (this.destruir.destroyed) return;
      await this.router.navigate(['/cartoes', this.cartaoId], {
        queryParams: {
          competencia: resultado.competencia, resultado: 'conciliacao-concluida',
        },
      });
    } catch (erro) {
      if (!this.destruir.destroyed) this.erro.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruir.destroyed) this.operando.set(false);
    }
  }
}
