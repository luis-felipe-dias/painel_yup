import { api } from './api/client';
import { ProdutoEstoque, ReposicaoResponse, FiltrosReposicao } from '../types/estoque.types';
import { calcularEstoqueDisponivel } from '../utils/estoqueCalculos';
import { iniciarLiveUpdates, LiveUpdatesHandle } from './liveUpdates';

const ESTOQUE_API_URL = 'https://api.nowlords.com.br/estoque';

let cacheProdutos: ProdutoEstoque[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000;

// Cursor do poll de "o que mudou" (vem do backend, não do relógio do
// navegador) e época usada no último processamento - precisa pra
// reprocessar cada produto que chega no poll com a mesma regra.
let servidorTimestamp: string | null = null;
let epocaAtual: 'dia_a_dia' | 'volta_as_aulas' = 'dia_a_dia';
let liveHandle: LiveUpdatesHandle | null = null;
const listeners = new Set<(produtos: ProdutoEstoque[]) => void>();

/**
 * Calcula o estoque mínimo baseado na regra:
 * - Se estoque_minimo_configurado > 0: usa o configurado
 * - Senão: 10% do (Depósito Loja + Casa Velha) DISPONÍVEL, limitado a 30
 * - O resultado nunca pode ser menor que 1 (garantia mínima)
 */
function calcularEstoqueMinimo(
  produto: ProdutoEstoque,
  epocaSelecionada: 'dia_a_dia' | 'volta_as_aulas',
  disponivel: { depositoLoja: number; casaVelha: number }
): number {
  const estoqueMinimoConfigurado = epocaSelecionada === 'volta_as_aulas'
    ? produto.estoque_minimo_volta_as_aulas || 0
    : produto.estoque_minimo || 0;

  if (estoqueMinimoConfigurado > 0) {
    return estoqueMinimoConfigurado;
  }

  const totalEstoque = disponivel.depositoLoja + disponivel.casaVelha;
  const calculado = Math.floor(totalEstoque * 0.1);
  const minimoCalculado = Math.min(calculado, 30);
  return Math.max(minimoCalculado, 1);
}

function classificarPrioridade(
  estoqueMinimo: number,
  disponivel: { controleGeral: number; depositoLoja: number; casaVelha: number }
): 'CRITICO' | 'PRECISA_REPOR' | 'NAO_PRECISA' {
  const { controleGeral, depositoLoja, casaVelha } = disponivel;
  const existeEstoqueDeposito = (depositoLoja + casaVelha) > 0;

  if (controleGeral === 0 && existeEstoqueDeposito) {
    return 'CRITICO';
  }
  if (controleGeral > 0 && controleGeral < estoqueMinimo) {
    return 'PRECISA_REPOR';
  }
  return 'NAO_PRECISA';
}

function processarProduto(produto: ProdutoEstoque, epoca: 'dia_a_dia' | 'volta_as_aulas'): ProdutoEstoque {
  const disponivel = calcularEstoqueDisponivel(produto.estoque, produto.reserva_por_deposito);
  const estoqueMinimo = calcularEstoqueMinimo(produto, epoca, disponivel);
  const prioridade = classificarPrioridade(estoqueMinimo, disponivel);
  const necessidade = Math.max(0, estoqueMinimo - disponivel.controleGeral);

  return {
    ...produto,
    estoqueMinimoCalculado: estoqueMinimo,
    prioridade,
    necessidadeRepor: necessidade,
    totalEstoque: disponivel.totalDisponivel,
    totalReservado: disponivel.totalReservado,
    jaReposto: false,
    sincronizado: !!produto.tiny?.id
  };
}

function notificarListeners() {
  if (!cacheProdutos) return;
  listeners.forEach(cb => cb(cacheProdutos!));
}

function mesclarAtualizacoes(produtosMudados: Record<string, ProdutoEstoque>, removidos: string[]) {
  if (!cacheProdutos) return;

  const porCodigo = new Map(cacheProdutos.map(p => [p.codigo, p]));

  for (const codigo of removidos) {
    porCodigo.delete(codigo);
  }
  for (const [codigo, bruto] of Object.entries(produtosMudados)) {
    porCodigo.set(codigo, processarProduto(bruto, epocaAtual));
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
        console.log(`🔄 Live update: ${Object.keys(produtos).length} produto(s) mudou(aram), ${removidos.length} removido(s)`);
        mesclarAtualizacoes(produtos as Record<string, ProdutoEstoque>, removidos);
      }
    }
  });
}

export const estoqueService = {
  async buscarProdutosReposicao(forceRefresh: boolean = false, epoca: 'dia_a_dia' | 'volta_as_aulas' = 'dia_a_dia'): Promise<ProdutoEstoque[]> {
    epocaAtual = epoca;
    const now = Date.now();
    if (!forceRefresh && cacheProdutos && (now - cacheTimestamp) < CACHE_TTL) {
      console.log(`📦 Usando cache: ${cacheProdutos.length} produtos`);
      return cacheProdutos;
    }

    try {
      console.log(`📡 Buscando produtos para reposição (Época: ${epoca})...`);
      const startTime = performance.now();

      const response = await api.get(`${ESTOQUE_API_URL}/produtos/reposicao`);
      const data: ReposicaoResponse & { servidor_timestamp?: string } = response.data;

      console.log(`⏱️ API respondeu em ${Math.round(performance.now() - startTime)}ms`);

      const produtosArray = Object.values(data.produtos);
      console.log(`📊 Total de produtos na API: ${produtosArray.length}`);

      const produtosProcessados = produtosArray.map(produto => processarProduto(produto, epoca));

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
      servidorTimestamp = data.servidor_timestamp || new Date().toISOString();
      garantirLivePolling();

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

  /**
   * Assina atualizações em tempo real (webhook do Tiny + jobs automáticos).
   * Chama `callback` toda vez que algo mudar, sem precisar de F5. Retorna
   * a função de cancelamento - chamar no unmount da página.
   */
  assinarAtualizacoes(callback: (produtos: ProdutoEstoque[]) => void): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  async sincronizarProduto(codigo: string): Promise<{ success: boolean; produto?: ProdutoEstoque }> {
    try {
      console.log(`🔄 Sincronizando produto ${codigo}...`);
      const response = await api.get(`${ESTOQUE_API_URL}/tiny/sincronizar/${codigo}`);

      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Produto ${codigo} sincronizado com sucesso`);
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
