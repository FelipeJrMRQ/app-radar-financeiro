import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const sessao = inject(AuthService);
  const router = inject(Router);
  return sessao.sessaoAtiva() ? true : router.createUrlTree(['/entrar']);
};
