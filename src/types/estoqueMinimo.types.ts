import { ProdutoCatalogo } from './catalogo.types';

// Alias do tipo unificado do catálogo - ver types/compras.types.ts. Estoque
// Mínimo e Compras ADM consomem a mesma resposta (/estoque/produtos).
export type ProdutoEstoqueMinimo = ProdutoCatalogo;

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
  categoria?: string;
}