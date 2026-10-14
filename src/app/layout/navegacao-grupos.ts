/** Agrupa rotas pelo objetivo do usuário, sem alterar seus endereços atuais. */
export function grupoNavegacao(url: string): 'cadastros' | 'configuracoes' | 'principal' {
  const rota = url.split(/[?#]/, 1)[0];
  if (/^\/(cadastros|contas|categorias)(\/|$)/.test(rota)) return 'cadastros';
  if (/^\/configuracoes(\/|$)/.test(rota)) return 'configuracoes';
  return 'principal';
}
