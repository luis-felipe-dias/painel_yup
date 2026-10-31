import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { estoqueService } from '../../services/estoque.service';
import { metricasService } from '../../services/metricas.service';
import { ProdutoEstoque, FiltrosReposicao, EpocaEstoque } from '../../types/estoque.types';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Package,
  Building2,
  Warehouse,
  Home,
  RefreshCw as RefreshIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Store,
  Lock
} from 'lucide-react';
import { cn } from '../../utils/cn';

const getEpocaSelecionada = (): EpocaEstoque => {
  return (localStorage.getItem('epoca_estoque') as EpocaEstoque) || 'dia_a_dia';
};

type OrdemTipo = 'alfabetica_asc' | 'alfabetica_desc' | 'preco_asc' | 'preco_desc';
type ClasseFiltro = 'todos' | 'critico' | 'precisa_repor' | 'estoque_ok';
type DepositoFiltro = 'todos' | 'controle_geral' | 'deposito_loja' | 'casa_velha';

const formatarPreco = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

// Selo de status reaproveitando os tokens de status do design system:
// crítico = aguardando, atenção = chama, ok = atendendo.
const SELOS: Record<string, { rotulo: string; selo: string; borda: string }> = {
  CRITICO: {
    rotulo: 'Crítico',
    selo: 'bg-aguardando text-aguardando-ink',
    borda: 'border-l-aguardando'
  },
  PRECISA_REPOR: {
    rotulo: 'Repor',
    selo: 'bg-chama text-chama-ink',
    borda: 'border-l-chama'
  },
  NAO_PRECISA: {
    rotulo: 'Ok',
    selo: 'bg-atendendo text-atendendo-ink',
    borda: 'border-l-atendendo'
  }
};

const seloDe = (prioridade?: string) => SELOS[prioridade || 'NAO_PRECISA'] ?? SELOS.NAO_PRECISA;

// Alvo de toque no celular (44px), tamanho compacto no desktop
const BOTAO_TOQUE = 'h-toque w-toque md:h-9 md:w-9';

