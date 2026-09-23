export interface Contato {
  id: string;
  nome: string;
  telefone: string;
  nomePersonalizado: boolean;
  isGroup: boolean;
  dataCriacao?: string;
  ultimaInteracao?: string;
  tags: string[];
  observacoes?: string;
}

export interface AtualizarContatoDTO {
  nome?: string;
  tags?: string[];
  observacoes?: string;
}

export interface ListarContatosParams {
  busca?: string;
  limit?: number;
  apenasGrupos?: boolean;
}
