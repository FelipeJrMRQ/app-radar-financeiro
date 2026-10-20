import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { FeedbackOperacoesService } from '../core/feedback/feedback-operacoes.service';
import { PrivacidadeValoresService } from '../core/privacidade/privacidade-valores.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { grupoNavegacao } from './navegacao-grupos';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FontAwesomeModule],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  readonly sessao = inject(AuthService);
  readonly privacidade = inject(PrivacidadeValoresService);
  readonly iconeOlho = faEye;
  readonly iconeOlhoFechado = faEyeSlash;
  readonly feedbackOperacoes = inject(FeedbackOperacoesService);
  private readonly router = inject(Router);
  private readonly rotaAtual = signal(this.router.url);
  readonly cadastrosAtivo = computed(() => grupoNavegacao(this.rotaAtual()) === 'cadastros');
  readonly configuracoesAtivo = computed(() => grupoNavegacao(this.rotaAtual()) === 'configuracoes');
  readonly cadastroLancamentoAtivo = computed(() =>
    this.rotaAtual().split(/[?#]/, 1)[0] === '/lancamentos/novo');

  constructor() {
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(evento => this.rotaAtual.set(evento.urlAfterRedirects));
  }

  sair(): void {
    this.feedbackOperacoes.limpar();
    this.privacidade.ocultar();
    this.sessao.sair();
    void this.router.navigateByUrl('/entrar');
  }
}