const ChipFiltro = ({
  ativo,
  onClick,
  children,
  title
}: {
  ativo?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={cn(
      'foco-anel shrink-0 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 h-toque md:h-9',
      'text-sm font-medium transition-colors',
      ativo
        ? 'bg-primary text-primary-foreground'
        : 'bg-surface-muted text-muted-foreground hover:text-foreground'
    )}
  >
    {children}
  </button>
);

// Cartão do celular: lê exatamente os mesmos campos da tabela do desktop.
// Mostra nome, código e os três números que decidem a reposição; o resto
// fica atrás do "Ver mais". Declarado no escopo do módulo de propósito -
// dentro da página remontaria a lista inteira a cada render.
const CartaoProduto = React.memo(({
  produto,
  isExpanded,
  isSincronizando,
  onToggleExpand,
  onSincronizar
}: any) => {
  const jaSincronizado = produto.sincronizado && produto.tiny?.id;
  const status = seloDe(produto.prioridade);
  const emEstoque =
    (produto.estoque['Controle Geral'] || 0) +
    (produto.estoque['Deposito Loja'] || 0) +
    (produto.estoque['Casa Velha'] || 0);

  return (
    <div
      className={cn(
        'rounded-lg border border-border border-l-4 bg-surface p-3 shadow-card',
        status.borda
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-foreground" title={produto.descricao}>
            {produto.descricao}
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground tnum">
            {produto.codigo}
            {produto.gtin ? ` · ${produto.gtin}` : ''}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
            status.selo
          )}
        >
          {status.rotulo}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-sm bg-surface-muted py-1.5">
          <p className="text-[11px] text-muted-foreground">Em estoque</p>
          <p className="text-base font-semibold text-foreground tnum">{emEstoque}</p>
        </div>
        <div className="rounded-sm bg-surface-muted py-1.5">
          <p className="text-[11px] text-muted-foreground">Mínimo</p>
          <p className="text-base font-semibold text-foreground tnum">
            {produto.estoqueMinimoCalculado || 0}
          </p>
        </div>
        <div className="rounded-sm bg-surface-muted py-1.5">
          <p className="text-[11px] text-muted-foreground">A repor</p>
          <p
            className={cn(
              'text-base font-semibold tnum',
              produto.necessidadeRepor > 0 ? 'text-destructive' : 'text-foreground'
            )}
          >
            {produto.necessidadeRepor || 0}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onToggleExpand(produto.codigo)}
          className="foco-anel flex items-center gap-1 rounded-sm px-1 h-toque md:h-9 text-sm text-accent-foreground"
        >
          {isExpanded ? 'Ver menos' : 'Ver mais'}
          <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
        </button>

        <div className="flex items-center gap-1">
          {jaSincronizado ? (
            <CheckCircle className="w-4 h-4 text-atendendo-ink" aria-label="Sincronizado" />
          ) : (
            <XCircle className="w-4 h-4 text-chama-ink" aria-label="Não sincronizado" />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSincronizar(produto.codigo)}
            disabled={isSincronizando === produto.codigo}
            className={cn(BOTAO_TOQUE, 'p-0 text-accent-foreground')}
            title="Sincronizar com o Tiny"
          >
            {isSincronizando === produto.codigo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshIcon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2 space-y-1 border-t border-border pt-2 text-sm animate-fade-in">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Controle Geral</span>
            <span className="font-medium text-foreground tnum">
              {produto.estoque['Controle Geral'] || 0}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Depósito Loja</span>
            <span className="font-medium text-foreground tnum">
              {produto.estoque['Deposito Loja'] || 0}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Casa Velha</span>
            <span className="font-medium text-foreground tnum">
              {produto.estoque['Casa Velha'] || 0}
            </span>
          </div>
          {(produto.totalReservado || 0) > 0 && (
            <div className="flex justify-between gap-2">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Lock className="w-3 h-3" />
                Reservado
              </span>
              <span
                className="font-medium text-foreground tnum"
                title="Reservado (pedido em aberto no Tiny) - não conta como disponível"
              >
                {produto.totalReservado}
              </span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Preço</span>
            <span className="font-medium text-foreground tnum">{formatarPreco(produto.preco)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Unidade</span>
            <span className="font-medium text-foreground">{produto.unidade}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Criado</span>
            <span className="text-foreground tnum">
              {new Date(produto.criado_em).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Atualizado</span>
            <span className="text-foreground tnum">
              {new Date(produto.ultima_atualizacao).toLocaleDateString('pt-BR')}
            </span>
          </div>
          {produto.tiny?.id && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Tiny ID</span>
              <span className="text-foreground tnum">{produto.tiny.id}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

CartaoProduto.displayName = 'CartaoProduto';

const ProdutoRow = React.memo(({
  produto,
  isExpanded,
  isSincronizando,
  onToggleExpand,
  onSincronizar
}: any) => {
  const jaSincronizado = produto.sincronizado && produto.tiny?.id;
  const status = seloDe(produto.prioridade);

  return (
    <>
      <tr
        className={cn(
          'cursor-pointer border-b border-border border-l-4 text-sm transition-colors hover:bg-surface-muted',
          status.borda
        )}
        onClick={() => onToggleExpand(produto.codigo)}
      >
        <td className="px-4 py-3 font-mono text-foreground tnum">
          {produto.codigo}
        </td>
        <td className="px-4 py-3 text-foreground">
          <div className="line-clamp-2 max-w-xs" title={produto.descricao}>
            {produto.descricao}
          </div>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-muted-foreground tnum">
          {produto.gtin || '-'}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col items-end gap-0.5 text-xs">
            <span className="flex items-center gap-1 text-foreground tnum">
              <Building2 className="w-3 h-3 text-accent-foreground" />
              {produto.estoque['Controle Geral'] || 0}
            </span>
            <span className="flex items-center gap-1 text-foreground tnum">
              <Warehouse className="w-3 h-3 text-atendendo-ink" />
              {produto.estoque['Deposito Loja'] || 0}
            </span>
            <span className="flex items-center gap-1 text-foreground tnum">
              <Home className="w-3 h-3 text-chama-ink" />
              {produto.estoque['Casa Velha'] || 0}
            </span>
            {(produto.totalReservado || 0) > 0 && (
              <span
                className="flex items-center gap-1 text-[10px] text-muted-foreground tnum"
                title="Reservado (pedido em aberto no Tiny) - não conta como disponível"
              >
                <Lock className="w-2.5 h-2.5" />
                {produto.totalReservado} reservado{produto.totalReservado === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right text-sm font-semibold text-foreground tnum">
          {produto.estoqueMinimoCalculado || 0}
        </td>
        <td className="px-4 py-3 text-right text-sm font-semibold">
          <span
            className={cn(
              'tnum',
              produto.necessidadeRepor > 0 ? 'text-destructive' : 'text-foreground'
            )}
          >
            {produto.necessidadeRepor || 0}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex flex-wrap items-center justify-center gap-1">
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', status.selo)}>
              {status.rotulo}
            </span>
            {jaSincronizado ? (
              <CheckCircle className="w-4 h-4 text-atendendo-ink" aria-label="Sincronizado" />
            ) : (
              <XCircle className="w-4 h-4 text-chama-ink" aria-label="Não sincronizado" />
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSincronizar(produto.codigo);
              }}
              disabled={isSincronizando === produto.codigo}
              className="h-9 w-9 p-0 text-accent-foreground"
              title="Sincronizar com o Tiny"
            >
              {isSincronizando === produto.codigo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshIcon className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(produto.codigo);
              }}
              className="h-9 w-9 p-0"
              title={isExpanded ? 'Recolher' : 'Expandir'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-border">
          <td colSpan={8} className="bg-surface-muted px-4 py-3">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Preço:</span>
                <span className="ml-2 font-medium text-foreground tnum">
                  {formatarPreco(produto.preco)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Unidade:</span>
                <span className="ml-2 font-medium text-foreground">
                  {produto.unidade}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Criado:</span>
                <span className="ml-2 text-foreground tnum">
                  {new Date(produto.criado_em).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Atualizado:</span>
                <span className="ml-2 text-foreground tnum">
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

ProdutoRow.displayName = 'ProdutoRow';

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

  // Os dois valores abaixo já vinham sem uso nesta tela: não há nada aqui
  // gated por admin e a busca filtra direto no onChange, sem o debounce.
  // Mantidos de propósito (mexer neles seria mexer em permissão/hook).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isAdmin = usuario?.tipo === 'admin';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      case 'alfabetica_asc': return <ArrowUp className="w-3.5 h-3.5" />;
      case 'alfabetica_desc': return <ArrowDown className="w-3.5 h-3.5" />;
      case 'preco_asc': return <ArrowUp className="w-3.5 h-3.5" />;
      case 'preco_desc': return <ArrowDown className="w-3.5 h-3.5" />;
      default: return <ArrowUpDown className="w-3.5 h-3.5" />;
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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-accent-foreground" />
          <p className="text-sm text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-custom bg-background text-foreground">
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-2 md:mb-6 md:flex-row md:items-center md:justify-between md:gap-4">
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-foreground">
              Reposição de Estoque
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              <span className="tnum">{stats.total}</span> produtos exibidos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className="flex items-center gap-1 rounded-full bg-atendendo px-2 py-1 text-[11px] md:text-xs text-atendendo-ink"
              title="A lista se atualiza sozinha quando o estoque muda no Tiny - não precisa dar F5"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-atendendo-ink" />
              {ultimaAtualizacaoLive
                ? `Ao vivo · ${ultimaAtualizacaoLive.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Ao vivo'}
            </span>

            <span className="rounded-full bg-surface-muted px-2 py-1 text-[11px] md:text-xs text-muted-foreground">
              {epocaSelecionada === 'dia_a_dia' ? 'Dia a Dia' : 'Volta às Aulas'}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => carregarProdutos(true)}
              disabled={isRefreshing}
              className={cn(BOTAO_TOQUE, 'gap-1 p-0')}
              title="Atualizar lista"
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Resumo: 2 colunas no celular, 4 no desktop */}
        <div className="mb-3 grid grid-cols-2 gap-2 md:mb-6 md:grid-cols-4 md:gap-3">
          <div className="rounded-lg border border-border bg-surface p-3 shadow-card md:rounded-xl">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl md:text-2xl font-bold text-foreground tnum">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3 shadow-card md:rounded-xl">
            <p className="text-xs font-medium text-aguardando-ink">Crítico</p>
            <p className="text-xl md:text-2xl font-bold text-destructive tnum">{stats.criticos}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3 shadow-card md:rounded-xl">
            <p className="text-xs font-medium text-chama-ink">Precisa repor</p>
            <p className="text-xl md:text-2xl font-bold text-chama-ink tnum">{stats.precisaRepor}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3 shadow-card md:rounded-xl">
            <p className="text-xs font-medium text-atendendo-ink">Ok</p>
            <p className="text-xl md:text-2xl font-bold text-atendendo-ink tnum">{stats.estoqueOk}</p>
          </div>
        </div>

        {/* Barra de busca e filtros - único lugar com vidro nesta tela,
            porque é a barra grudada no topo. Nada de backdrop-filter nas
            linhas/cartões: com centenas de itens o custo de recomposição
            a cada rolagem derruba o FPS. */}
        <div className="glass-thin sticky top-0 z-10 -mx-4 mb-3 border-b border-border px-4 py-2 md:mx-0 md:mb-6 md:rounded-xl md:border md:px-3 md:py-3">
          <div className="flex flex-col gap-2 md:flex-row md:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar produto, código ou GTIN..."
                className="pl-9 h-toque md:h-9 text-base md:text-sm"
                value={filtros.busca || ''}
                onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
              />
            </div>

            {/* Chips roláveis no celular, embrulhados no desktop */}
            <div className="-mx-4 flex gap-2 overflow-x-auto scrollbar-custom px-4 md:mx-0 md:flex-wrap md:px-0">
              <ChipFiltro
                ativo={classeFiltro !== 'todos'}
                onClick={() => {
                  const classes: ClasseFiltro[] = ['todos', 'critico', 'precisa_repor', 'estoque_ok'];
                  const currentIndex = classes.indexOf(classeFiltro);
                  setClasseFiltro(classes[(currentIndex + 1) % classes.length]);
                }}
                title="Filtrar por classe de reposição"
              >
                <Filter className="w-3.5 h-3.5" />
                {getClasseFiltroLabel()}
              </ChipFiltro>

              <ChipFiltro
                ativo={depositoFiltro !== 'todos'}
                onClick={() => {
                  const depositos: DepositoFiltro[] = ['todos', 'controle_geral', 'deposito_loja', 'casa_velha'];
                  const currentIndex = depositos.indexOf(depositoFiltro);
                  setDepositoFiltro(depositos[(currentIndex + 1) % depositos.length]);
                }}
                title="Filtrar por depósito"
              >
                {depositoFiltro === 'todos' ? <Package className="w-3.5 h-3.5" /> :
                 depositoFiltro === 'controle_geral' ? <Building2 className="w-3.5 h-3.5" /> :
                 depositoFiltro === 'deposito_loja' ? <Store className="w-3.5 h-3.5" /> :
                 <Home className="w-3.5 h-3.5" />}
                {getDepositoFiltroLabel()}
              </ChipFiltro>

              <ChipFiltro
                ativo={filtros.apenasRepor}
                onClick={() => setFiltros(prev => ({ ...prev, apenasRepor: !prev.apenasRepor }))}
              >
                Precisa
              </ChipFiltro>

              <ChipFiltro
                ativo={filtros.apenasNaoSincronizados}
                onClick={() => setFiltros(prev => ({ ...prev, apenasNaoSincronizados: !prev.apenasNaoSincronizados }))}
              >
                Não Sinc.
              </ChipFiltro>

              <ChipFiltro onClick={toggleOrdenacao} title="Trocar ordenação">
                {getOrdenacaoIcon()}
                {getOrdenacaoLabel()}
              </ChipFiltro>
            </div>
          </div>
        </div>

        {/* Celular: cartões. Desktop: tabela. */}
        <div className="space-y-2 md:hidden">
          {visibleProdutos.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface py-8 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado
            </div>
          ) : (
            visibleProdutos.map((produto) => (
              <CartaoProduto
                key={produto.codigo}
                produto={produto}
                isExpanded={expandedRows.has(produto.codigo)}
                isSincronizando={isSincronizando}
                onToggleExpand={toggleExpand}
                onSincronizar={handleSincronizar}
              />
            ))
          )}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
          <div className="overflow-x-auto scrollbar-custom">
            <table className="w-full">
              <thead className="sticky top-0 z-10 border-b border-border bg-surface">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Código</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Descrição</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">GTIN</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Estoques</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Mínimo</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Necessidade</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleProdutos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum produto encontrado
                    </td>
                  </tr>
                ) : (
                  visibleProdutos.map((produto) => (
                    <ProdutoRow
                      key={produto.codigo}
                      produto={produto}
                      isExpanded={expandedRows.has(produto.codigo)}
                      isSincronizando={isSincronizando}
                      onToggleExpand={toggleExpand}
                      onSincronizar={handleSincronizar}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sentinela do scroll infinito: uma só para celular e desktop */}
        {visibleCount < produtosFiltrados.length && (
          <div ref={loadMoreRef} className="py-3 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto w-4 h-4 animate-spin" />
            <span className="mt-1 block">Carregando mais...</span>
          </div>
        )}

        <div className="mt-2 text-center text-xs text-muted-foreground">
          <span className="tnum">{visibleProdutos.length}</span> de{' '}
          <span className="tnum">{produtosFiltrados.length}</span> produtos
        </div>
      </div>
    </div>
  );
}
