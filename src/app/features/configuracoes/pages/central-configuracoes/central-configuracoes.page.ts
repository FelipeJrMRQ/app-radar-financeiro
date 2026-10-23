import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowRight, faBell, faCircleUser, faShieldHalved, faSliders, faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { TemaPreferido, TemaService } from '../../../../core/tema/tema.service';
import { PrivacidadeValoresService } from '../../../../core/privacidade/privacidade-valores.service';

@Component({
  selector: 'app-central-configuracoes',
  standalone: true,
  imports: [RouterLink, FontAwesomeModule],
  templateUrl: './central-configuracoes.page.html',
  styleUrl: './central-configuracoes.page.scss',
})
export class CentralConfiguracoesPage {
  readonly tema = inject(TemaService);
  readonly privacidade = inject(PrivacidadeValoresService);
  readonly iconePersonalizacao = faSliders;
  readonly iconePerfil = faCircleUser;
  readonly iconeApagarDados = faTrashCan;
  readonly iconeSeguranca = faShieldHalved;
  readonly iconeNotificacoes = faBell;
  readonly iconeAvancar = faArrowRight;
  readonly escolhas: readonly { valor: TemaPreferido; titulo: string; descricao: string }[] = [
    { valor: 'CLARO', titulo: 'Claro', descricao: 'Aparência padrão do Radar Financeiro.' },
    { valor: 'ESCURO', titulo: 'Escuro', descricao: 'Fundos escuros para ambientes de pouca luz.' },
    { valor: 'SISTEMA', titulo: 'Automático', descricao: 'Segue a configuração de cada dispositivo.' },
  ];

  escolher(valor: TemaPreferido): void { void this.tema.selecionar(valor); }

  definirExibicao(valor: boolean): void { void this.tema.selecionarVisibilidade(valor); }
}
