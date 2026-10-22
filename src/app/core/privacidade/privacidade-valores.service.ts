import { Injectable, signal } from '@angular/core';

/**
 * Privacidade visual escolhida pelo próprio usuário.
 * O estado padrão é exibir valores. A sincronização com a API é feita pelo
 * serviço de preferências, que também administra o tema e sua versão.
 */
@Injectable({ providedIn: 'root' })
export class PrivacidadeValoresService {
  private readonly estado = signal(true);
  readonly valoresVisiveis = this.estado.asReadonly();

  definir(exibir: boolean): void {
    this.estado.set(exibir);
  }

  alternar(): void {
    this.estado.update(valor => !valor);
  }

  ocultar(): void {
    this.estado.set(false);
  }

  restaurarPadrao(): void {
    this.estado.set(true);
  }
}
