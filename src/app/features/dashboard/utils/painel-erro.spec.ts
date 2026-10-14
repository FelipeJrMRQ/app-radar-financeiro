import { HttpErrorResponse } from '@angular/common/http';
import { interpretarErroDoPainel } from './painel-erro';

describe('Diagnóstico do painel financeiro', () => {
  it('apresenta orientação quando o endpoint do dashboard não existe no backend', () => {
    const falha = interpretarErroDoPainel(new HttpErrorResponse({
      status: 404,
      url: '/api/espacos-financeiros/10/relatorios/painel-financeiro',
      error: { detail: 'Recurso não encontrado.' },
    }));
    expect(falha.rotaNaoEncontrada).toBeTrue();
    expect(falha.mensagem).toContain('backend');
    expect(falha.mensagem).toContain('8080');
  });

  it('não atribui à versão um espaço financeiro explicitamente inexistente', () => {
    const falha = interpretarErroDoPainel(new HttpErrorResponse({
      status: 404,
      error: { detail: 'Espaço financeiro não encontrado.' },
    }));
    expect(falha.rotaNaoEncontrada).toBeFalse();
    expect(falha.mensagem).toBe('Espaço financeiro não encontrado.');
  });

  it('não oculta falhas de servidor como incompatibilidade da rota', () => {
    const falha = interpretarErroDoPainel(new HttpErrorResponse({ status: 500 }));
    expect(falha.rotaNaoEncontrada).toBeFalse();
    expect(falha.mensagem).toContain('servidor');
  });
});
