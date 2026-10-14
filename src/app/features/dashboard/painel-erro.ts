import { HttpErrorResponse } from '@angular/common/http';

import { mensagemDeErro } from '../../core/http/api-error';

export interface ErroPainel {
  mensagem: string;
  rotaNaoEncontrada: boolean;
}

/**
 * Erro 404 com resposta genérica: rota da API ausente ou acesso ao contexto bloqueado.
 * Não usar dados artificiais como fallback de valores financeiros.
 */
export function interpretarErroDoPainel(erro: unknown): ErroPainel {
  if (erro instanceof HttpErrorResponse && erro.status === 404
      && erro.error?.detail === 'Recurso não encontrado.') {
    return {
      mensagem: 'A API retornou HTTP 404 para o painel financeiro. Verifique se a versão atualizada '
        + 'do backend está em execução na porta 8080 e se sua sessão possui acesso ao espaço financeiro.',
      rotaNaoEncontrada: true,
    };
  }
  return { mensagem: mensagemDeErro(erro), rotaNaoEncontrada: false };
}
