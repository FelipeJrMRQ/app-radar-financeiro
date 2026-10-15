import { Injectable, signal } from '@angular/core';

/** Mensagens globais de ações financeiras, inclusive quando o card deixa de existir. */
@Injectable({ providedIn: 'root' })
export class FeedbackOperacoesService {
  readonly mensagem = signal<string | null>(null);

  mostrar(texto: string): void { this.mensagem.set(texto); }

  limpar(): void { this.mensagem.set(null); }
}
