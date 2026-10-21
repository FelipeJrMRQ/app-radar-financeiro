import { Injectable, signal } from '@angular/core';

/** Um único menu financeiro aberto por vez, inclusive em cards distintos. */
@Injectable({ providedIn: 'root' })
export class MenuLancamentosService {
  readonly ativo = signal<number | null>(null);
  abrir(id: number): void { this.ativo.set(id); }
  fechar(id: number): void {
    if (this.ativo() === id) this.ativo.set(null);
  }
}
