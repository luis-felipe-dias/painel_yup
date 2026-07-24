import axios from 'axios';
import { ProdutoCompras, ComprasResponse, FiltrosCompras } from '../types/compras.types';

// URL direta para a API de produtos
const COMPRAS_API_URL = 'https://api.nowlords.com.br/estoque/produtos';

let cacheProdutos: ProdutoCompras[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000;

export const comprasService = {
  async buscarProdutos(forceRefresh: boolean = false): Promise<ProdutoCompras[]> {
    const now = Date.now();
    if (!forceRefresh && cacheProdutos && (now - cacheTimestamp) < CACHE_TTL) {
      console.log(`📦 Usando cache: ${cacheProdutos.length} produtos`);
      return cacheProdutos;
    }

    try {
      console.log('📡 Buscando produtos para Compras ADM...');
      console.log(`🌐 URL: ${COMPRAS_API_URL}`);
      const startTime = performance.now();
      
      const response = await axios.get(COMPRAS_API_URL);
      const data: ComprasResponse = response.data;
      
      console.log(`⏱️ API respondeu em ${Math.round(performance.now() - startTime)}ms`);
      
      if (!data || !data.produtos) {
        console.warn('⚠️ Nenhum produto encontrado na resposta da API');
        return [];
      }
      
      const produtosArray = Object.values(data.produtos || {});
      console.log(`📊 Total de produtos na API: ${produtosArray.length}`);
      
      const produtosProcessados: ProdutoCompras[] = [];
      
      for (const produto of produtosArray) {
        try {
          const controleGeral = produto.estoque?.['Controle Geral'] || 0;
          const depositoLoja = produto.estoque?.['Deposito Loja'] || 0;
          const casaVelha = produto.estoque?.['Casa Velha'] || 0;
          const estoqueTotal = controleGeral + depositoLoja + casaVelha;
          
          const tiny = produto.tiny || {};
          
          // Buscar estoque_minimo_geral diretamente do produto (fallback para tiny)
          const estoqueMinimoGeral = produto.estoque_minimo_geral || tiny.estoque_minimo_geral || 0;
          
          // Log para debug
          if (produto.codigo === '10' || estoqueMinimoGeral > 0) {
            console.log(`📊 Produto ${produto.codigo}: estoque_minimo_geral = ${estoqueMinimoGeral}`);
          }
          
          const produtoProcessado: ProdutoCompras = {
            codigo: produto.codigo || '',
            descricao: produto.descricao || 'Sem descrição',
            preco: produto.preco || 0,
            unidade: produto.unidade || 'Un',
            estoque: {
              'Controle Geral': controleGeral,
              'Deposito Loja': depositoLoja,
              'Casa Velha': casaVelha,
              'Produtos': produto.estoque?.['Produtos'] || 0,
              'Fiscal': produto.estoque?.['Fiscal'] || 0
            },
            tiny: {
              gtin: tiny.gtin || produto.gtin || '',
              preco_custo: tiny.preco_custo || 0,
              preco_custo_medio: tiny.preco_custo_medio || 0,
              estoque_minimo: tiny.estoque_minimo || produto.estoque_minimo || 0,
              estoque_minimo_volta_as_aulas: tiny.estoque_minimo_volta_as_aulas || produto.estoque_minimo_volta_as_aulas || 0,
              estoque_minimo_geral: estoqueMinimoGeral,
              saldo_total_tiny: tiny.saldo_total_tiny || 0,
              id: tiny.id || null,
              ultima_sincronizacao: tiny.ultima_sincronizacao || null
            },
            ativo: true,
            estoqueTotal: estoqueTotal,
            estoqueMinimoGeral: estoqueMinimoGeral,
            criado_em: produto.criado_em,
            ultima_atualizacao: produto.ultima_atualizacao
          };
          
          produtosProcessados.push(produtoProcessado);
        } catch (err) {
          console.error(`❌ Erro ao processar produto ${produto.codigo}:`, err);
        }
      }
      
      console.log(`📊 Produtos processados: ${produtosProcessados.length}`);
      
      // FILTRAR: Apenas produtos com estoque total < estoque mínimo geral OU estoque total = 0
      const produtosFiltrados = produtosProcessados.filter(produto => {
        const estoqueTotal = produto.estoqueTotal || 0;
        const estoqueMinimoGeral = produto.estoqueMinimoGeral || 0;
        return estoqueTotal < estoqueMinimoGeral || estoqueTotal === 0;
      });
      
      console.log(`📊 Produtos relevantes: ${produtosFiltrados.length} (${produtosProcessados.length} total)`);
      
      produtosFiltrados.sort((a, b) => a.codigo.localeCompare(b.codigo));
      
      cacheProdutos = produtosFiltrados;
      cacheTimestamp = now;
      
      console.log(`✅ ${produtosFiltrados.length} produtos carregados e cacheados`);
      
      const exemplo = produtosFiltrados.find(p => (p.estoqueMinimoGeral || 0) > 0);
      if (exemplo) {
        console.log(`📊 Exemplo com estoque_minimo_geral:`, {
          codigo: exemplo.codigo,
          estoqueMinimoGeral: exemplo.estoqueMinimoGeral
        });
      }
      
      return produtosFiltrados;
    } catch (error) {
      console.error('❌ Erro ao buscar produtos:', error);
      if (cacheProdutos) {
        console.log('🔄 Retornando cache em caso de erro');
        return cacheProdutos;
      }
      return [];
    }
  },

  async sincronizarProduto(codigo: string): Promise<{ success: boolean; produto?: ProdutoCompras }> {
    try {
      const url = `https://api.nowlords.com.br/estoque/tiny/sincronizar/${codigo}`;
      
      console.log(`🔄 Sincronizando produto ${codigo}...`);
      console.log(`📤 URL: ${url}`);
      
      const response = await axios.post(url);
      
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Produto ${codigo} sincronizado com sucesso`);
        cacheProdutos = null;
        return { 
          success: true, 
          produto: response.data 
        };
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
      
      console.log(`📤 Definindo estoque mínimo para produto ${codigo}...`);
      console.log(`📤 URL: ${url}`);
      console.log(`📤 Valores: minimo=${estoqueMinimo}, vta=${estoqueMinimoVoltaAsAulas}, geral=${estoqueMinimoGeral}`);
      
      const params = new URLSearchParams({
        estoque_minimo: String(estoqueMinimo),
        estoque_minimo_volta_as_aulas: String(estoqueMinimoVoltaAsAulas),
        estoque_minimo_geral: String(estoqueMinimoGeral)
      });
      
      const response = await axios.post(`${url}?${params.toString()}`);
      
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Estoque mínimo do produto ${codigo} atualizado com sucesso`);
        cacheProdutos = null;
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
      
      console.log(`🗑️ Inativando produto ${codigo}...`);
      console.log(`📤 URL: ${url}`);
      
      const response = await axios.post(url);
      
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Produto ${codigo} inativado com sucesso`);
        cacheProdutos = null;
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Erro ao inativar produto ${codigo}:`, error);
      return false;
    }
  },

  filtrarProdutos(produtos: ProdutoCompras[], filtros: FiltrosCompras): ProdutoCompras[] {
    let resultado = [...produtos];

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      resultado = resultado.filter(p => 
        p.codigo.toLowerCase().includes(busca) ||
        (p.descricao && p.descricao.toLowerCase().includes(busca)) ||
        (p.tiny?.gtin && p.tiny.gtin.toLowerCase().includes(busca))
      );
    }

    if (filtros.apenasInativos) {
      resultado = resultado.filter(p => p.ativo === false);
    }

    return resultado;
  },

  limparCache() {
    cacheProdutos = null;
    cacheTimestamp = 0;
    console.log('🗑️ Cache de compras limpo');
  }
};