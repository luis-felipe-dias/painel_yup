export interface ProdutoEstoqueMinimo {
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
    id: string | null;
    gtin: string;
    preco_custo: number;
    preco_custo_medio: number;
    ultima_sincronizacao: string | null;
    saldo_total_tiny: number;
    estoque_minimo: number;
    estoque_minimo_volta_as_aulas: number;
    estoque_minimo_geral: number;
  };
  criado_em?: string;
  ultima_atualizacao?: string;
  estoqueTotal?: number;
  // Campos adicionais para fácil acesso
  estoqueMinimo?: number;
  estoqueMinimoVoltaAsAulas?: number;
  estoqueMinimoGeral?: number;
}

export interface EstoqueMinimoResponse {
  total_produtos: number;
  produtos_com_estoque: number;
  produtos_sem_estoque: number;
  produtos_sincronizados_tiny: number;
  produtos_nao_sincronizados_tiny: number;
  pagina_atual: number;
  limite_por_pagina: number;
  total_paginas: number;
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
    estoque_minimo?: number;
    estoque_minimo_volta_as_aulas?: number;
    estoque_minimo_geral?: number;
    gtin?: string;
  }>;
}

export interface FiltrosEstoqueMinimo {
  busca?: string;
  apenasSemEstoqueMinimo?: boolean;
}