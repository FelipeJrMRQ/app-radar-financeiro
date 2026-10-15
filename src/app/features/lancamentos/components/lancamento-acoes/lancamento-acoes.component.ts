import { Component, computed, DestroyRef, ElementRef, EventEmitter, HostListener, inject, Injector, input, Output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';

import { mensagemDeErro } from '../../../../core/http/api-error';
import { MoedaBrInputDirective } from '../../../../shared/directives/moeda-br-input.directive';
import { dataHojeLocal, decimalPositivo, formatarDataLocal, formatarMoeda } from '../../../../shared/valor-monetario';
import {
  EscopoSequencia, Lancamento, permiteSequencia, ResumoRealizacoesLancamento,
} from '../../models/lancamento.model';
import { LancamentosService } from '../../services/lancamentos.service';
import { FeedbackOperacoesService } from '../../../../core/feedback/feedback-operacoes.service';
import { MenuLancamentosService } from '../../services/menu-lancamentos.service';

type Acao = 'EXCLUIR' | 'ESTORNAR_CONFIRMACAO' | 'PARCIAL' | 'REALIZACOES' | null;

@Component({
  selector: 'app-lancamento-acoes',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MoedaBrInputDirective],
  templateUrl: './lancamento-acoes.component.html',
  styleUrl: './lancamento-acoes.component.scss',
})
export class LancamentoAcoesComponent {
  private readonly injector = inject(Injector);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly menu = inject(MenuLancamentosService);
  private get api(): LancamentosService { return this.injector.get(LancamentosService); }
  private readonly destroy = inject(DestroyRef);
  private readonly feedback = inject(FeedbackOperacoesService);
  private destruido = false;

  readonly lancamentoId = input.required<number>();
  readonly escuro = input(false);
  @Output() readonly alterado = new EventEmitter<void>();

  readonly aberto = computed(() => this.menu.ativo() === this.lancamentoId());
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly mensagem = signal<string | null>(null);
  readonly aguardandoEstorno = signal<number | null>(null);
  // O resumo da API é a fonte de verdade para habilitar a exclusão.
  // Se a consulta falhar, a ação permanece bloqueada por segurança.
  readonly resumoAbertura = signal<ResumoRealizacoesLancamento | null>(null);
  readonly exclusaoRecusada = signal(false);
  readonly possuiRealizacoes = computed(() => (this.resumoAbertura()?.realizacoes.length ?? 0) > 0);
  readonly podeExcluir = computed(() => this.resumoAbertura() !== null
    && !this.possuiRealizacoes() && !this.exclusaoRecusada());
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

  constructor() {
    this.destroy.onDestroy(() => {
      this.destruido = true;
      if (this.aberto()) this.menu.fechar(this.lancamentoId());
    });
  }

  @HostListener('document:keydown.escape')
  fecharComEscape(): void { if (this.aberto()) this.fechar(); }

  @HostListener('document:pointerdown', ['$event'])
  fecharFora(evento: PointerEvent): void {
    if (this.aberto() && !this.host.nativeElement.contains(evento.target as Node)) this.fechar();
  }

