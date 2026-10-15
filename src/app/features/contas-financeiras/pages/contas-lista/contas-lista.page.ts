import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { mensagemDeErro } from '../../../../core/http/api-error';
import { ContaFinanceira, SaldoContaFinanceira, descricaoTipoConta } from '../../models/contas-financeiras.model';
import { ContasFinanceirasService } from '../../services/contas-financeiras.service';
import { exibirMoeda, valorNegativo } from '../../utils/formatacao-contas';

interface ContaComSaldo {
  conta: ContaFinanceira;
  saldo: SaldoContaFinanceira | null;
  erroSaldo: string | null;
}

@Component({
  selector: 'app-contas-lista-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './contas-lista.page.html',
  styleUrl: './contas-lista.page.scss',
})
export class ContasListaPage implements OnInit {
  private readonly api = inject(ContasFinanceirasService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private destruido = false;
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly contas = signal<ContaComSaldo[]>([]);
  readonly mostrarInativas = signal(this.route.snapshot.queryParamMap.get('visualizar') === 'inativas');
  readonly visiveis = computed(() => this.contas().filter(item =>
    item.conta.ativo !== this.mostrarInativas()));
  readonly resultado = ({
    criada: 'Conta cadastrada com sucesso.',
    atualizada: 'Conta atualizada com sucesso.',
    excluida: 'Conta sem movimentações excluída definitivamente.',
    inativada: 'Conta inativada. O histórico financeiro permanece disponível.',
    reativada: 'Conta reativada com sucesso.',
  } as Record<string, string>)[this.route.snapshot.queryParamMap.get('resultado') ?? ''] ?? null;


  readonly moeda = exibirMoeda;
  readonly negativo = valorNegativo;
  readonly tipo = descricaoTipoConta;

  constructor() {
    this.destroyRef.onDestroy(() => { this.destruido = true; });
  }

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const contas = await firstValueFrom(this.api.listar(true));
      if (this.destruido) return;
      if (contas.length === 0) {
        this.contas.set([]);
        return;
      }
      const linhas = await firstValueFrom(forkJoin(contas.map((conta) =>
        this.api.consultarSaldo(conta.id).pipe(
          map((saldo): ContaComSaldo => ({ conta, saldo, erroSaldo: null })),
          catchError((erro: unknown) =>
            of<ContaComSaldo>({ conta, saldo: null, erroSaldo: mensagemDeErro(erro) })),
        ),
      )));
      if (!this.destruido) this.contas.set(linhas);
    } catch (erro) {
      if (!this.destruido) {
        this.contas.set([]);
        this.erro.set(mensagemDeErro(erro));
      }
    } finally {
      if (!this.destruido) this.carregando.set(false);
    }
  }
}
