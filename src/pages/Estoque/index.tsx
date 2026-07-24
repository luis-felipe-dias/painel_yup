import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { estoqueService } from '../../services/estoque.service';
import { ProdutoEstoque, FiltrosReposicao, EpocaEstoque } from '../../types/estoque.types';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ModalContent } from '../../components/ui/Modal';
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
  FileText,
  Upload,
  Send,
  X as XIcon
} from 'lucide-react';
import { cn } from '../../utils/cn';

// Obter época do localStorage
const getEpocaSelecionada = (): EpocaEstoque => {
  return (localStorage.getItem('epoca_estoque') as EpocaEstoque) || 'dia_a_dia';
};

// Tipos de ordenação
type OrdemTipo = 'alfabetica_asc' | 'alfabetica_desc' | 'preco_asc' | 'preco_desc';

// Filtros por classe
type ClasseFiltro = 'todos' | 'critico' | 'precisa_repor' | 'estoque_ok';

// Componente de linha otimizado com React.memo
const ProdutoRow = React.memo(({ 
  produto, 
  isExpanded, 
  isAdmin, 
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

  // Cores de fundo baseadas na prioridade
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
          "cursor-pointer transition-colors",
          getRowBgColor()
        )}
        onClick={() => onToggleExpand(produto.codigo)}
      >
        <td className="px-4 py-3 text-sm font-mono text-[#1c1c1e] dark:text-[#f5f5f7]">
          {produto.codigo}
        </td>
        <td className="px-4 py-3 text-sm text-[#1c1c1e] dark:text-[#f5f5f7]">
          <div className="line-clamp-2 max-w-xs" title={produto.descricao}>
            {produto.descricao}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-[#86868b] font-mono">
          {produto.gtin || '-'}
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex flex-col items-center gap-0.5 text-sm">
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
          </div>
        </td>
        <td className="px-4 py-3 text-center text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
          {produto.estoqueMinimoCalculado || 0}
        </td>
        <td className="px-4 py-3 text-center text-sm font-semibold">
          <span className={cn(
            produto.necessidadeRepor > 0 ? "text-[#dc2626]" : "text-[#16a34a]"
          )}>
            {produto.necessidadeRepor || 0}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5">
            {produto.prioridade === 'CRITICO' && (
              <span className="text-[10px] bg-red-600/20 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-bold border border-red-600/30">
                ⚠️ CRÍTICO
              </span>
            )}
            {produto.prioridade === 'PRECISA_REPOR' && (
              <span className="text-[10px] bg-yellow-600/20 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full font-bold border border-yellow-600/30">
                🔸 Precisa Repor
              </span>
            )}
            {produto.prioridade === 'NAO_PRECISA' && (
              <span className="text-[10px] bg-green-600/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-bold border border-green-600/30">
                ✅ Ok
              </span>
            )}
            {jaSincronizado ? (
              <CheckCircle className="w-4 h-4 text-[#16a34a]" />
            ) : (
              <XCircle className="w-4 h-4 text-[#f97316]" />
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            {/* Botão Sincronizar - disponível para todos */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSincronizar(produto.codigo);
              }}
              disabled={isSincronizando === produto.codigo}
              className={cn(
                "h-7 px-2 text-[11px] transition-all",
                jaSincronizado
                  ? "text-[#16a34a] hover:bg-[#16a34a]/10"
                  : "text-[#f97316] hover:bg-[#f97316]/10"
              )}
              title={jaSincronizado ? "Produto já sincronizado" : "Sincronizar produto"}
            >
              {isSincronizando === produto.codigo ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshIcon className="w-3 h-3 mr-1" />
                  {jaSincronizado ? 'Sincronizado' : 'Sincronizar'}
                </>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(produto.codigo);
              }}
              className="h-7 w-7 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-[#86868b]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#86868b]" />
              )}
            </Button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={8} className="px-4 py-3 bg-[#f5f5f7]/30 dark:bg-[#2c2c2e]/30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                <span className="text-[#86868b]">Criado em:</span>
                <span className="ml-2 text-[#1c1c1e] dark:text-[#f5f5f7]">
                  {new Date(produto.criado_em).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-[#86868b]">Última atualização:</span>
                <span className="ml-2 text-[#1c1c1e] dark:text-[#f5f5f7]">
                  {new Date(produto.ultima_atualizacao).toLocaleDateString('pt-BR')}
                </span>
              </div>
              {produto.tiny?.id && (
                <>
                  <div>
                    <span className="text-[#86868b]">Tiny ID:</span>
                    <span className="ml-2 text-[#1c1c1e] dark:text-[#f5f5f7]">
                      {produto.tiny.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#86868b]">Preço Custo:</span>
                    <span className="ml-2 text-[#1c1c1e] dark:text-[#f5f5f7]">
                      {formatPrice(produto.tiny.preco_custo)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

ProdutoRow.displayName = 'ProdutoRow';

export default function Estoque() {
  const { usuario } = useAuth();
  const { showToast } = useToast();
  
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState<ProdutoEstoque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSincronizando, setIsSincronizando] = useState<string | null>(null);
  const [isProcessando, setIsProcessando] = useState(false);
  const [isEnviandoRelatorio, setIsEnviandoRelatorio] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosReposicao>({});
  const [epocaSelecionada, setEpocaSelecionada] = useState<EpocaEstoque>(getEpocaSelecionada);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<OrdemTipo>('alfabetica_asc');
  const [classeFiltro, setClasseFiltro] = useState<ClasseFiltro>('todos');
  const [visibleCount, setVisibleCount] = useState(50);
  const [modalRelatorioAberto, setModalRelatorioAberto] = useState(false);
  const [textoRelatorio, setTextoRelatorio] = useState('');
  const [processandoLogs, setProcessandoLogs] = useState<any[]>([]);
  const [mostrarLogs, setMostrarLogs] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const isAdmin = usuario?.tipo === 'admin';
  const debouncedBusca = useDebounce(filtros.busca || '', 300);

  // Atualizar época quando mudar no localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setEpocaSelecionada(getEpocaSelecionada());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Carregar produtos com lazy loading
  const carregarProdutos = useCallback(async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const data = await estoqueService.buscarProdutosReposicao(forceRefresh, epocaSelecionada);
      setProdutos(data);
      setVisibleCount(50);
    } catch (error) {
      showToast('Erro ao carregar produtos', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [epocaSelecionada, showToast]);

  // Aplicar filtros e ordenação
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
    
    filtrados = ordenarProdutos(filtrados);
    setProdutosFiltrados(filtrados);
    setVisibleCount(50);
  }, [filtros, produtos, ordenacao, classeFiltro]);

  // Carregar na montagem
  useEffect(() => {
    carregarProdutos();
  }, [epocaSelecionada]);

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < produtosFiltrados.length) {
          setVisibleCount(prev => Math.min(prev + 30, produtosFiltrados.length));
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [produtosFiltrados.length, visibleCount]);

  // Função de ordenação
  const ordenarProdutos = useCallback((lista: ProdutoEstoque[]): ProdutoEstoque[] => {
    const sorted = [...lista];
    
    const prioridadeOrder = { 'CRITICO': 0, 'PRECISA_REPOR': 1, 'NAO_PRECISA': 2 };
    sorted.sort((a, b) => {
      const priorA = prioridadeOrder[a.prioridade || 'NAO_PRECISA'] ?? 2;
      const priorB = prioridadeOrder[b.prioridade || 'NAO_PRECISA'] ?? 2;
      if (priorA !== priorB) {
        return priorA - priorB;
      }
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
      default:
        break;
    }
    
    return sorted;
  }, [ordenacao]);

  const handleSincronizar = async (codigo: string) => {
    // Removido o bloqueio de admin - todos podem sincronizar
    setIsSincronizando(codigo);
    try {
      const result = await estoqueService.sincronizarProduto(codigo);
      
      if (result.success) {
        showToast(`Produto ${codigo} sincronizado com sucesso!`, 'success');
        await carregarProdutos(true);
      } else {
        showToast(`Erro ao sincronizar produto ${codigo}`, 'error');
      }
    } catch (error) {
      showToast(`Erro ao sincronizar produto ${codigo}`, 'error');
    } finally {
      setIsSincronizando(null);
    }
  };

  const toggleExpand = (codigo: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(codigo)) {
        newSet.delete(codigo);
      } else {
        newSet.add(codigo);
      }
      return newSet;
    });
  };

  const toggleOrdenacao = () => {
    const ordens: OrdemTipo[] = ['alfabetica_asc', 'alfabetica_desc', 'preco_asc', 'preco_desc'];
    const currentIndex = ordens.indexOf(ordenacao);
    const nextIndex = (currentIndex + 1) % ordens.length;
    setOrdenacao(ordens[nextIndex]);
  };

  const getOrdenacaoLabel = () => {
    const labels = {
      'alfabetica_asc': 'A → Z',
      'alfabetica_desc': 'Z → A',
      'preco_asc': 'Menor Preço',
      'preco_desc': 'Maior Preço'
    };
    return labels[ordenacao];
  };

  const getOrdenacaoIcon = () => {
    switch (ordenacao) {
      case 'alfabetica_asc':
        return <ArrowUp className="w-3 h-3" />;
      case 'alfabetica_desc':
        return <ArrowDown className="w-3 h-3" />;
      case 'preco_asc':
        return <ArrowUp className="w-3 h-3" />;
      case 'preco_desc':
        return <ArrowDown className="w-3 h-3" />;
      default:
        return <ArrowUpDown className="w-3 h-3" />;
    }
  };

  const getClasseFiltroLabel = () => {
    const labels = {
      'todos': '📋 Todos',
      'critico': '🔴 Crítico',
      'precisa_repor': '🟡 Precisa Repor',
      'estoque_ok': '🟢 Ok'
    };
    return labels[classeFiltro];
  };

  // Enviar relatório de estoque
  const handleEnviarRelatorio = async () => {
    if (!textoRelatorio.trim()) {
      showToast('Digite o relatório antes de enviar', 'warning');
      return;
    }

    setIsEnviandoRelatorio(true);
    try {
      const response = await fetch(
        'https://api.nowlords.com.br/estoque/arquivo/texto?criar_backup=false',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'Accept': 'application/json'
          },
          body: textoRelatorio
        }
      );

      const data = await response.json();
      
      if (data.sucesso) {
        showToast(`Relatório enviado com sucesso! ${data.total_linhas} linhas`, 'success');
        setModalRelatorioAberto(false);
        setTextoRelatorio('');
      } else {
        showToast('Erro ao enviar relatório', 'error');
      }
    } catch (error) {
      console.error('Erro ao enviar relatório:', error);
      showToast('Erro ao enviar relatório', 'error');
    } finally {
      setIsEnviandoRelatorio(false);
    }
  };

  // Processar estoque (sincronizar)
  const handleProcessarEstoque = async () => {
    // Removido o bloqueio de admin - todos podem processar
    setIsProcessando(true);
    setProcessandoLogs([]);
    setMostrarLogs(false);
    
    try {
      const response = await fetch(
        'https://api.nowlords.com.br/estoque/processar',
        {
          method: 'POST',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (data.sucesso) {
        showToast(`Processamento concluído: ${data.produtos_atualizados} atualizados, ${data.produtos_novos} novos`, 'success');
        setProcessandoLogs(data.logs || []);
        setMostrarLogs(true);
        // Recarregar produtos
        await carregarProdutos(true);
      } else {
        showToast('Erro ao processar estoque', 'error');
      }
    } catch (error) {
      console.error('Erro ao processar estoque:', error);
      showToast('Erro ao processar estoque', 'error');
    } finally {
      setIsProcessando(false);
    }
  };

  // Produtos visíveis
  const visibleProdutos = useMemo(() => {
    return produtosFiltrados.slice(0, visibleCount);
  }, [produtosFiltrados, visibleCount]);

  // Estatísticas
  const stats = useMemo(() => {
    const criticos = produtosFiltrados.filter(p => p.prioridade === 'CRITICO').length;
    const precisaRepor = produtosFiltrados.filter(p => p.prioridade === 'PRECISA_REPOR').length;
    const estoqueOk = produtosFiltrados.filter(p => p.prioridade === 'NAO_PRECISA').length;
    const sincronizados = produtosFiltrados.filter(p => p.sincronizado && p.tiny?.id).length;
    const naoSincronizados = produtosFiltrados.filter(p => !p.sincronizado || !p.tiny?.id).length;
    
    return { total: produtosFiltrados.length, criticos, precisaRepor, estoqueOk, sincronizados, naoSincronizados };
  }, [produtosFiltrados]);

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
    <div className="h-full overflow-y-auto bg-[#f5f5f7] dark:bg-[#1a1a1e] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">
              Reposição de Estoque
            </h1>
            <p className="text-sm text-[#86868b]">
              {stats.total} produtos precisam de atenção
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#86868b] bg-[#f5f5f7] dark:bg-[#2c2c2e] px-3 py-1.5 rounded-full">
              {epocaSelecionada === 'dia_a_dia' ? '📅 Dia a Dia' : '📚 Volta às Aulas'}
            </span>
            
            {/* Botões disponíveis para todos os perfis */}
            <Button
              variant="outline"
              onClick={() => setModalRelatorioAberto(true)}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Informar Estoque
            </Button>
            
            <Button
              variant="outline"
              onClick={handleProcessarEstoque}
              disabled={isProcessando}
              className="gap-2"
            >
              {isProcessando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isProcessando ? 'Processando...' : 'Sincronizar'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => carregarProdutos(true)}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-xl p-3 border border-[#e5e5ea] dark:border-[#38383a]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#86868b]">Total</p>
                <p className="text-xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">
                  {stats.total}
                </p>
              </div>
              <Package className="w-6 h-6 text-[#007aff] opacity-50" />
            </div>
          </div>
          
          <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-xl p-3 border border-[#e5e5ea] dark:border-[#38383a]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400">🔴 CRÍTICO</p>
                <p className="text-xl font-bold text-[#dc2626]">
                  {stats.criticos}
                </p>
              </div>
              <AlertCircle className="w-6 h-6 text-[#dc2626] opacity-50" />
            </div>
          </div>
          
          <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-xl p-3 border border-[#e5e5ea] dark:border-[#38383a]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">🟡 Precisa Repor</p>
                <p className="text-xl font-bold text-[#ca8a04]">
                  {stats.precisaRepor}
                </p>
              </div>
              <TrendingUp className="w-6 h-6 text-[#ca8a04] opacity-50" />
            </div>
          </div>
          
          <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-xl p-3 border border-[#e5e5ea] dark:border-[#38383a]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400">🟢 Ok</p>
                <p className="text-xl font-bold text-[#16a34a]">
                  {stats.estoqueOk}
                </p>
              </div>
              <CheckCircle className="w-6 h-6 text-[#16a34a] opacity-50" />
            </div>
          </div>
        </div>

        {/* Filtros e Ordenação */}
        <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-xl p-3 border border-[#e5e5ea] dark:border-[#38383a] mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
              <Input
                placeholder="Buscar por código, descrição ou GTIN..."
                className="pl-9 h-9 text-sm"
                value={filtros.busca || ''}
                onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {/* Filtro por Classe */}
              <button
                onClick={() => {
                  const classes: ClasseFiltro[] = ['todos', 'critico', 'precisa_repor', 'estoque_ok'];
                  const currentIndex = classes.indexOf(classeFiltro);
                  const nextIndex = (currentIndex + 1) % classes.length;
                  setClasseFiltro(classes[nextIndex]);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1",
                  classeFiltro !== 'todos'
                    ? "bg-[#007aff] text-white"
                    : "bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#1c1c1e] dark:text-[#f5f5f7] hover:bg-[#e5e5ea] dark:hover:bg-[#3a3a3c]"
                )}
              >
                <Filter className="w-3 h-3" />
                {getClasseFiltroLabel()}
              </button>
              
              <button
                onClick={() => setFiltros(prev => ({ ...prev, apenasRepor: !prev.apenasRepor }))}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  filtros.apenasRepor
                    ? "bg-[#ff3b30] text-white"
                    : "bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b] hover:text-[#1c1c1e]"
                )}
              >
                Precisa Repor
              </button>
              <button
                onClick={() => setFiltros(prev => ({ ...prev, apenasNaoSincronizados: !prev.apenasNaoSincronizados }))}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  filtros.apenasNaoSincronizados
                    ? "bg-[#ff9500] text-white"
                    : "bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b] hover:text-[#1c1c1e]"
                )}
              >
                Não Sincronizados
              </button>
              
              {/* Botão de Ordenação */}
              <button
                onClick={toggleOrdenacao}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1",
                  "bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#1c1c1e] dark:text-[#f5f5f7] hover:bg-[#e5e5ea] dark:hover:bg-[#3a3a3c]"
                )}
              >
                {getOrdenacaoIcon()}
                {getOrdenacaoLabel()}
              </button>
            </div>
          </div>
        </div>

        {/* Logs do Processamento */}
        {mostrarLogs && processandoLogs.length > 0 && (
          <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-xl p-4 border border-[#e5e5ea] dark:border-[#38383a] mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                Logs do Processamento
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarLogs(false)}
                className="h-6 px-2 text-xs"
              >
                Fechar
              </Button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-lg p-3">
              {processandoLogs.map((log, index) => (
                <div key={index} className="text-xs flex items-start gap-2">
                  <span className="text-[#86868b] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={cn(
                    "font-medium",
                    log.tipo === 'info' ? "text-[#007aff]" :
                    log.tipo === 'warning' ? "text-[#ff9500]" :
                    log.tipo === 'error' ? "text-[#ff3b30]" :
                    "text-[#86868b]"
                  )}>
                    {log.tipo?.toUpperCase()}
                  </span>
                  <span className="text-[#1c1c1e] dark:text-[#f5f5f7]">
                    {log.mensagem}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Produtos */}
        <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-xl border border-[#e5e5ea] dark:border-[#38383a] overflow-hidden">
          <div className="overflow-x-auto">
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
              <tbody className="divide-y divide-[#e5e5ea] dark:divide-[#38383a]">
                {visibleProdutos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[#86868b]">
                      Nenhum produto encontrado
                    </td>
                  </tr>
                ) : (
                  visibleProdutos.map((produto) => (
                    <ProdutoRow
                      key={produto.codigo}
                      produto={produto}
                      isExpanded={expandedRows.has(produto.codigo)}
                      isAdmin={isAdmin}
                      isSincronizando={isSincronizando}
                      epocaSelecionada={epocaSelecionada}
                      onToggleExpand={toggleExpand}
                      onSincronizar={handleSincronizar}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Load more trigger */}
          {visibleCount < produtosFiltrados.length && (
            <div ref={loadMoreRef} className="py-4 text-center text-sm text-[#86868b]">
              <Loader2 className="w-4 h-4 mx-auto animate-spin" />
              <span className="block mt-1">Carregando mais produtos...</span>
            </div>
          )}
          
          {/* Contador */}
          <div className="px-4 py-2 border-t border-[#e5e5ea] dark:border-[#38383a] text-xs text-[#86868b] text-center">
            Mostrando {Math.min(visibleCount, produtosFiltrados.length)} de {produtosFiltrados.length} produtos
          </div>
        </div>
      </div>

      {/* Modal de Relatório */}
      <Modal open={modalRelatorioAberto} onOpenChange={(isOpen) => !isOpen && setModalRelatorioAberto(false)}>
        <ModalContent className="max-w-4xl p-0 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
                Informar Estoque
              </h2>
              <button
                onClick={() => setModalRelatorioAberto(false)}
                className="text-[#86868b] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7] mb-2">
                Digite o relatório de estoque
              </label>
              <p className="text-xs text-[#86868b] mb-2">
                Formato: Código (SKU) | Descrição | Preço | Estoque | Unidade | Localização
              </p>
              <textarea
                value={textoRelatorio}
                onChange={(e) => setTextoRelatorio(e.target.value)}
                className="w-full h-64 p-3 bg-[#f5f5f7] dark:bg-[#2c2c2e] border-0 rounded-lg resize-none text-[#1c1c1e] dark:text-[#f5f5f7] placeholder:text-[#86868b] focus:ring-1 focus:ring-[#007aff] outline-none font-mono text-sm"
                placeholder="Exemplo:&#10;24405	COFRE DE GESSO BLOCO DE TIJOLOS SUPER MARIO |	18,00	0	Un	&#10;2250	PLASTICO ADESIVO 45CM TIJOLO COLONIAL CON-TACT | NÃO DEFINIDA	12,50	0	Un	"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setModalRelatorioAberto(false)}
                disabled={isEnviandoRelatorio}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEnviarRelatorio}
                disabled={!textoRelatorio.trim() || isEnviandoRelatorio}
                className="bg-[#007aff] hover:bg-[#0066d9]"
              >
                {isEnviandoRelatorio ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Relatório
                  </>
                )}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}