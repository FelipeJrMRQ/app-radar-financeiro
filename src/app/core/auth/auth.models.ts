export interface LoginRequest {
  email: string;
  senha: string;
}

export interface AutenticacaoResponse {
  token: string;
  tipo: 'Bearer';
  expiraEmSegundos: number;
}

export interface CadastroRequest {
  nome: string;
  email: string;
  senha: string;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  criadoEm: string;
  atualizadoEm: string;
}

/** Somente para requisições internas. Nunca apresentar como espaço selecionável. */
export interface ContextoFinanceiro {
  id: number;
  nome: string;
  papel: string;
}
