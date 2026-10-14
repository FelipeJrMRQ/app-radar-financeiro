import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  template: `
    <main class="auth-layout">
      <section class="auth-brand" aria-label="Sobre o Radar Financeiro">
        <div class="brand-identity">
          <img
            src="/assets/brand/simbolo-radar.webp"
            width="160"
            height="160"
            alt=""
            aria-hidden="true"
            class="brand-symbol"
          />
          <span>Radar <strong>Financeiro</strong></span>
        </div>
        <div class="brand-message">
          <span class="brand-eyebrow">VISIBILIDADE PARA SUAS FINANÇAS</span>
          <h1>Encontre clareza em cada decisão.</h1>
          <p>Organize suas contas e acompanhe o movimento do seu dinheiro em um só lugar.</p>
          <span class="brand-emphasis" aria-hidden="true"></span>
        </div>
        <p class="brand-footer">Seu dinheiro, sempre no seu radar.</p>
      </section>

      <section class="auth-main">
        <div class="brand-signature">
          <img
            src="/assets/brand/logo-radar-financeiro.webp"
            alt="Radar Financeiro"
            width="449"
            height="320"
          />
        </div>
        <div class="auth-container"><ng-content /></div>
        <p class="auth-legal">Radar Financeiro · Seu espaço para cuidar das finanças.</p>
      </section>
    </main>
  `,
  styleUrl: './auth-shell.scss',
})
export class AuthShell {}
