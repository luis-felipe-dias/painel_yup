export interface ProdutoEstoque {
  codigo: string;
  descricao: string;
  preco: number;
  unidade: string;
  estoque: {
    'Controle Geral': number;
    'Deposito Loja': number;
    'Casa Velha'?: number;
    'Produtos'?: number;
    'Fiscal'?: number;
  };
  criado_em: string;
  ultima_atualizacao: string;
  tiny: {
    id: string | null;
    gtin: string;
    preco_custo: number;
    preco_custo_medio: number;
    ultima_sincronizacao: string | null;
  };
  saldo_total_tiny: number;
  estoque_minimo: number;
  estoque_minimo_volta_as_aulas: number;
  gtin: string;
  // Campos calculados
  necessidadeRepor: number;
  jaReposto: boolean;
  sincronizado: boolean;
  prioridade?: 'CRITICO' | 'PRECISA_REPOR' | 'NAO_PRECISA';
  estoqueMinimoCalculado?: number;
  totalEstoque?: number;
}

export interface ReposicaoResponse {
  total_produtos: number;
  produtos_com_estoque_positivo: number;
  produtos_sem_estoque: number;
  produtos_sincronizados_tiny: number;
  produtos_nao_sincronizados_tiny: number;
  produtos: Record<string, ProdutoEstoque>;
}

export interface FiltrosReposicao {
  busca?: string;
  apenasRepor?: boolean;
  apenasRepostos?: boolean;
  apenasNaoSincronizados?: boolean;
}

export type EpocaEstoque = 'dia_a_dia' | 'volta_as_aulas';