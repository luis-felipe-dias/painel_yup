import { api } from './api/client';
import { ProdutoCatalogo, FiltrosCatalogo } from '../types/catalogo.types';
import { calcularEstoqueDisponivel } from '../utils/estoqueCalculos';
import { iniciarLiveUpdates, LiveUpdatesHandle } from './liveUpdates';

/**
 * Serviço único do catálogo completo (/estoque/produtos) - compartilhado
 * entre Compras ADM e Estoque Mínimo (antes eram dois serviços quase
 * idênticos, fazendo fetch e processamento duplicados). Uma página busca,
 * a outra reaproveita o cache; e um só poll de atualização em tempo real
 * (webhook do Tiny) alimenta as duas.
 */
const CATALOGO_API_URL = 'https://api.nowlords.com.br/estoque/produtos';

let cacheProdutos: ProdutoCatalogo[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000;

let servidorTimestamp: string | null = null;
let liveHandle: LiveUpdatesHandle | null = null;
const listeners = new Set<(produtos: ProdutoCatalogo[]) => void>();

function processarProduto(produto: any): ProdutoCatalogo {
  const disponivel = calcularEstoqueDisponivel(produto.estoque, produto.reserva_por_deposito);
  const tiny = produto.tiny || {};

  const estoqueMinimo = produto.estoque_minimo ?? tiny.estoque_minimo ?? 0;
  const estoqueMinimoVta = produto.estoque_minimo_volta_as_aulas ?? tiny.estoque_minimo_volta_as_aulas ?? 0;
  const estoqueMinimoGeral = produto.estoque_minimo_geral ?? tiny.estoque_minimo_geral ?? 0;

  return {
    codigo: produto.codigo || '',
    descricao: produto.descricao || 'Sem descrição',
    preco: produto.preco || 0,
    unidade: produto.unidade || 'Un',
    estoque: {
      'Controle Geral': produto.estoque?.['Controle Geral'] || 0,
      'Deposito Loja': produto.estoque?.['Deposito Loja'] || 0,
      'Casa Velha': produto.estoque?.['Casa Velha'] || 0,
      'Produtos': produto.estoque?.['Produtos'] || 0,
      'Fiscal': produto.estoque?.['Fiscal'] || 0
    },
    tiny: {
      id: tiny.id || null,
      gtin: tiny.gtin || produto.gtin || '',
      preco_custo: tiny.preco_custo || 0,
      preco_custo_medio: tiny.preco_custo_medio || 0,
      ultima_sincronizacao: tiny.ultima_sincronizacao || null,
      saldo_total_tiny: tiny.saldo_total_tiny || 0,
      estoque_minimo: estoqueMinimo,
      estoque_minimo_volta_as_aulas: estoqueMinimoVta,
      estoque_minimo_geral: estoqueMinimoGeral
    },
    ativo: true,
    categoria: produto.categoria || '',
    reserva_por_deposito: produto.reserva_por_deposito || {},
    criado_em: produto.criado_em,
    ultima_atualizacao: produto.ultima_atualizacao,
    // disponível de verdade (reservado não conta - não pode ser transferido)
    estoqueTotal: disponivel.totalDisponivel,
    totalReservado: disponivel.totalReservado,
    estoqueMinimo,
    estoqueMinimoVoltaAsAulas: estoqueMinimoVta,
    estoqueMinimoGeral
  };
}

function notificarListeners() {
  if (!cacheProdutos) return;
  listeners.forEach(cb => cb(cacheProdutos!));
}

function mesclarAtualizacoes(produtosMudados: Record<string, any>, removidos: string[]) {
  if (!cacheProdutos) return;

  const porCodigo = new Map(cacheProdutos.map(p => [p.codigo, p]));
  for (const codigo of removidos) {
    porCodigo.delete(codigo);
  }
  for (const [codigo, bruto] of Object.entries(produtosMudados)) {
    porCodigo.set(codigo, processarProduto(bruto));
  }

  cacheProdutos = Array.from(porCodigo.values());
  cacheTimestamp = Date.now();
  notificarListeners();
}

function garantirLivePolling() {
  if (liveHandle) return;
  liveHandle = iniciarLiveUpdates({
    getUltimoTimestamp: () => servidorTimestamp,
    onAtualizacao: (produtos, removidos, novoTimestamp) => {
      servidorTimestamp = novoTimestamp;
      if (Object.keys(produtos).length > 0 || removidos.length > 0) {
        console.log(`🔄 Live update catálogo: ${Object.keys(produtos).length} produto(s), ${removidos.length} removido(s)`);
        mesclarAtualizacoes(produtos, removidos);
      }
    }
  });
}

export const catalogoService = {
  async buscarCatalogo(forceRefresh: boolean = false): Promise<ProdutoCatalogo[]> {
    const now = Date.now();
    if (!forceRefresh && cacheProdutos && (now - cacheTimestamp) < CACHE_TTL) {
      console.log(`📦 Catálogo: usando cache (${cacheProdutos.length} produtos)`);
      return cacheProdutos;
    }

    try {
      console.log('📡 Buscando catálogo completo de produtos...');
      const startTime = performance.now();
      const response = await api.get(CATALOGO_API_URL);
      const data = response.data;
      console.log(`⏱️ API respondeu em ${Math.round(performance.now() - startTime)}ms`);

      if (!data || !data.produtos) {
        console.warn('⚠️ Nenhum produto encontrado na resposta da API');
        return cacheProdutos || [];
      }

      const produtosArray = Object.values(data.produtos);
      const produtosProcessados = produtosArray.map((p) => {
        try {
          return processarProduto(p);
        } catch (err) {
          console.error(`❌ Erro ao processar produto ${(p as any)?.codigo}:`, err);
          return null;
        }
      }).filter((p): p is ProdutoCatalogo => p !== null);

      produtosProcessados.sort((a, b) => a.codigo.localeCompare(b.codigo));

      cacheProdutos = produtosProcessados;
      cacheTimestamp = now;
      servidorTimestamp = data.servidor_timestamp || new Date().toISOString();
      garantirLivePolling();

      console.log(`✅ ${produtosProcessados.length} produtos carregados e cacheados`);
      return produtosProcessados;
    } catch (error) {
      console.error('❌ Erro ao buscar catálogo:', error);
      if (cacheProdutos) {
        console.log('🔄 Retornando cache em caso de erro');
        return cacheProdutos;
      }
      return [];
    }
  },

  /**
   * Assina atualizações em tempo real (webhook do Tiny + jobs automáticos).
   * Sem F5 - a lista some/aparece/atualiza sozinha. Retorna a função de
   * cancelamento (chamar no unmount da página).
   */
  assinarAtualizacoes(callback: (produtos: ProdutoCatalogo[]) => void): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  async sincronizarProduto(codigo: string): Promise<{ success: boolean; produto?: ProdutoCatalogo }> {
    try {
      // rota é GET, não POST (era um bug real nos dois serviços antigos -
      // compras.service.ts e estoqueMinimo.service.ts chamavam com POST e
      // provavelmente sempre levavam 405 do backend)
      const url = `https://api.nowlords.com.br/estoque/tiny/sincronizar/${codigo}`;
      const response = await api.get(url);
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Produto ${codigo} sincronizado com sucesso`);
        return { success: true, produto: response.data };
      }
      return { success: false };
    } catch (error) {
      console.error(`❌ Erro ao sincronizar produto ${codigo}:`, error);
      return { success: false };
    }
  },

  async definirEstoqueMinimo(
    codigo: string,
    estoqueMinimo: number,
    estoqueMinimoVoltaAsAulas: number,
    estoqueMinimoGeral: number
  ): Promise<boolean> {
    try {
      const url = `https://api.nowlords.com.br/estoque/produtos/estoque-minimo/${codigo}`;
      const params = new URLSearchParams({
        estoque_minimo: String(estoqueMinimo),
        estoque_minimo_volta_as_aulas: String(estoqueMinimoVoltaAsAulas),
        estoque_minimo_geral: String(estoqueMinimoGeral)
      });
      const response = await api.post(`${url}?${params.toString()}`);
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Estoque mínimo do produto ${codigo} atualizado`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Erro ao definir estoque mínimo do produto ${codigo}:`, error);
      return false;
    }
  },

  async inativarProduto(codigo: string): Promise<boolean> {
    try {
      const url = `https://api.nowlords.com.br/estoque/produtos/inativar/${codigo}`;
      const response = await api.post(url);
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Produto ${codigo} inativado`);
        if (cacheProdutos) {
          cacheProdutos = cacheProdutos.filter(p => p.codigo !== codigo);
          notificarListeners();
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Erro ao inativar produto ${codigo}:`, error);
      return false;
    }
  },

  filtrarProdutos(produtos: ProdutoCatalogo[], filtros: FiltrosCatalogo): ProdutoCatalogo[] {
    let resultado = [...produtos];

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      resultado = resultado.filter(p =>
        p.codigo.toLowerCase().includes(busca) ||
        (p.descricao && p.descricao.toLowerCase().includes(busca)) ||
        (p.tiny?.gtin && p.tiny.gtin.toLowerCase().includes(busca))
      );
    }

    if (filtros.categoria) {
      const categoria = filtros.categoria.toLowerCase();
      resultado = resultado.filter(p => (p.categoria || '').toLowerCase().includes(categoria));
    }

    return resultado;
  },

  limparCache() {
    cacheProdutos = null;
    cacheTimestamp = 0;
    console.log('🗑️ Cache de catálogo limpo');
  }
};
