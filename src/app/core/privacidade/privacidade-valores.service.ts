import { Injectable, signal } from '@angular/core';

/** Privacidade visual, iniciada sempre com os valores financeiros ocultos. */
@Injectable({ providedIn: 'root' })
export class PrivacidadeValoresService {
  private readonly estado = signal(false);
  readonly valoresVisiveis = this.estado.asReadonly();

  alternar(): void {
    this.estado.update(valor => !valor);
  }

  ocultar(): void {
    this.estado.set(false);
  }
}
