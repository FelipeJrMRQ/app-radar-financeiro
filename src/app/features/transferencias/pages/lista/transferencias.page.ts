import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { mensagemDeErro } from '../../../../core/http/api-error';
import { MoedaBrInputDirective } from '../../../../shared/directives/moeda-br-input.directive';
import {
  dataHojeLocal, decimalPositivo, formatarDataLocal, formatarMoeda,
} from '../../../../shared/valor-monetario';
import { Transferencia } from '../../models/transferencia.model';
import { TransferenciasService } from '../../services/transferencias.service';

@Component({
  selector: 'app-transferencias-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MoedaBrInputDirective],
  templateUrl: './transferencias.page.html',
  styleUrl: './transferencias.page.scss',
})
export class TransferenciasPage implements OnInit {
  private readonly api = inject(TransferenciasService);
  private readonly rota = inject(ActivatedRoute);
  private readonly destruir = inject(DestroyRef);
  private versao = 0;

  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly operando = signal(false);
  readonly erroAcao = signal<string | null>(null);
  readonly lista = signal<Transferencia[]>([]);
  readonly mes = signal(this.mesInicial());
  readonly mesDescricao = computed(() => new Intl.DateTimeFormat('pt-BR',
    { month: 'long', year: 'numeric' }).format(this.mes()));
  readonly exibicao = computed(() => {
    const mes = this.mes();
    const prefixo = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}-`;
    return this.lista().filter(item => item.ativo && item.dataTransferencia.startsWith(prefixo))
      .sort((a, b) => b.dataTransferencia.localeCompare(a.dataTransferencia) || b.id - a.id);
  });
  readonly visiveis = computed(() => this.exibicao().slice(0, this.limite()));
  readonly limite = signal(30);
  readonly selecionada = signal<Transferencia | null>(null);
  readonly acao = signal<'CONFIRMAR' | 'EXCLUIR' | null>(null);
  readonly valorEfetivo = new FormControl('', { nonNullable: true });
  readonly dataEfetiva = new FormControl(dataHojeLocal(), { nonNullable: true });
  readonly data = formatarDataLocal;
  readonly moeda = formatarMoeda;
  readonly mensagemSucesso = signal<string | null>(null);

  private mesInicial(): Date {
    const parametro = this.rota.snapshot.queryParamMap.get('mes');
    if (parametro && /^\d{4}-(0[1-9]|1[0-2])$/.test(parametro)) {
      return new Date(Number(parametro.slice(0, 4)), Number(parametro.slice(5, 7)) - 1, 1);
    }
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  }

  ngOnInit(): void {
    const resultado = this.rota.snapshot.queryParamMap.get('resultado');
    if (resultado === 'criada') this.mensagemSucesso.set('Transferência registrada com sucesso.');
    if (resultado === 'editada') this.mensagemSucesso.set('Transferência atualizada com sucesso.');
    void this.carregar();
  }

  async carregar(): Promise<void> {
    const versao = ++this.versao;
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const lista = await firstValueFrom(this.api.listar());
      if (!this.destruir.destroyed && this.versao === versao) this.lista.set(lista.filter(t => t.ativo));
    } catch (e) {
      if (!this.destruir.destroyed && this.versao === versao) this.erro.set(mensagemDeErro(e));
    } finally {
      if (!this.destruir.destroyed && this.versao === versao) this.carregando.set(false);
    }
  }

  mudarMes(passo: number): void {
    const anterior = this.mes();
    this.mes.set(new Date(anterior.getFullYear(), anterior.getMonth() + passo, 1));
    this.limite.set(30);
    this.fecharAcao();
  }

  mostrarMais(): void { this.limite.update(valor => valor + 30); }

  prepararAcao(transferencia: Transferencia, acao: 'CONFIRMAR' | 'EXCLUIR'): void {
    if (this.operando()) return;
    this.selecionada.set(transferencia);
    this.acao.set(acao);
    this.erroAcao.set(null);
    if (acao === 'CONFIRMAR') {
      this.valorEfetivo.setValue(String(transferencia.valor).replace('.', ','));
      this.dataEfetiva.setValue(dataHojeLocal());
    }
  }

  fecharAcao(): void {
    if (this.operando()) return;
    this.selecionada.set(null);
    this.acao.set(null);
    this.erroAcao.set(null);
  }

  async executarAcao(): Promise<void> {
    const item = this.selecionada();
    const acao = this.acao();
    if (!item || !acao || this.operando()) return;
    const valor = acao === 'CONFIRMAR' ? decimalPositivo(this.valorEfetivo.value) : null;
    if (acao === 'CONFIRMAR' &&
        (item.situacao !== 'PREVISTO' || valor === null || !this.dataEfetiva.value
          || this.dataEfetiva.value > dataHojeLocal())) {
      this.erroAcao.set('Informe valor efetivo positivo e data não futura para confirmar a transferência.');
      return;
    }
    this.operando.set(true);
    this.erroAcao.set(null);
    try {
      if (acao === 'EXCLUIR') {
        await firstValueFrom(this.api.excluir(item.id));
        this.mensagemSucesso.set('Transferência excluída com sucesso.');
      } else {
        await firstValueFrom(this.api.confirmar(item.id, {
          valorEfetivo: valor!, dataEfetiva: this.dataEfetiva.value,
        }));
        this.mensagemSucesso.set('Transferência confirmada com sucesso.');
      }
      if (this.destruir.destroyed) return;
      this.acao.set(null);
      this.selecionada.set(null);
      await this.carregar();
    } catch (e) {
      if (!this.destruir.destroyed) this.erroAcao.set(mensagemDeErro(e));
    } finally {
      if (!this.destruir.destroyed) this.operando.set(false);
    }
  }
}
