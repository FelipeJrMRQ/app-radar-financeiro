import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { grupoNavegacao } from './navegacao-grupos';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  readonly sessao = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rotaAtual = signal(this.router.url);
  readonly cadastrosAtivo = computed(() => grupoNavegacao(this.rotaAtual()) === 'cadastros');
  readonly configuracoesAtivo = computed(() => grupoNavegacao(this.rotaAtual()) === 'configuracoes');

  constructor() {
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(evento => this.rotaAtual.set(evento.urlAfterRedirects));
  }

  sair(): void {
    this.sessao.sair();
    void this.router.navigateByUrl('/entrar');
  }
}
