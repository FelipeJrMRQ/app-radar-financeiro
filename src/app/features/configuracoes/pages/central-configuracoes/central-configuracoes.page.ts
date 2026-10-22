import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TemaPreferido, TemaService } from '../../../../core/tema/tema.service';

@Component({
  selector: 'app-central-configuracoes',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './central-configuracoes.page.html',
  styleUrl: './central-configuracoes.page.scss',
})
export class CentralConfiguracoesPage {
  readonly tema = inject(TemaService);
  readonly escolhas: readonly { valor: TemaPreferido; titulo: string; descricao: string }[] = [
    { valor: 'CLARO', titulo: 'Claro', descricao: 'Aparência padrão do Radar Financeiro.' },
    { valor: 'ESCURO', titulo: 'Escuro', descricao: 'Fundos escuros para ambientes de pouca luz.' },
    { valor: 'SISTEMA', titulo: 'Automático', descricao: 'Segue a configuração de cada dispositivo.' },
  ];

  escolher(valor: TemaPreferido): void { void this.tema.selecionar(valor); }
}
