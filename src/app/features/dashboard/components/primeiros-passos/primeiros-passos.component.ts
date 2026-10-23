import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowRight, faCheckCircle, faCircle, faCreditCard, faListCheck,
  faPause, faPlay, faWallet,
} from '@fortawesome/free-solid-svg-icons';
import { firstValueFrom } from 'rxjs';

import {
  AcaoPrimeirosPassos, PrimeirosPassosService, ProgressoPrimeirosPassos,
} from '../../services/primeiros-passos.service';

@Component({
  selector: 'app-primeiros-passos',
  standalone: true,
  imports: [RouterLink, FontAwesomeModule],
  templateUrl: './primeiros-passos.component.html',
  styleUrl: './primeiros-passos.component.scss',
})
export class PrimeirosPassosComponent implements OnInit {
  private readonly servico = inject(PrimeirosPassosService);
  private readonly destruir = inject(DestroyRef);
  private destruido = false;

  readonly estado = signal<ProgressoPrimeirosPassos | null>(null);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly iconeConcluido = faCheckCircle;
  readonly iconePendente = faCircle;
  readonly iconeAvancar = faArrowRight;
  readonly iconePausar = faPause;
  readonly iconeRetomar = faPlay;
  readonly iconeConta = faWallet;
  readonly iconeLancamento = faListCheck;
  readonly iconeCartao = faCreditCard;

  constructor() {
    this.destruir.onDestroy(() => { this.destruido = true; });
  }

  ngOnInit(): void {
    void this.carregar();
  }

  quantidadeConcluida(progresso: ProgressoPrimeirosPassos): number {
    return [
      progresso.boasVindasConcluidas,
      progresso.primeiraContaConcluida,
      progresso.primeiroLancamentoConcluido,
      progresso.painelConhecido,
    ].filter(Boolean).length;
  }

  async carregar(): Promise<void> {
    try {
      const resposta = await firstValueFrom(this.servico.consultar());
      if (!this.destruido) this.estado.set(resposta);
    } catch {
      // Falha isolada: o dashboard financeiro continua disponível.
      if (!this.destruido) this.estado.set(null);
    }
  }

  async registrar(acao: AcaoPrimeirosPassos): Promise<void> {
    if (this.salvando()) return;
    this.salvando.set(true);
    this.erro.set(null);
    try {
      const resposta = await firstValueFrom(this.servico.registrar(acao));
      if (!this.destruido) this.estado.set(resposta);
    } catch {
      if (!this.destruido) this.erro.set('Não foi possível salvar seu progresso. Tente novamente.');
    } finally {
      if (!this.destruido) this.salvando.set(false);
    }
  }
}
