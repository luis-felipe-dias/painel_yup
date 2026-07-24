import { api } from './api/client';
import { ProdutoEstoque, ReposicaoResponse, FiltrosReposicao } from '../types/estoque.types';

const ESTOQUE_API_URL = 'https://api.nowlords.com.br/estoque';

let cacheProdutos: ProdutoEstoque[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000;

/**
 * Calcula o estoque mínimo baseado na regra:
 * - Se estoque_minimo_configurado > 0: usa o configurado
 * - Senão: 10% do (Depósito Loja + Casa Velha), limitado a 30
 * - O resultado nunca pode ser menor que 1 (garantia mínima)
 */
function calcularEstoqueMinimo(produto: ProdutoEstoque, epocaSelecionada: 'dia_a_dia' | 'volta_as_aulas'): number {
  // Verificar se há estoque mínimo configurado
  const estoqueMinimoConfigurado = epocaSelecionada === 'volta_as_aulas' 
    ? produto.estoque_minimo_volta_as_aulas || 0
    : produto.estoque_minimo || 0;
  
  // Se tem configuração > 0, usar a configuração
  if (estoqueMinimoConfigurado > 0) {
    return estoqueMinimoConfigurado;
  }
  
  // Senão, usar a regra de 10% do Depósito Loja + Casa Velha
  const depositoLoja = produto.estoque['Deposito Loja'] || 0;
  const casaVelha = produto.estoque['Casa Velha'] || 0;
  const totalEstoque = depositoLoja + casaVelha;
  
  // 10% do total, limitado a 30
  const calculado = Math.floor(totalEstoque * 0.1);
  const minimoCalculado = Math.min(calculado, 30);
  
  // Garantir que nunca seja menor que 1
  return Math.max(minimoCalculado, 1);
}

function classificarPrioridade(
  produto: ProdutoEstoque, 
  estoqueMinimo: number
): 'CRITICO' | 'PRECISA_REPOR' | 'NAO_PRECISA' {
  const controleGeral = produto.estoque['Controle Geral'] || 0;
  const depositoLoja = produto.estoque['Deposito Loja'] || 0;
  const casaVelha = produto.estoque['Casa Velha'] || 0;
  const existeEstoqueDeposito = (depositoLoja + casaVelha) > 0;
  
  // CRÍTICO: Controle Geral = 0 e existe estoque nos depósitos
  if (controleGeral === 0 && existeEstoqueDeposito) {
    return 'CRITICO';
  }
  
  // PRECISA REPOR: Controle Geral > 0 e abaixo do mínimo
  if (controleGeral > 0 && controleGeral < estoqueMinimo) {
    return 'PRECISA_REPOR';
  }
  
  // NAO_PRECISA: Estoque ok
  return 'NAO_PRECISA';
}

export const estoqueService = {
  async buscarProdutosReposicao(forceRefresh: boolean = false, epoca: 'dia_a_dia' | 'volta_as_aulas' = 'dia_a_dia'): Promise<ProdutoEstoque[]> {
    const now = Date.now();
    if (!forceRefresh && cacheProdutos && (now - cacheTimestamp) < CACHE_TTL) {
      console.log(`📦 Usando cache: ${cacheProdutos.length} produtos`);
      return cacheProdutos;
    }

    try {
      console.log(`📡 Buscando produtos para reposição (Época: ${epoca})...`);
      const startTime = performance.now();
      
      const response = await api.get(`${ESTOQUE_API_URL}/produtos/reposicao`);
      const data: ReposicaoResponse = response.data;
      
      console.log(`⏱️ API respondeu em ${Math.round(performance.now() - startTime)}ms`);
      
      const produtosArray = Object.values(data.produtos);
      console.log(`📊 Total de produtos na API: ${produtosArray.length}`);
      
      const produtosProcessados = produtosArray.map(produto => {
        const estoqueMinimo = calcularEstoqueMinimo(produto, epoca);
        const prioridade = classificarPrioridade(produto, estoqueMinimo);
        const controleGeral = produto.estoque['Controle Geral'] || 0;
        const necessidade = Math.max(0, estoqueMinimo - controleGeral);
        
        const totalEstoque = (produto.estoque['Controle Geral'] || 0) + 
                            (produto.estoque['Deposito Loja'] || 0) + 
                            (produto.estoque['Casa Velha'] || 0);
        
        return {
          ...produto,
          estoqueMinimoCalculado: estoqueMinimo,
          prioridade: prioridade,
          necessidadeRepor: necessidade,
          totalEstoque: totalEstoque,
          jaReposto: false,
          sincronizado: !!produto.tiny?.id
        };
      });
      
      console.log(`📊 Total de produtos processados: ${produtosProcessados.length}`);
      
      // Ordenação por prioridade (CRITICO > PRECISA_REPOR > NAO_PRECISA)
      produtosProcessados.sort((a, b) => {
        const prioridadeOrder = { 'CRITICO': 0, 'PRECISA_REPOR': 1, 'NAO_PRECISA': 2 };
        const priorA = prioridadeOrder[a.prioridade || 'NAO_PRECISA'] ?? 2;
        const priorB = prioridadeOrder[b.prioridade || 'NAO_PRECISA'] ?? 2;
        return priorA - priorB;
      });
      
      const criticos = produtosProcessados.filter(p => p.prioridade === 'CRITICO').length;
      const precisaRepor = produtosProcessados.filter(p => p.prioridade === 'PRECISA_REPOR').length;
      const naoPrecisa = produtosProcessados.filter(p => p.prioridade === 'NAO_PRECISA').length;
      console.log(`📊 CRÍTICOS: ${criticos}, PRECISA REPOR: ${precisaRepor}, OK: ${naoPrecisa}`);
      
      cacheProdutos = produtosProcessados;
      cacheTimestamp = now;
      
      console.log(`✅ ${produtosProcessados.length} produtos carregados e cacheados`);
      return produtosProcessados;
    } catch (error) {
      console.error('❌ Erro ao buscar produtos para reposição:', error);
      if (cacheProdutos) {
        console.log('🔄 Retornando cache em caso de erro');
        return cacheProdutos;
      }
      return [];
    }
  },

  async sincronizarProduto(codigo: string): Promise<{ success: boolean; produto?: ProdutoEstoque }> {
    try {
      console.log(`🔄 Sincronizando produto ${codigo}...`);
      const response = await api.get(`${ESTOQUE_API_URL}/tiny/sincronizar/${codigo}`);
      
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

  filtrarProdutos(produtos: ProdutoEstoque[], filtros: FiltrosReposicao): ProdutoEstoque[] {
    let resultado = [...produtos];

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      resultado = resultado.filter(p => 
        p.codigo.toLowerCase().includes(busca) ||
        p.descricao.toLowerCase().includes(busca) ||
        p.gtin?.toLowerCase().includes(busca)
      );
    }

    if (filtros.apenasRepor) {
      resultado = resultado.filter(p => 
        p.prioridade === 'CRITICO' || p.prioridade === 'PRECISA_REPOR'
      );
    }

    if (filtros.apenasNaoSincronizados) {
      resultado = resultado.filter(p => !p.sincronizado);
    }

    return resultado;
  },

  limparCache() {
    cacheProdutos = null;
    cacheTimestamp = 0;
    console.log('🗑️ Cache de estoque limpo');
  }
};