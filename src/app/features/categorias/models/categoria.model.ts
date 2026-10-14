export type TipoCategoria = 'RECEITA' | 'DESPESA';
export type EscopoCategoria = 'SISTEMA' | 'ESPACO';

export interface Categoria {
  id: number;
  nome: string;
  tipo: TipoCategoria;
  escopo: EscopoCategoria;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}
export interface CriarCategoria {
  nome: string;
  tipo: TipoCategoria;
}
