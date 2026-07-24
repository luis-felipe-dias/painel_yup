import axios from 'axios';
import { ProdutoEstoqueMinimo, EstoqueMinimoResponse, FiltrosEstoqueMinimo } from '../types/estoqueMinimo.types';

// URL direta para a API de produtos
const COMPRAS_API_URL = 'https://api.nowlords.com.br/estoque/produtos';

let cacheProdutos: ProdutoEstoqueMinimo[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000;

export const estoqueMinimoService = {
  async buscarProdutos(forceRefresh: boolean = false): Promise<ProdutoEstoqueMinimo[]> {
    const now = Date.now();
    if (!forceRefresh && cacheProdutos && (now - cacheTimestamp) < CACHE_TTL) {
      console.log(`📦 Usando cache: ${cacheProdutos.length} produtos`);
      return cacheProdutos;
    }

    try {
      console.log('📡 Buscando produtos para Estoque Mínimo...');
      console.log(`🌐 URL: ${COMPRAS_API_URL}`);
      const startTime = performance.now();
      
      const response = await axios.get(COMPRAS_API_URL);
      const data: EstoqueMinimoResponse = response.data;
      
      console.log(`⏱️ API respondeu em ${Math.round(performance.now() - startTime)}ms`);
      
      if (!data || !data.produtos) {
        console.warn('⚠️ Nenhum produto encontrado na resposta da API');
        return [];
      }
      
      const produtosArray = Object.values(data.produtos || {});
      console.log(`📊 Total de produtos na API: ${produtosArray.length}`);
      
      const produtosProcessados: ProdutoEstoqueMinimo[] = [];
      
      for (const produto of produtosArray) {
        try {
          const controleGeral = produto.estoque?.['Controle Geral'] || 0;
          const depositoLoja = produto.estoque?.['Deposito Loja'] || 0;
          const casaVelha = produto.estoque?.['Casa Velha'] || 0;
          const estoqueTotal = controleGeral + depositoLoja + casaVelha;
          
          const tiny = produto.tiny || {};
          
          // Buscar estoque_minimo diretamente do produto (fallback para tiny)
          const estoqueMinimo = produto.estoque_minimo || tiny.estoque_minimo || 0;
          const estoqueMinimoVoltaAsAulas = produto.estoque_minimo_volta_as_aulas || tiny.estoque_minimo_volta_as_aulas || 0;
          const estoqueMinimoGeral = produto.estoque_minimo_geral || tiny.estoque_minimo_geral || 0;
          
          const produtoProcessado: ProdutoEstoqueMinimo = {
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
              id: tiny.id || null,
              gtin: tiny.gtin || produto.gtin || '',
              preco_custo: tiny.preco_custo || 0,
              preco_custo_medio: tiny.preco_custo_medio || 0,
              ultima_sincronizacao: tiny.ultima_sincronizacao || null,
              saldo_total_tiny: tiny.saldo_total_tiny || 0,
              estoque_minimo: estoqueMinimo,
              estoque_minimo_volta_as_aulas: estoqueMinimoVoltaAsAulas,
              estoque_minimo_geral: estoqueMinimoGeral
            },
            criado_em: produto.criado_em,
            ultima_atualizacao: produto.ultima_atualizacao,
            estoqueTotal: estoqueTotal,
            estoqueMinimo: estoqueMinimo,
            estoqueMinimoVoltaAsAulas: estoqueMinimoVoltaAsAulas,
            estoqueMinimoGeral: estoqueMinimoGeral
          };
          
          produtosProcessados.push(produtoProcessado);
        } catch (err) {
          console.error(`❌ Erro ao processar produto ${produto.codigo}:`, err);
        }
      }
      
      console.log(`📊 Produtos processados: ${produtosProcessados.length}`);
      
      produtosProcessados.sort((a, b) => a.descricao.localeCompare(b.descricao));
      
      cacheProdutos = produtosProcessados;
      cacheTimestamp = now;
      
      console.log(`✅ ${produtosProcessados.length} produtos carregados e cacheados`);
      
      const exemplo = produtosProcessados.find(p => (p.estoqueMinimoGeral || 0) > 0);
      if (exemplo) {
        console.log(`📊 Exemplo com estoque_minimo_geral:`, {
          codigo: exemplo.codigo,
          estoqueMinimo: exemplo.estoqueMinimo,
          estoqueMinimoVoltaAsAulas: exemplo.estoqueMinimoVoltaAsAulas,
          estoqueMinimoGeral: exemplo.estoqueMinimoGeral
        });
      }
      
      return produtosProcessados;
    } catch (error) {
      console.error('❌ Erro ao buscar produtos:', error);
      if (cacheProdutos) {
        console.log('🔄 Retornando cache em caso de erro');
        return cacheProdutos;
      }
      return [];
    }
  },

  async atualizarEstoqueMinimo(
    codigo: string, 
    estoqueMinimo: number, 
    estoqueMinimoVoltaAsAulas: number,
    estoqueMinimoGeral: number
  ): Promise<boolean> {
    try {
      const url = `https://api.nowlords.com.br/estoque/produtos/estoque-minimo/${codigo}`;
      
      console.log(`📤 Atualizando estoque mínimo para produto ${codigo}...`);
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
      console.error(`❌ Erro ao atualizar estoque mínimo do produto ${codigo}:`, error);
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

  filtrarProdutos(produtos: ProdutoEstoqueMinimo[], filtros: FiltrosEstoqueMinimo): ProdutoEstoqueMinimo[] {
    let resultado = [...produtos];

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      resultado = resultado.filter(p => 
        p.codigo.toLowerCase().includes(busca) ||
        p.descricao.toLowerCase().includes(busca) ||
        p.tiny?.gtin?.toLowerCase().includes(busca)
      );
    }

    if (filtros.apenasSemEstoqueMinimo) {
      resultado = resultado.filter(p => 
        (p.tiny?.estoque_minimo || 0) === 0 && 
        (p.tiny?.estoque_minimo_volta_as_aulas || 0) === 0 && 
        (p.tiny?.estoque_minimo_geral || 0) === 0
      );
    }

    return resultado;
  },

  limparCache() {
    cacheProdutos = null;
    cacheTimestamp = 0;
    console.log('🗑️ Cache de estoque mínimo limpo');
  }
};