  async alternarMenu(): Promise<void> {
    if (this.aberto()) { this.fechar(); return; }
    this.menu.abrir(this.lancamentoId());
    this.erro.set(null);
    this.mensagem.set(null);
    this.aguardandoEstorno.set(null);
    this.resumoAbertura.set(null);
    this.exclusaoRecusada.set(false);
    this.acao.set(null);
    this.resumo.set(null);
    this.atual.set(null);
    this.carregando.set(true);
    try {
      const resultado = await firstValueFrom(forkJoin({
        item: this.api.buscar(this.lancamentoId()),
        resumo: this.api.realizacoes(this.lancamentoId()).pipe(catchError(() => of(null))),
      }));
      if (!this.destruido && this.aberto()) {
        this.atual.set(resultado.item);
        this.resumoAbertura.set(resultado.resumo);
      }
    } catch (e) {
      if (!this.destruido) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruido) this.carregando.set(false);
    }
  }

  fechar(): void {
    if (this.salvando()) return;
    this.menu.fechar(this.lancamentoId());
    this.acao.set(null);
    this.resumo.set(null);
    this.erro.set(null);
    this.aguardandoEstorno.set(null);
  }

  escolher(acao: Exclude<Acao, null>): void {
    if (this.salvando()) return;
    this.acao.set(acao);
    this.escopo.set('ATUAL');
    this.erro.set(null);
    this.mensagem.set(null);
    this.resumo.set(null);
    this.aguardandoEstorno.set(null);
    this.valor.setValue('');
    this.data.setValue(dataHojeLocal());
    if (acao === 'REALIZACOES') void this.consultarRealizacoes();
  }

  /** Uma ação confirma integralmente o registro selecionado, pelo valor do backend. */
  async confirmarIntegral(): Promise<void> {
    const l = this.atual();
    if (!l || !l.ativo || l.situacao !== 'PREVISTO' ||
        this.carregando() || this.salvando()) return;
    this.salvando.set(true);
    this.erro.set(null);
    this.feedback.limpar();
    try {
      await firstValueFrom(this.api.confirmarAutomaticamente(l.id));
      if (this.destruido) return;
      this.menu.fechar(this.lancamentoId());
      this.acao.set(null);
      this.atual.set({ ...l, situacao: 'CONFIRMADO' });
      this.feedback.mostrar((l.tipo === 'DESPESA' ? 'Pagamento' : 'Recebimento') +
        ' confirmado com sucesso' +
        (this.possuiRealizacoes() ? ' (saldo restante quitado)' : '') + '.');
      this.alterado.emit();
    } catch (e) {
      if (!this.destruido) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruido) this.salvando.set(false);
    }
  }

  async consultarRealizacoes(): Promise<void> {
    this.erro.set(null);
    this.carregando.set(true);
    try {
      const r = await firstValueFrom(this.api.realizacoes(this.lancamentoId()));
      if (!this.destruido && this.aberto()) {
        this.resumo.set(r);
        this.resumoAbertura.set(r);
        this.exclusaoRecusada.set(false);
      }
    } catch (e) {
      if (!this.destruido && this.aberto()) {
        this.resumoAbertura.set(null);
        this.erro.set('Não foi possível consultar as realizações. ' + mensagemDeErro(e));
      }
    } finally {
      if (!this.destruido) this.carregando.set(false);
    }
  }

  definirEscopo(valor: EscopoSequencia): void {
    if (valor === 'SEGUINTES' && !this.podeSequencia()) return;
    if (valor !== this.escopo()) {
      this.exclusaoRecusada.set(false);
      this.erro.set(null);
    }
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
    const valor = acao === 'PARCIAL' ? decimalPositivo(this.valor.value) : null;
    if (acao === 'PARCIAL' && (!valor || !this.data.value || this.data.value > dataHojeLocal())) {
      this.erro.set('Informe um valor positivo e uma data efetiva que não seja futura.');
      return;
    }
    if (acao === 'EXCLUIR' && !this.podeExcluir()) {
      this.erro.set(this.possuiRealizacoes()
        ? 'Este lançamento possui pagamentos ou recebimentos registrados. Consulte as realizações antes de excluir.'
        : this.resumoAbertura() === null
          ? 'Não foi possível verificar as realizações financeiras. A exclusão está indisponível até a consulta funcionar.'
          : 'A exclusão foi recusada pela API. Revise as realizações e verifique novamente.');
      return;
    }
    this.salvando.set(true);
    this.erro.set(null);
    try {
      if (acao === 'EXCLUIR') {
        await firstValueFrom(this.api.excluir(l.id, this.escopo(), l.parcelamentoLancamentoId != null));
      } else if (acao === 'ESTORNAR_CONFIRMACAO') {
        await firstValueFrom(this.api.desfazerConfirmacao(l.id));
      } else if (acao === 'PARCIAL') {
        await firstValueFrom(this.api.realizarParcialmente(l.id,
          { valorEfetivo: valor!, dataEfetiva: this.data.value }));
      }
      if (this.destruido) return;
      this.acao.set(null);
      this.menu.fechar(this.lancamentoId());
      this.mensagem.set(null);
      this.feedback.mostrar(acao === 'EXCLUIR' ? 'Lançamento excluído com sucesso.'
        : acao === 'ESTORNAR_CONFIRMACAO' ? 'Confirmação desfeita com sucesso.'
        : 'Realização parcial registrada com sucesso.');
      this.alterado.emit();
    } catch (e) {
      if (!this.destruido) {
        if (acao === 'EXCLUIR' && e instanceof HttpErrorResponse && e.status === 422) {
          this.exclusaoRecusada.set(true);
          this.erro.set(this.mensagemExclusaoRecusada(mensagemDeErro(e)));
        } else {
          this.erro.set(mensagemDeErro(e));
        }
      }
    } finally {
      if (!this.destruido) this.salvando.set(false);
    }
  }

  private mensagemExclusaoRecusada(mensagem: string): string {
    const detalhe = mensagem.toLocaleLowerCase('pt-BR');
    if (detalhe.includes('parcelas inativas, retroativas ou realizadas')) {
      return 'Não foi possível excluir as parcelas restantes: uma ou mais estão inativas, '
        + 'possuem data passada ou têm movimentações registradas. Revise cada parcela individualmente.';
    }
    if (detalhe.includes('realização financeira') || detalhe.includes('realizações financeiras')) {
      return this.escopo() === 'SEGUINTES'
        ? 'Não foi possível excluir a sequência: outra ocorrência pode ter pagamentos ou recebimentos '
          + 'registrados. Revise cada ocorrência e estorne somente registros feitos por engano.'
        : 'Este lançamento tem pagamentos ou recebimentos registrados e não pode ser excluído. '
          + 'Consulte as realizações e estorne somente registros feitos por engano.';
    }
    return mensagem;
  }

  prepararEstorno(realizacaoId: number): void {
    this.aguardandoEstorno.set(realizacaoId);
    this.erro.set(null);
  }

  async estornar(realizacaoId: number): Promise<void> {
    if (this.aguardandoEstorno() !== realizacaoId) return;
    if (this.salvando()) return;
    this.salvando.set(true);
    this.erro.set(null);
    try {
      await firstValueFrom(this.api.estornar(this.lancamentoId(), realizacaoId));
      if (this.destruido) return;
      this.mensagem.set('Realização estornada.');
      this.feedback.mostrar('Realização financeira estornada com sucesso.');
      this.aguardandoEstorno.set(null);
      await this.consultarRealizacoes();
      this.alterado.emit();
    } catch (e) {
      if (!this.destruido) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruido) this.salvando.set(false);
    }
  }
}
