import { ProdutoCatalogo } from './catalogo.types';

// Alias do tipo unificado do catálogo - Compras ADM consome a mesma
// resposta que Estoque Mínimo (/estoque/produtos), então o formato é
// idêntico. Mantido como nome próprio só pra não precisar reescrever os
// imports nas páginas.
export type ProdutoCompras = ProdutoCatalogo;

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
  categoria?: string;
}