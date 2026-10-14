import { HttpErrorResponse } from '@angular/common/http';

interface ApiProblem {
  detail?: string;
  title?: string;
  message?: string;
}

/** Converte falhas HTTP em mensagens apropriadas para apresentação ao usuário. */
export function mensagemDeErro(erro: unknown): string {
  if (!(erro instanceof HttpErrorResponse)) {
    return 'Não foi possível concluir a operação. Tente novamente.';
  }
  if (erro.status === 0) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
  }
  if (erro.status === 401) {
    return 'E-mail ou senha incorretos, ou sua sessão expirou.';
  }
  if (erro.status === 403) {
    return 'Você não possui permissão para realizar esta operação.';
  }
  if (erro.status >= 500) {
    return 'O servidor apresentou uma falha. Tente novamente em instantes.';
  }

  const problema = erro.error as ApiProblem | null;
  if (problema && typeof problema === 'object') {
    const mensagem = problema.detail ?? problema.message ?? problema.title;
    if (typeof mensagem === 'string' && mensagem.trim()) return mensagem;
  }
  return 'Não foi possível concluir a operação. Confira os dados informados.';
}
