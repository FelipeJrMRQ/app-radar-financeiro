import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="auth-layout">
      <section class="auth-brand" aria-label="Sobre o Radar Financeiro">
        <a routerLink="/entrar" class="brand-logo" aria-label="Radar Financeiro - página inicial">
          <span class="brand-mark" aria-hidden="true">R<span class="brand-dot">.</span></span>
          <span>radar<span class="brand-name-accent">financeiro</span></span>
        </a>
        <div class="brand-message">
          <span class="brand-eyebrow">FINANÇAS EM PERSPECTIVA</span>
          <h1>Clareza para suas decisões financeiras.</h1>
          <p>Mais controle sobre o presente, mais tranquilidade para planejar o futuro.</p>
          <div class="brand-accent" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
        </div>
        <p class="brand-footer">Uma visão melhor começa aqui.</p>
      </section>
      <section class="auth-main">
        <div class="mobile-brand">
          <span class="brand-mark" aria-hidden="true">R<span class="brand-dot">.</span></span>
          <span>radar<strong>financeiro</strong></span>
        </div>
        <div class="auth-container"><ng-content /></div>
        <p class="auth-legal">Radar Financeiro · Seu espaço para cuidar das finanças.</p>
      </section>
    </main>
  `,
  styleUrl: './auth-shell.scss',
})
export class AuthShell {}
