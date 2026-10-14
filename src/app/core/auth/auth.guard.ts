import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_rota, estado) => {
  const sessao = inject(AuthService);
  const router = inject(Router);
  if (await sessao.restaurarSessao()) return true;
  return router.createUrlTree(['/entrar'], { queryParams: { retorno: estado.url } });
};
