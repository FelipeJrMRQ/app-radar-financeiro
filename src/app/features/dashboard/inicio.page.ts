import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-inicio-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './inicio.page.html',
  styleUrl: './inicio.page.scss',
})
export class InicioPage {
  private readonly sessao = inject(AuthService);
  readonly usuario = this.sessao.usuario;
  readonly primeiroNome = computed(() => this.usuario()?.nome.trim().split(/\s+/)[0] || 'você');
}
