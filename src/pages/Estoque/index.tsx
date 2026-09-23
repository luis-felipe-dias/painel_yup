import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { estoqueService } from '../../services/estoque.service';
import { metricasService } from '../../services/metricas.service';
import { ProdutoEstoque, FiltrosReposicao, EpocaEstoque } from '../../types/estoque.types';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TableWrapper } from '../../components/ui/TableWrapper';
import { CardList, CardItem, CardRow } from '../../components/ui/CardList';
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Package,
  TrendingUp,
  Building2,
  Warehouse,
  Home,
  RefreshCw as RefreshIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Lock,
  Store,
  Eye,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../utils/cn';

const getEpocaSelecionada = (): EpocaEstoque => {
  return (localStorage.getItem('epoca_estoque') as EpocaEstoque) || 'dia_a_dia';
};

type OrdemTipo = 'alfabetica_asc' | 'alfabetica_desc' | 'preco_asc' | 'preco_desc';
type ClasseFiltro = 'todos' | 'critico' | 'precisa_repor' | 'estoque_ok';
type DepositoFiltro = 'todos' | 'controle_geral' | 'deposito_loja' | 'casa_velha';

const ProdutoRow = React.memo(({ 
  produto, 
  isExpanded, 
  isSincronizando,
  epocaSelecionada,
  onToggleExpand,
  onSincronizar
}: any) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(price);
  };

  const jaSincronizado = produto.sincronizado && produto.tiny?.id;
  const getRowBgColor = () => {
    if (produto.prioridade === 'CRITICO') {
      return 'bg-red-100/90 dark:bg-red-900/40 hover:bg-red-200/90 dark:hover:bg-red-800/50 border-l-4 border-red-600';
    }
    if (produto.prioridade === 'PRECISA_REPOR') {
      return 'bg-yellow-100/90 dark:bg-yellow-900/40 hover:bg-yellow-200/90 dark:hover:bg-yellow-800/50 border-l-4 border-yellow-600';
    }
    return 'bg-green-50/80 dark:bg-green-950/30 hover:bg-green-100/80 dark:hover:bg-green-900/40 border-l-4 border-green-500';
  };

  return (
    <>
      <tr 
        className={cn(
          "cursor-pointer transition-colors text-sm",
          getRowBgColor()
        )}
        onClick={() => onToggleExpand(produto.codigo)}
      >
        <td className="px-2 md:px-4 py-2 md:py-3 font-mono text-[#1c1c1e] dark:text-[#f5f5f7]">
          {produto.codigo}
        </td>
        <td className="px-2 md:px-4 py-2 md:py-3 text-[#1c1c1e] dark:text-[#f5f5f7]">
          <div className="line-clamp-2 max-w-[120px] md:max-w-xs" title={produto.descricao}>
            {produto.descricao}
          </div>
        </td>
        <td className="px-2 md:px-4 py-2 md:py-3 text-[#86868b] font-mono text-xs">
          {produto.gtin || '-'}
        </td>
        <td className="px-2 md:px-4 py-2 md:py-3 text-center">
          <div className="flex flex-col items-center gap-0.5 text-xs md:text-sm">
            <span className="flex items-center gap-1 text-[#1c1c1e] dark:text-[#f5f5f7]">
              <Building2 className="w-3 h-3 text-[#007aff]" />
              {produto.estoque['Controle Geral'] || 0}
            </span>
            <span className="flex items-center gap-1 text-[#1c1c1e] dark:text-[#f5f5f7]">
              <Warehouse className="w-3 h-3 text-[#34c759]" />
              {produto.estoque['Deposito Loja'] || 0}
            </span>
            <span className="flex items-center gap-1 text-[#1c1c1e] dark:text-[#f5f5f7]">
              <Home className="w-3 h-3 text-[#ff9500]" />
              {produto.estoque['Casa Velha'] || 0}
            </span>
            {(produto.totalReservado || 0) > 0 && (
              <span
                className="flex items-center gap-1 text-[10px] text-[#86868b]"
                title="Reservado (pedido em aberto no Tiny) - não conta como disponível"
              >
                <Lock className="w-2.5 h-2.5" />
                {produto.totalReservado} reservado{produto.totalReservado === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </td>
        <td className="px-2 md:px-4 py-2 md:py-3 text-center text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
          {produto.estoqueMinimoCalculado || 0}
        </td>
        <td className="px-2 md:px-4 py-2 md:py-3 text-center text-sm font-semibold">
          <span className={cn(
            produto.necessidadeRepor > 0 ? "text-[#dc2626]" : "text-[#16a34a]"
          )}>
            {produto.necessidadeRepor || 0}
          </span>
        </td>
        <td className="px-2 md:px-4 py-2 md:py-3 text-center">
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {produto.prioridade === 'CRITICO' && (
              <span className="text-[8px] md:text-[10px] bg-red-600/20 text-red-700 dark:text-red-300 px-1 md:px-2 py-0.5 rounded-full font-bold border border-red-600/30">
                ⚠️ CRÍTICO
              </span>
            )}
            {produto.prioridade === 'PRECISA_REPOR' && (
              <span className="text-[8px] md:text-[10px] bg-yellow-600/20 text-yellow-700 dark:text-yellow-300 px-1 md:px-2 py-0.5 rounded-full font-bold border border-yellow-600/30">
                🔸 Precisa Repor
              </span>
            )}
            {produto.prioridade === 'NAO_PRECISA' && (
              <span className="text-[8px] md:text-[10px] bg-green-600/20 text-green-700 dark:text-green-300 px-1 md:px-2 py-0.5 rounded-full font-bold border border-green-600/30">
                ✅ Ok
              </span>
            )}
            {jaSincronizado ? (
              <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-[#16a34a]" />
            ) : (
              <XCircle className="w-3 h-3 md:w-4 md:h-4 text-[#f97316]" />
            )}
          </div>
        </td>
        <td className="px-2 md:px-4 py-2 md:py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSincronizar(produto.codigo);
              }}
              disabled={isSincronizando === produto.codigo}
              className={cn(
                "h-6 md:h-7 px-1.5 md:px-2 text-[9px] md:text-[11px] transition-all",
                jaSincronizado
                  ? "text-[#16a34a] hover:bg-[#16a34a]/10"
                  : "text-[#f97316] hover:bg-[#f97316]/10"
              )}
            >
              {isSincronizando === produto.codigo ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshIcon className="w-3 h-3" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(produto.codigo);
              }}
              className="h-6 md:h-7 w-6 md:w-7 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-3 h-3 md:w-4 md:h-4 text-[#86868b]" />
              ) : (
                <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-[#86868b]" />
              )}
            </Button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={8} className="px-2 md:px-4 py-3 bg-[#f5f5f7]/30 dark:bg-[#2c2c2e]/30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
              <div>
                <span className="text-[#86868b]">Preço:</span>
                <span className="ml-2 font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                  {formatPrice(produto.preco)}
                </span>
              </div>
              <div>
                <span className="text-[#86868b]">Unidade:</span>
                <span className="ml-2 font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                  {produto.unidade}
                </span>
              </div>
              <div>
                <span className="text-[#86868b]">Criado:</span>
                <span className="ml-2 text-[#1c1c1e] dark:text-[#f5f5f7]">
                  {new Date(produto.criado_em).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-[#86868b]">Atualizado:</span>
                <span className="ml-2 text-[#1c1c1e] dark:text-[#f5f5f7]">
                  {new Date(produto.ultima_atualizacao).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

export default function Estoque() {
  const { usuario } = useAuth();
  const { showToast } = useToast();
  
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState<ProdutoEstoque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSincronizando, setIsSincronizando] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosReposicao>({});
  const [epocaSelecionada, setEpocaSelecionada] = useState<EpocaEstoque>(getEpocaSelecionada);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<OrdemTipo>('alfabetica_asc');
  const [classeFiltro, setClasseFiltro] = useState<ClasseFiltro>('todos');
  const [depositoFiltro, setDepositoFiltro] = useState<DepositoFiltro>('todos');
  const [visibleCount, setVisibleCount] = useState(20);
  const [ultimaAtualizacaoLive, setUltimaAtualizacaoLive] = useState<Date | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setVisibleCount(window.innerWidth < 768 ? 10 : 50);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isAdmin = usuario?.tipo === 'admin';
  const debouncedBusca = useDebounce(filtros.busca || '', 300);

  useEffect(() => {
    const handleStorageChange = () => {
      setEpocaSelecionada(getEpocaSelecionada());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const carregarProdutos = useCallback(async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const data = await estoqueService.buscarProdutosReposicao(forceRefresh, epocaSelecionada);
      setProdutos(data);
      setVisibleCount(isMobile ? 10 : 50);
    } catch (error) {
      showToast('Erro ao carregar produtos', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [epocaSelecionada, showToast, isMobile]);

  // Atualização em tempo real: o backend recebe o webhook do Tiny + roda os
  // jobs automáticos e a gente só escuta o que mudou - sem F5, sem resetar
  // filtro/scroll/linha expandida (só troca os produtos que mudaram).
  useEffect(() => {
    const cancelar = estoqueService.assinarAtualizacoes((produtosAtualizados) => {
      setProdutos(produtosAtualizados);
      setUltimaAtualizacaoLive(new Date());
    });
    return cancelar;
  }, []);

  // Manda um retrato do dia pra página de Métricas poder mostrar se a
  // reposição está melhorando (menos crítico/precisa repor) ou piorando ao
  // longo do tempo. Sempre a partir de "produtos" (lista completa, sem os
  // filtros de busca/classe/depósito da tela) e no máximo 1x por dia - o
  // backend também deduplica por data, isso aqui só evita chamada à toa.
  useEffect(() => {
    if (produtos.length === 0) return;
    const hojeChave = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('estoque_snapshot_enviado') === hojeChave) return;

    const criticos = produtos.filter(p => p.prioridade === 'CRITICO').length;
    const precisaRepor = produtos.filter(p => p.prioridade === 'PRECISA_REPOR').length;
    const estoqueOk = produtos.filter(p => p.prioridade === 'NAO_PRECISA').length;

    metricasService
      .enviarSnapshotEstoque({ criticos, precisaRepor, estoqueOk, total: produtos.length })
      .then(() => localStorage.setItem('estoque_snapshot_enviado', hojeChave));
  }, [produtos]);

  useEffect(() => {
    let filtrados = estoqueService.filtrarProdutos(produtos, filtros);
    
    if (classeFiltro !== 'todos') {
      filtrados = filtrados.filter(p => {
        if (classeFiltro === 'critico') return p.prioridade === 'CRITICO';
        if (classeFiltro === 'precisa_repor') return p.prioridade === 'PRECISA_REPOR';
        if (classeFiltro === 'estoque_ok') return p.prioridade === 'NAO_PRECISA';
        return true;
      });
    }

    if (depositoFiltro !== 'todos') {
      filtrados = filtrados.filter(p => {
        if (depositoFiltro === 'controle_geral') return (p.estoque['Controle Geral'] || 0) > 0;
        if (depositoFiltro === 'deposito_loja') return (p.estoque['Deposito Loja'] || 0) > 0;
        if (depositoFiltro === 'casa_velha') return (p.estoque['Casa Velha'] || 0) > 0;
        return true;
      });
    }
    
    filtrados = ordenarProdutos(filtrados);
    setProdutosFiltrados(filtrados);
    setVisibleCount(isMobile ? 10 : 50);
  }, [filtros, produtos, ordenacao, classeFiltro, depositoFiltro, isMobile]);

  useEffect(() => {
    carregarProdutos();
  }, [epocaSelecionada]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < produtosFiltrados.length) {
          setVisibleCount(prev => Math.min(prev + (isMobile ? 10 : 30), produtosFiltrados.length));
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [produtosFiltrados.length, visibleCount, isMobile]);

  const ordenarProdutos = useCallback((lista: ProdutoEstoque[]): ProdutoEstoque[] => {
    const sorted = [...lista];
    const prioridadeOrder = { 'CRITICO': 0, 'PRECISA_REPOR': 1, 'NAO_PRECISA': 2 };
    sorted.sort((a, b) => {
      const priorA = prioridadeOrder[a.prioridade || 'NAO_PRECISA'] ?? 2;
      const priorB = prioridadeOrder[b.prioridade || 'NAO_PRECISA'] ?? 2;
      if (priorA !== priorB) return priorA - priorB;
      return 0;
    });
    
    switch (ordenacao) {
      case 'alfabetica_asc':
        sorted.sort((a, b) => {
          const priorA = prioridadeOrder[a.prioridade || 'NAO_PRECISA'] ?? 2;
          const priorB = prioridadeOrder[b.prioridade || 'NAO_PRECISA'] ?? 2;
          if (priorA !== priorB) return 0;
          return a.descricao.localeCompare(b.descricao);
        });
        break;
      case 'alfabetica_desc':
        sorted.sort((a, b) => {
          const priorA = prioridadeOrder[a.prioridade || 'NAO_PRECISA'] ?? 2;
          const priorB = prioridadeOrder[b.prioridade || 'NAO_PRECISA'] ?? 2;
          if (priorA !== priorB) return 0;
          return b.descricao.localeCompare(a.descricao);
        });
        break;
      case 'preco_asc':
        sorted.sort((a, b) => {
          const priorA = prioridadeOrder[a.prioridade || 'NAO_PRECISA'] ?? 2;
          const priorB = prioridadeOrder[b.prioridade || 'NAO_PRECISA'] ?? 2;
          if (priorA !== priorB) return 0;
          return (a.preco || 0) - (b.preco || 0);
        });
        break;
      case 'preco_desc':
        sorted.sort((a, b) => {
          const priorA = prioridadeOrder[a.prioridade || 'NAO_PRECISA'] ?? 2;
          const priorB = prioridadeOrder[b.prioridade || 'NAO_PRECISA'] ?? 2;
          if (priorA !== priorB) return 0;
          return (b.preco || 0) - (a.preco || 0);
        });
        break;
      default: break;
    }
    return sorted;
  }, [ordenacao]);

  const handleSincronizar = async (codigo: string) => {
    setIsSincronizando(codigo);
    try {
      const result = await estoqueService.sincronizarProduto(codigo);
      if (result.success) {
        showToast(`Produto ${codigo} sincronizado!`, 'success');
        await carregarProdutos(true);
      } else {
        showToast(`Erro ao sincronizar ${codigo}`, 'error');
      }
    } catch (error) {
      showToast(`Erro ao sincronizar ${codigo}`, 'error');
    } finally {
      setIsSincronizando(null);
    }
  };

  const toggleExpand = (codigo: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(codigo)) newSet.delete(codigo);
      else newSet.add(codigo);
      return newSet;
    });
  };

  const toggleOrdenacao = () => {
    const ordens: OrdemTipo[] = ['alfabetica_asc', 'alfabetica_desc', 'preco_asc', 'preco_desc'];
    const currentIndex = ordens.indexOf(ordenacao);
    setOrdenacao(ordens[(currentIndex + 1) % ordens.length]);
  };

  const getOrdenacaoLabel = () => {
    const labels = {
      'alfabetica_asc': 'A→Z',
      'alfabetica_desc': 'Z→A',
      'preco_asc': 'Menor Preço',
      'preco_desc': 'Maior Preço'
    };
    return labels[ordenacao];
  };

  const getOrdenacaoIcon = () => {
    switch (ordenacao) {
      case 'alfabetica_asc': return <ArrowUp className="w-3 h-3" />;
      case 'alfabetica_desc': return <ArrowDown className="w-3 h-3" />;
      case 'preco_asc': return <ArrowUp className="w-3 h-3" />;
      case 'preco_desc': return <ArrowDown className="w-3 h-3" />;
      default: return <ArrowUpDown className="w-3 h-3" />;
    }
  };

  const getClasseFiltroLabel = () => {
    const labels = {
      'todos': 'Todos',
      'critico': 'Crítico',
      'precisa_repor': 'Precisa Repor',
      'estoque_ok': 'Ok'
    };
    return labels[classeFiltro];
  };

  const getDepositoFiltroLabel = () => {
    const labels = {
      'todos': 'Todos',
      'controle_geral': 'Controle Geral',
      'deposito_loja': 'Depósito Loja',
      'casa_velha': 'Casa Velha'
    };
    return labels[depositoFiltro];
  };

  const visibleProdutos = useMemo(() => produtosFiltrados.slice(0, visibleCount), [produtosFiltrados, visibleCount]);

  const stats = useMemo(() => {
    const criticos = produtosFiltrados.filter(p => p.prioridade === 'CRITICO').length;
    const precisaRepor = produtosFiltrados.filter(p => p.prioridade === 'PRECISA_REPOR').length;
    const estoqueOk = produtosFiltrados.filter(p => p.prioridade === 'NAO_PRECISA').length;
    return { total: produtosFiltrados.length, criticos, precisaRepor, estoqueOk };
  }, [produtosFiltrados]);

  const renderMobileCard = (produto: ProdutoEstoque) => {
    const getPriority = () => {
      if (produto.prioridade === 'CRITICO') return 'critico';
      if (produto.prioridade === 'PRECISA_REPOR') return 'precisa_repor';
      return 'ok';
    };

    return (
      <CardItem key={produto.codigo} priority={getPriority()}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
                #{produto.codigo}
              </span>
              {produto.prioridade === 'CRITICO' && (
                <span className="text-[10px] bg-red-600/20 text-red-700 px-1.5 py-0.5 rounded-full font-bold">⚠️</span>
              )}
            </div>
            <div className="text-sm text-[#1c1c1e] dark:text-[#f5f5f7] line-clamp-2 mt-0.5">
              {produto.descricao}
            </div>
            <div className="text-xs text-[#86868b] mt-0.5 font-mono">
              GTIN: {produto.gtin || 'N/A'}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSincronizar(produto.codigo)}
            disabled={isSincronizando === produto.codigo}
            className="h-8 w-8 p-0 ml-2 shrink-0"
          >
            {isSincronizando === produto.codigo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshIcon className="w-4 h-4 text-[#f97316]" />
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-1 mt-2 text-sm">
          <div className="flex items-center gap-1">
            <Building2 className="w-3 h-3 text-[#007aff]" />
            <span className="text-[#1c1c1e] dark:text-[#f5f5f7]">{produto.estoque['Controle Geral'] || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Warehouse className="w-3 h-3 text-[#34c759]" />
            <span className="text-[#1c1c1e] dark:text-[#f5f5f7]">{produto.estoque['Deposito Loja'] || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Home className="w-3 h-3 text-[#ff9500]" />
            <span className="text-[#1c1c1e] dark:text-[#f5f5f7]">{produto.estoque['Casa Velha'] || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#86868b]">Necessidade:</span>
            <span className={cn(
              "font-semibold",
              produto.necessidadeRepor > 0 ? "text-[#dc2626]" : "text-[#16a34a]"
            )}>
              {produto.necessidadeRepor || 0}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#e5e5ea]/50 dark:border-[#38383a]/50">
          <span className="text-xs text-[#86868b] flex items-center gap-2">
            Mínimo: {produto.estoqueMinimoCalculado || 0}
            {(produto.totalReservado || 0) > 0 && (
              <span className="flex items-center gap-0.5" title="Reservado - não conta como disponível">
                <Lock className="w-2.5 h-2.5" />
                {produto.totalReservado} res.
              </span>
            )}
          </span>
          <button
            onClick={() => toggleExpand(produto.codigo)}
            className="text-xs text-[#007aff] flex items-center gap-1"
          >
            {expandedRows.has(produto.codigo) ? 'Ver menos' : 'Ver mais'}
            <ChevronDown className={cn(
              "w-3 h-3 transition-transform",
              expandedRows.has(produto.codigo) && "rotate-180"
            )} />
          </button>
        </div>

        {expandedRows.has(produto.codigo) && (
          <div className="mt-2 pt-2 border-t border-[#e5e5ea]/50 dark:border-[#38383a]/50 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[#86868b]">GTIN:</span>
              <span className="font-mono">{produto.gtin || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#86868b]">Preço:</span>
              <span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#86868b]">Unidade:</span>
              <span>{produto.unidade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#86868b]">Criado:</span>
              <span>{new Date(produto.criado_em).toLocaleDateString('pt-BR')}</span>
            </div>
            {produto.tiny?.id && (
              <div className="flex justify-between">
                <span className="text-[#86868b]">Tiny ID:</span>
                <span>{produto.tiny.id}</span>
              </div>
            )}
          </div>
        )}
      </CardItem>
    );
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f5f5f7] dark:bg-[#1a1a1e]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-[#007aff]" />
          <p className="text-sm text-[#86868b]">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f5f5f7] dark:bg-[#1a1a1e] p-2 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">
              Reposição de Estoque
            </h1>
            <p className="text-xs md:text-sm text-[#86868b]">
              {stats.total} produtos exibidos
            </p>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
            <span
              className="text-[10px] md:text-xs text-[#16a34a] bg-[#16a34a]/10 px-2 md:px-3 py-1 rounded-full flex items-center gap-1"
              title="A lista se atualiza sozinha quando o estoque muda no Tiny - não precisa dar F5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
              {ultimaAtualizacaoLive
                ? `Ao vivo · ${ultimaAtualizacaoLive.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Ao vivo'}
            </span>

            <span className="text-[10px] md:text-xs text-[#86868b] bg-[#f5f5f7] dark:bg-[#2c2c2e] px-2 md:px-3 py-1 rounded-full">
              {epocaSelecionada === 'dia_a_dia' ? '📅 Dia a Dia' : '📚 Volta às Aulas'}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => carregarProdutos(true)}
              disabled={isRefreshing}
              className="gap-1 text-xs md:text-sm"
            >
              <RefreshCw className={cn("w-3 h-3 md:w-4 md:h-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-3 mb-3 md:mb-6">
          <div className="bg-white/80 dark:bg-[#1c1c1e]/80 rounded-lg md:rounded-xl p-2 md:p-3 border border-[#e5e5ea] dark:border-[#38383a]">
            <p className="text-[10px] md:text-xs text-[#86868b]">Total</p>
            <p className="text-base md:text-xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">{stats.total}</p>
          </div>
          <div className="bg-white/80 dark:bg-[#1c1c1e]/80 rounded-lg md:rounded-xl p-2 md:p-3 border border-[#e5e5ea] dark:border-[#38383a]">
            <p className="text-[10px] md:text-xs font-medium text-red-600 dark:text-red-400">🔴 CRÍTICO</p>
            <p className="text-base md:text-xl font-bold text-[#dc2626]">{stats.criticos}</p>
          </div>
          <div className="bg-white/80 dark:bg-[#1c1c1e]/80 rounded-lg md:rounded-xl p-2 md:p-3 border border-[#e5e5ea] dark:border-[#38383a]">
            <p className="text-[10px] md:text-xs font-medium text-yellow-600 dark:text-yellow-400">🟡 Precisa</p>
            <p className="text-base md:text-xl font-bold text-[#ca8a04]">{stats.precisaRepor}</p>
          </div>
          <div className="bg-white/80 dark:bg-[#1c1c1e]/80 rounded-lg md:rounded-xl p-2 md:p-3 border border-[#e5e5ea] dark:border-[#38383a]">
            <p className="text-[10px] md:text-xs font-medium text-green-600 dark:text-green-400">🟢 Ok</p>
            <p className="text-base md:text-xl font-bold text-[#16a34a]">{stats.estoqueOk}</p>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-[#1c1c1e]/80 rounded-lg md:rounded-xl p-2 md:p-3 border border-[#e5e5ea] dark:border-[#38383a] mb-3 md:mb-6">
          <div className="flex flex-col md:flex-row gap-2 md:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-[#86868b]" />
              <Input
                placeholder="Buscar..."
                className="pl-7 md:pl-9 h-8 md:h-9 text-xs md:text-sm"
                value={filtros.busca || ''}
                onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap gap-1 md:gap-1.5">
              <button
                onClick={() => {
                  const classes: ClasseFiltro[] = ['todos', 'critico', 'precisa_repor', 'estoque_ok'];
                  const currentIndex = classes.indexOf(classeFiltro);
                  setClasseFiltro(classes[(currentIndex + 1) % classes.length]);
                }}
                className={cn(
                  "px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-medium transition-all whitespace-nowrap",
                  classeFiltro !== 'todos'
                    ? "bg-[#007aff] text-white"
                    : "bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b]"
                )}
              >
                <Filter className="w-3 h-3 inline mr-0.5" />
                {getClasseFiltroLabel()}
              </button>
              
              <button
                onClick={() => {
                  const depositos: DepositoFiltro[] = ['todos', 'controle_geral', 'deposito_loja', 'casa_velha'];
                  const currentIndex = depositos.indexOf(depositoFiltro);
                  setDepositoFiltro(depositos[(currentIndex + 1) % depositos.length]);
                }}
                className={cn(
                  "px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-medium transition-all whitespace-nowrap",
                  depositoFiltro !== 'todos'
                    ? "bg-[#34c759] text-white"
                    : "bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b]"
                )}
              >
                {depositoFiltro === 'todos' ? <Package className="w-3 h-3 inline" /> :
                 depositoFiltro === 'controle_geral' ? <Building2 className="w-3 h-3 inline" /> :
                 depositoFiltro === 'deposito_loja' ? <Store className="w-3 h-3 inline" /> :
                 <Home className="w-3 h-3 inline" />}
                {getDepositoFiltroLabel()}
              </button>
              
              <button
                onClick={() => setFiltros(prev => ({ ...prev, apenasRepor: !prev.apenasRepor }))}
                className={cn(
                  "px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-medium transition-all whitespace-nowrap",
                  filtros.apenasRepor ? "bg-[#ff3b30] text-white" : "bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b]"
                )}
              >
                Precisa
              </button>
              <button
                onClick={() => setFiltros(prev => ({ ...prev, apenasNaoSincronizados: !prev.apenasNaoSincronizados }))}
                className={cn(
                  "px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-medium transition-all whitespace-nowrap",
                  filtros.apenasNaoSincronizados ? "bg-[#ff9500] text-white" : "bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b]"
                )}
              >
                Não Sinc.
              </button>
              
              <button
                onClick={toggleOrdenacao}
                className="px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-medium transition-all whitespace-nowrap flex items-center gap-0.5 bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b]"
              >
                {getOrdenacaoIcon()}
                {getOrdenacaoLabel()}
              </button>
            </div>
          </div>
        </div>

        <div className="hidden md:block bg-white/80 dark:bg-[#1c1c1e]/80 rounded-xl border border-[#e5e5ea] dark:border-[#38383a] overflow-hidden">
          <TableWrapper>
            <table className="w-full">
              <thead className="bg-[#f5f5f7] dark:bg-[#2c2c2e] border-b border-[#e5e5ea] dark:border-[#38383a] sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#86868b]">Código</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#86868b]">Descrição</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#86868b]">GTIN</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-[#86868b]">Estoques</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-[#86868b]">Mínimo</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-[#86868b]">Necessidade</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-[#86868b]">Status</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-[#86868b]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleProdutos.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-[#86868b]">Nenhum produto encontrado</td></tr>
                ) : (
                  visibleProdutos.map((produto) => (
                    <ProdutoRow
                      key={produto.codigo}
                      produto={produto}
                      isExpanded={expandedRows.has(produto.codigo)}
                      isSincronizando={isSincronizando}
                      epocaSelecionada={epocaSelecionada}
                      onToggleExpand={toggleExpand}
                      onSincronizar={handleSincronizar}
                    />
                  ))
                )}
              </tbody>
            </table>
          </TableWrapper>
          
          {visibleCount < produtosFiltrados.length && (
            <div ref={loadMoreRef} className="py-3 text-center text-sm text-[#86868b]">
              <Loader2 className="w-4 h-4 mx-auto animate-spin" />
              <span className="block mt-1">Carregando mais...</span>
            </div>
          )}
          
          <div className="px-4 py-2 border-t border-[#e5e5ea] dark:border-[#38383a] text-xs text-[#86868b] text-center">
            {visibleProdutos.length} de {produtosFiltrados.length} produtos
          </div>
        </div>

        <div className="md:hidden">
          <CardList>
            {visibleProdutos.length === 0 ? (
              <div className="text-center py-8 text-[#86868b]">Nenhum produto encontrado</div>
            ) : (
              visibleProdutos.map((produto) => renderMobileCard(produto))
            )}
          </CardList>
          
          {visibleCount < produtosFiltrados.length && (
            <div ref={loadMoreRef} className="py-3 text-center text-sm text-[#86868b]">
              <Loader2 className="w-4 h-4 mx-auto animate-spin" />
              <span className="block mt-1">Carregando mais...</span>
            </div>
          )}
          
          <div className="mt-2 text-xs text-[#86868b] text-center">
            {visibleProdutos.length} de {produtosFiltrados.length} produtos
          </div>
        </div>
      </div>
    </div>
  );
}
