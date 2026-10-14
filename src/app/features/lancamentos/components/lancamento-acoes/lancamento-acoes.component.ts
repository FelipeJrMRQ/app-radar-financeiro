import { Component, DestroyRef, EventEmitter, inject, Injector, input, Output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { mensagemDeErro } from '../../../../core/http/api-error';
import { MoedaBrInputDirective } from '../../../../shared/directives/moeda-br-input.directive';
import { dataHojeLocal, decimalPositivo, formatarDataLocal, formatarMoeda } from '../../../../shared/valor-monetario';
import {
  EscopoSequencia, Lancamento, permiteSequencia, ResumoRealizacoesLancamento,
} from '../../models/lancamento.model';
import { LancamentosService } from '../../services/lancamentos.service';

type Acao = 'EXCLUIR' | 'CONFIRMAR' | 'PARCIAL' | 'REALIZACOES' | null;

@Component({
  selector: 'app-lancamento-acoes',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MoedaBrInputDirective],
  templateUrl: './lancamento-acoes.component.html',
  styleUrl: './lancamento-acoes.component.scss',
})
export class LancamentoAcoesComponent {
  private readonly injector = inject(Injector);
  private get api(): LancamentosService { return this.injector.get(LancamentosService); }
  private readonly destroy = inject(DestroyRef);
  private destruido = false;

  readonly lancamentoId = input.required<number>();
  readonly escuro = input(false);
  @Output() readonly alterado = new EventEmitter<void>();

  readonly aberto = signal(false);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly mensagem = signal<string | null>(null);
  readonly atual = signal<Lancamento | null>(null);
  readonly resumo = signal<ResumoRealizacoesLancamento | null>(null);
  readonly acao = signal<Acao>(null);
  readonly escopo = signal<EscopoSequencia>('ATUAL');
  readonly valor = new FormControl('', { nonNullable: true });
  readonly data = new FormControl(dataHojeLocal(), { nonNullable: true });
  readonly moeda = formatarMoeda;
  readonly formatarData = formatarDataLocal;
  readonly podeSequencia = () => {
    const l = this.atual();
    return !!l && permiteSequencia(l, dataHojeLocal());
  };

  constructor() { this.destroy.onDestroy(() => { this.destruido = true; }); }

  async alternarMenu(): Promise<void> {
    if (this.aberto()) { this.fechar(); return; }
    this.aberto.set(true);
    this.erro.set(null);
    this.mensagem.set(null);
    this.carregando.set(true);
    try {
      const item = await firstValueFrom(this.api.buscar(this.lancamentoId()));
      if (!this.destruido) this.atual.set(item);
    } catch (e) {
      if (!this.destruido) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruido) this.carregando.set(false);
    }
  }

  fechar(): void {
    if (this.salvando()) return;
    this.aberto.set(false);
    this.acao.set(null);
    this.resumo.set(null);
    this.erro.set(null);
  }

  escolher(acao: Exclude<Acao, null>): void {
    if (this.salvando()) return;
    this.acao.set(acao);
    this.escopo.set('ATUAL');
    this.erro.set(null);
    this.mensagem.set(null);
    this.resumo.set(null);
    this.valor.setValue('');
    this.data.setValue(dataHojeLocal());
    if (acao === 'REALIZACOES') void this.consultarRealizacoes();
  }

  async consultarRealizacoes(): Promise<void> {
    this.carregando.set(true);
    try {
      const r = await firstValueFrom(this.api.realizacoes(this.lancamentoId()));
      if (!this.destruido) this.resumo.set(r);
    } catch (e) {
      if (!this.destruido) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruido) this.carregando.set(false);
    }
  }

  definirEscopo(valor: EscopoSequencia): void {
    if (valor === 'SEGUINTES' && !this.podeSequencia()) return;
    this.escopo.set(valor);
  }

  async executar(): Promise<void> {
    if (this.salvando() || this.carregando() || !this.atual()) return;
    const l = this.atual()!;
    const acao = this.acao();
    if (!acao || acao === 'REALIZACOES') return;
    if (this.escopo() === 'SEGUINTES' && !this.podeSequencia()) {
      this.erro.set('A edição ou exclusão de sequência só é permitida a partir de datas atuais ou futuras.');
      return;
    }
    const valor = acao === 'EXCLUIR' ? null : decimalPositivo(this.valor.value);
    if (acao !== 'EXCLUIR' && (!valor || !this.data.value || this.data.value > dataHojeLocal())) {
      this.erro.set('Informe um valor positivo e uma data efetiva que não seja futura.');
      return;
    }
    this.salvando.set(true);
    this.erro.set(null);
    try {
      if (acao === 'EXCLUIR') {
        await firstValueFrom(this.api.excluir(l.id, this.escopo(), l.parcelamentoLancamentoId != null));
      } else if (acao === 'CONFIRMAR') {
        await firstValueFrom(this.api.confirmar(l.id,
          { valorEfetivo: valor!, dataEfetiva: this.data.value }));
      } else {
        await firstValueFrom(this.api.realizarParcialmente(l.id,
          { valorEfetivo: valor!, dataEfetiva: this.data.value }));
      }
      if (this.destruido) return;
      this.acao.set(null);
      this.aberto.set(false);
      this.mensagem.set(null);
      this.alterado.emit();
    } catch (e) {
      if (!this.destruido) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruido) this.salvando.set(false);
    }
  }

  async estornar(realizacaoId: number): Promise<void> {
    if (this.salvando()) return;
    this.salvando.set(true);
    this.erro.set(null);
    try {
      await firstValueFrom(this.api.estornar(this.lancamentoId(), realizacaoId));
      if (this.destruido) return;
      this.mensagem.set('Realização estornada.');
      await this.consultarRealizacoes();
      this.alterado.emit();
    } catch (e) {
      if (!this.destruido) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruido) this.salvando.set(false);
    }
  }
}
