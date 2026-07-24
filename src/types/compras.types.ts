export interface ProdutoCompras {
  codigo: string;
  descricao: string;
  preco: number;
  unidade: string;
  estoque: {
    'Controle Geral': number;
    'Deposito Loja': number;
    'Casa Velha': number;
    'Produtos': number;
    'Fiscal': number;
  };
  tiny: {
    gtin: string;
    preco_custo: number;
    preco_custo_medio: number;
    estoque_minimo: number;
    estoque_minimo_volta_as_aulas: number;
    estoque_minimo_geral: number;
    saldo_total_tiny: number;
    id: string | null;
    ultima_sincronizacao: string | null;
  };
  ativo?: boolean;
  estoqueTotal?: number;
  estoqueMinimoGeral?: number;
  criado_em?: string;
  ultima_atualizacao?: string;
}

export interface ComprasResponse {
  produtos: Record<string, {
    codigo: string;
    descricao: string;
    preco: number;
    unidade: string;
    estoque: {
      'Controle Geral': number;
      'Deposito Loja': number;
      'Casa Velha': number;
      'Produtos': number;
      'Fiscal': number;
    };
    criado_em?: string;
    ultima_atualizacao?: string;
    tiny?: any;
    estoque_minimo_geral?: number;
    estoque_minimo?: number;
    estoque_minimo_volta_as_aulas?: number;
    gtin?: string;
  }>;
  total: number;
}

export interface FiltrosCompras {
  busca?: string;
  apenasInativos?: boolean;
}