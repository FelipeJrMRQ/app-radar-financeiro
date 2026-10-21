import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from '../config/api.config';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API_BASE_URL + '/')) return next(request);

  const sessao = inject(AuthService);
  const router = inject(Router);
  const token = sessao.tokenAtual();
  const autenticada = token
    ? request.clone({ setHeaders: { Authorization: 'Bearer ' + token } })
    : request;

  return next(autenticada).pipe(
    catchError((erro: unknown) => {
      if (erro instanceof HttpErrorResponse && erro.status === 401 && token) {
        sessao.sair();
        void router.navigateByUrl('/entrar');
      }
      return throwError(() => erro);
    }),
  );
};
