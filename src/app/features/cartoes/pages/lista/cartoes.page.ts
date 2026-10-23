import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { mensagemDeErro } from '../../../../core/http/api-error';
import { PrivacidadeValoresService } from '../../../../core/privacidade/privacidade-valores.service';
import { formatarMoeda } from '../../../../shared/valor-monetario';
import { CartaoCredito } from '../../models/cartao.model';
import { CartoesService } from '../../services/cartoes.service';

@Component({
  selector: 'app-cartoes',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cartoes.page.html',
})
export class CartoesPage implements OnInit {
  private readonly api = inject(CartoesService);
  readonly privacidade = inject(PrivacidadeValoresService);
  private readonly destruir = inject(DestroyRef);
  private revisao = 0;

  readonly carregando = signal(true);
  readonly operando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly sucesso = signal<string | null>(null);
  readonly cartoes = signal<CartaoCredito[]>([]);
  readonly confirmar = signal<CartaoCredito | null>(null);
  readonly moeda = formatarMoeda;

  ngOnInit(): void { void this.carregar(); }

  async carregar(): Promise<void> {
    const revisao = ++this.revisao;
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const resultado = await firstValueFrom(this.api.listar());
      if (this.destruir.destroyed || revisao !== this.revisao) return;
      this.cartoes.set(resultado.filter(c => c.ativo));
    } catch (erro) {
      if (!this.destruir.destroyed && revisao === this.revisao)
        this.erro.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruir.destroyed && revisao === this.revisao) this.carregando.set(false);
    }
  }

  prepararInativacao(cartao: CartaoCredito): void {
    this.confirmar.set(cartao);
    this.erro.set(null);
  }

  async inativar(): Promise<void> {
    const cartao = this.confirmar();
    if (!cartao || this.operando()) return;
    this.operando.set(true);
    this.erro.set(null);
    try {
      await firstValueFrom(this.api.inativar(cartao.id));
      if (this.destruir.destroyed) return;
      this.confirmar.set(null);
      this.sucesso.set('Cartão inativado com sucesso.');
      await this.carregar();
    } catch (erro) {
      if (!this.destruir.destroyed) this.erro.set(mensagemDeErro(erro));
    } finally {
      if (!this.destruir.destroyed) this.operando.set(false);
    }
  }
}
