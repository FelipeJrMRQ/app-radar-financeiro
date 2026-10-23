import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { mensagemDeErro } from '../../../../core/http/api-error';
import { PrivacidadeValoresService } from '../../../../core/privacidade/privacidade-valores.service';
import { formatarMoeda } from '../../../../shared/valor-monetario';
import { CompraCartao } from '../../models/cartao.model';
import { CartoesService } from '../../services/cartoes.service';

@Component({
  selector: 'app-corrigir-parcelamento',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <section class="cartoes-page" style="max-width:720px;margin-inline:auto">
      <a class="cartoes-back" [routerLink]="['/cartoes', cartaoId]">← Voltar ao cartão</a>
      <header class="cartoes-heading">
        <div>
          <span class="cartoes-eyebrow">CONCILIAÇÃO INICIAL</span>
          <h1>Corrigir parcelas</h1>
          <p>Use esta correção apenas quando uma parcela da fatura inicial foi
             registrada como 1/1 por engano.</p>
        </div>
      </header>

      @if (erro()) { <p class="cartoes-error" role="alert">{{ erro() }}</p> }
      @if (carregando()) {
        <p role="status">Carregando registro…</p>
      } @else if (compra(); as item) {
        <div class="cartoes-form-card">
          <h2>{{ item.descricao }}</h2>
          <p class="cartoes-note">Categoria: {{ item.categoriaNome }}</p>
          <p class="cartoes-note">Parcela cadastrada: <strong>1/1</strong></p>
          <p class="cartoes-note">Valor desta parcela:
            <strong>{{ privacidade.valoresVisiveis() ? moeda(item.valorTotal) : '••••••' }}</strong>
          </p>
          <p class="cartoes-note">O valor da parcela atual não será alterado.
             As parcelas anteriores já pagas não serão criadas no Radar.</p>

          <div class="cartoes-field-grid">
            <div class="cartoes-field">
              <label for="parcela-atual">Número real da parcela nesta fatura</label>
              <input id="parcela-atual" type="number" min="1" max="500"
                [(ngModel)]="parcelaAtual" />
            </div>
            <div class="cartoes-field">
              <label for="total-parcelas">Quantidade total de parcelas da compra</label>
              <input id="total-parcelas" type="number" min="2" max="500"
                [(ngModel)]="totalParcelas" />
            </div>
          </div>
          @if (numerosValidos()) {
            <p class="cartoes-note">
              O Radar manterá a parcela {{ parcelaAtual }}/{{ totalParcelas }}
              na fatura inicial e criará as
              {{ totalParcelas - parcelaAtual }} parcelas futuras restantes.
              A soma desta fatura não será modificada.
            </p>
          }
          <label class="cartoes-note" style="display:flex;align-items:center;gap:10px;margin-top:18px">
            <input type="checkbox" [(ngModel)]="conferido" style="width:18px;height:18px" />
            Conferi os números com minha fatura do banco.
          </label>
          <div class="cartoes-acoes" style="margin-top:20px">
            <a class="cartoes-secondary" [routerLink]="['/cartoes', cartaoId]">Cancelar</a>
            <button class="cartoes-primary" type="button" (click)="salvar()"
              [disabled]="salvando() || !numerosValidos() || !conferido">
              {{ salvando() ? 'Salvando…' : 'Confirmar correção das parcelas' }}
            </button>
          </div>
        </div>
      }
    </section>
  `,
})
export class CorrigirParcelamentoPage implements OnInit {
  private readonly api = inject(CartoesService);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);
  readonly privacidade = inject(PrivacidadeValoresService);
  readonly moeda = formatarMoeda;

  readonly cartaoId = Number(this.rota.snapshot.paramMap.get('cartaoId'));
  readonly compraId = Number(this.rota.snapshot.paramMap.get('compraId'));
  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly compra = signal<CompraCartao | null>(null);
  parcelaAtual = 1;
  totalParcelas = 2;
  conferido = false;

  ngOnInit(): void { void this.carregar(); }

  numerosValidos(): boolean {
    return Number.isInteger(this.parcelaAtual) && Number.isInteger(this.totalParcelas)
      && this.parcelaAtual >= 1 && this.totalParcelas >= 2
      && this.totalParcelas <= 500 && this.parcelaAtual <= this.totalParcelas;
  }

  async carregar(): Promise<void> {
    if (!Number.isSafeInteger(this.cartaoId) || this.cartaoId < 1 ||
        !Number.isSafeInteger(this.compraId) || this.compraId < 1) {
      this.erro.set('Identificador de compra ou cartão inválido.');
      this.carregando.set(false);
      return;
    }
    try {
      const item = await firstValueFrom(this.api.buscarCompra(this.cartaoId, this.compraId));
      if (this.destruir.destroyed) return;
      if (!item.ativo || item.origem !== 'CONCILIACAO' ||
          item.quantidadeParcelas !== 1 || item.parcelaInicial !== 1) {
        this.erro.set('A correção está disponível somente para itens 1/1 da conciliação inicial.');
        return;
      }
      this.compra.set(item);
    } catch (erro) {
      if (!this.destruir.destroyed) this.erro.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruir.destroyed) this.carregando.set(false);
    }
  }

  async salvar(): Promise<void> {
    if (this.carregando() || this.salvando() || !this.compra() ||
        !this.conferido || !this.numerosValidos()) return;
    this.salvando.set(true);
    this.erro.set(null);
    try {
      const resultado = await firstValueFrom(this.api.corrigirParcelamentoInicial(
        this.cartaoId, this.compraId, {
          parcelaAtual: this.parcelaAtual, totalParcelas: this.totalParcelas,
        }));
      if (this.destruir.destroyed) return;
      await this.router.navigate(['/cartoes', this.cartaoId], {
        queryParams: {
          competencia: resultado.competencia, resultado: 'parcelas-corrigidas',
        },
      });
    } catch (erro) {
      if (!this.destruir.destroyed) this.erro.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruir.destroyed) this.salvando.set(false);
    }
  }
}
