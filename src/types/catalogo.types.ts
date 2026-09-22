/**
 * Tipo unificado do catálogo completo (/estoque/produtos) - usado por
 * Compras ADM e Estoque Mínimo, que consomem exatamente a mesma resposta.
 * `ProdutoCompras` e `ProdutoEstoqueMinimo` são aliases deste tipo (ver
 * types/compras.types.ts e types/estoqueMinimo.types.ts) - mantidos por
 * compatibilidade de nome nas páginas, sem duplicar a definição.
 */
export interface ProdutoCatalogo {
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
  ativo?: boolean;
  categoria?: string;
  reserva_por_deposito?: Record<string, number>;
  criado_em?: string;
  ultima_atualizacao?: string;
  // Campos calculados no cliente
  estoqueTotal?: number;
  totalReservado?: number;
  estoqueMinimo?: number;
  estoqueMinimoVoltaAsAulas?: number;
  estoqueMinimoGeral?: number;
}

export interface FiltrosCatalogo {
  busca?: string;
  categoria?: string;
}
