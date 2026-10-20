import { Component, computed, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { FeedbackOperacoesService } from '../core/feedback/feedback-operacoes.service';
import { PrivacidadeValoresService } from '../core/privacidade/privacidade-valores.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowRightFromBracket, faChevronDown, faEye, faEyeSlash,
  faArrowDown, faArrowRightArrowLeft, faArrowUp, faFolderOpen, faGear,
  faListUl, faPlus, faTableCellsLarge,
} from '@fortawesome/free-solid-svg-icons';
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
  readonly iconeInicio = faTableCellsLarge;
  readonly iconeLancamentos = faListUl;
  readonly iconeCadastros = faFolderOpen;
  readonly iconeConfiguracoes = faGear;
  readonly iconeExpandir = faChevronDown;
  readonly iconeSair = faArrowRightFromBracket;
  readonly iconeNovoLancamento = faPlus;
  readonly iconeReceita = faArrowDown;
  readonly iconeDespesa = faArrowUp;
  readonly iconeTransferencia = faArrowRightArrowLeft;
  readonly menuLancamentoAberto = signal(false);
  private readonly areaAcoes = viewChild<ElementRef<HTMLElement>>('areaAcoes');
  private readonly botaoAcoes = viewChild<ElementRef<HTMLButtonElement>>('botaoAcoes');

  abrirMenuLancamento(): void {
    this.menuLancamentoAberto.set(true);
  }

  alternarMenuLancamento(): void {
    this.menuLancamentoAberto.update(valor => !valor);
  }

  fecharMenuLancamento(): void {
    this.menuLancamentoAberto.set(false);
  }

  aoEntrarPonteiro(evento: PointerEvent): void {
    if (evento.pointerType === 'mouse') this.abrirMenuLancamento();
  }

  aoSairPonteiro(evento: PointerEvent): void {
    if (evento.pointerType === 'mouse') this.fecharMenuLancamento();
  }

  aoPerderFoco(evento: FocusEvent): void {
    const proximo = evento.relatedTarget;
    if (!(proximo instanceof Node) || !this.areaAcoes()?.nativeElement.contains(proximo)) {
      this.fecharMenuLancamento();
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  aoClicarFora(evento: PointerEvent): void {
    const alvo = evento.target;
    if (this.menuLancamentoAberto() && alvo instanceof Node
        && !this.areaAcoes()?.nativeElement.contains(alvo)) {
      this.fecharMenuLancamento();
    }
  }

  @HostListener('document:keydown.escape')
  aoPressionarEscape(): void {
    if (!this.menuLancamentoAberto()) return;
    this.fecharMenuLancamento();
    this.botaoAcoes()?.nativeElement.focus();
  }
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
    ).subscribe(evento => {
      this.rotaAtual.set(evento.urlAfterRedirects);
      this.fecharMenuLancamento();
    });
  }

  sair(): void {
    this.fecharMenuLancamento();
    this.feedbackOperacoes.limpar();
    this.privacidade.ocultar();
    this.sessao.sair();
    void this.router.navigateByUrl('/entrar');
  }
}
