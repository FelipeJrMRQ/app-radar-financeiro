import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-meu-perfil',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './meu-perfil.page.html',
  styleUrl: './meu-perfil.page.scss',
})
export class MeuPerfilPage {
  readonly usuario = inject(AuthService).usuario;
}
