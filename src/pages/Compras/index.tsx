import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { catalogoService } from '../../services/estoqueCatalogo.service';
import { ProdutoCompras, FiltrosCompras } from '../../types/compras.types';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ModalEstoqueMinimo } from './components/ModalEstoqueMinimo';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import {
  Search,
  RefreshCw,
  Loader2,
  Package,
  Building2,
  Warehouse,
  Home,
  RefreshCw as RefreshIcon,
  Edit3,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../../utils/cn';

const formatarPreco = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

// Selo de status reaproveitando os tokens de status do design system:
// zerado = aguardando (crítico), abaixo do mínimo = chama (atenção).
const statusDe = (estoqueTotal: number, minimoGeral: number) => {
  if (estoqueTotal === 0) {
    return {
      rotulo: 'Zerado',
      selo: 'bg-aguardando text-aguardando-ink',
      borda: 'border-l-aguardando',
      numero: 'text-destructive'
    };
  }
  if (estoqueTotal < minimoGeral) {
    return {
      rotulo: 'Abaixo do mínimo',
      selo: 'bg-chama text-chama-ink',
      borda: 'border-l-chama',
      numero: 'text-chama-ink'
    };
  }
  return {
    rotulo: 'Ok',
    selo: 'bg-atendendo text-atendendo-ink',
    borda: 'border-l-atendendo',
    numero: 'text-foreground'
  };
};

// Cartão do celular: mesmos campos da tabela do desktop. Nome, código e
// selo em cima; os três números que decidem a compra (disponível, mínimo
// geral, custo) numa linha; preço de venda e GTIN ficam só no desktop.
// Declarado no escopo do módulo de propósito - dentro da página remontaria
// a lista inteira a cada render.
const CartaoCompra = React.memo(({
  produto,
  isAdmin,
  isSincronizando,
  isInativando,
  onSincronizar,
  onDefinirMinimo,
  onInativar
}: any) => {
  const estoqueTotal = produto.estoqueTotal || 0;
  const estoqueMinimoGeral = produto.estoqueMinimoGeral || 0;
  const status = statusDe(estoqueTotal, estoqueMinimoGeral);

  return (
    <div
      className={cn(
        'rounded-lg border border-border border-l-4 bg-surface p-3 shadow-card',
        status.borda
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="line-clamp-2 text-sm font-semibold text-foreground"
            title={produto.descricao || 'Sem descrição'}
          >
            {produto.descricao || 'Sem descrição'}
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground tnum">
            {produto.codigo}
            {produto.tiny?.gtin ? ` · ${produto.tiny.gtin}` : ''}
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
          <p className="text-[11px] text-muted-foreground">Disponível</p>
          <p className={cn('text-base font-semibold tnum', status.numero)}>{estoqueTotal}</p>
        </div>
        <div className="rounded-sm bg-surface-muted py-1.5">
          <p className="text-[11px] text-muted-foreground">Mín. geral</p>
          <p className="text-base font-semibold text-foreground tnum">{estoqueMinimoGeral}</p>
        </div>
        <div className="rounded-sm bg-surface-muted py-1.5">
          <p className="text-[11px] text-muted-foreground">Custo</p>
          <p className="text-base font-semibold text-foreground tnum">
            {produto.tiny?.preco_custo ? formatarPreco(produto.tiny.preco_custo) : '-'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground tnum">
          Venda {formatarPreco(produto.preco)}
        </span>

        {isAdmin && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSincronizar(produto.codigo)}
              disabled={isSincronizando === produto.codigo}
              className="h-toque w-toque p-0 text-chama-ink md:h-9 md:w-9"
              title="Sincronizar com Tiny"
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
              onClick={() => onDefinirMinimo(produto)}
              className="h-toque w-toque p-0 text-accent-foreground hover:bg-accent-soft md:h-9 md:w-9"
              title="Definir estoque mínimo"
            >
              <Edit3 className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onInativar(produto.codigo, produto.descricao)}
              disabled={isInativando === produto.codigo}
              className="h-toque w-toque p-0 text-destructive md:h-9 md:w-9"
              title="Inativar cadastro"
            >
              {isInativando === produto.codigo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

CartaoCompra.displayName = 'CartaoCompra';

export default function Compras() {
  const { usuario } = useAuth();
  const { showToast } = useToast();

  // Catálogo completo (compartilhado com a página Estoque Mínimo)
  const [produtosCompleto, setProdutosCompleto] = useState<ProdutoCompras[]>([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState<ProdutoCompras[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSincronizando, setIsSincronizando] = useState<string | null>(null);
  const [isInativando, setIsInativando] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosCompras>({});
  const [visibleCount, setVisibleCount] = useState(50);
  const [ultimaAtualizacaoLive, setUltimaAtualizacaoLive] = useState<Date | null>(null);
  const [modalEstoqueMinimo, setModalEstoqueMinimo] = useState<{
    open: boolean;
    produto: ProdutoCompras | null;
  }>({ open: false, produto: null });
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const isAdmin = usuario?.tipo === 'admin';
  // Já vinha sem uso: a busca filtra direto no onChange, sem o debounce.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const debouncedBusca = useDebounce(filtros.busca || '', 300);

  // Carregar catálogo
  const carregarProdutos = useCallback(async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await catalogoService.buscarCatalogo(forceRefresh);
      setProdutosCompleto(data);
      setVisibleCount(50);
    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error);
      showToast('Erro ao carregar produtos', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  // Atualização em tempo real: webhook do Tiny + jobs automáticos, sem F5,
  // sem resetar filtro/scroll (só troca o que mudou)
  useEffect(() => {
    const cancelar = catalogoService.assinarAtualizacoes((produtosAtualizados) => {
      setProdutosCompleto(produtosAtualizados);
      setUltimaAtualizacaoLive(new Date());
    });
    return cancelar;
  }, []);

  // Só produtos que precisam de atenção: zerado ou abaixo do mínimo geral
  const produtosAtencao = useMemo(() => {
    return produtosCompleto.filter(p => {
      const estoqueTotal = p.estoqueTotal || 0;
      const minimoGeral = p.estoqueMinimoGeral || 0;
      return estoqueTotal === 0 || (estoqueTotal > 0 && estoqueTotal < minimoGeral);
    });
  }, [produtosCompleto]);

  // Aplicar filtros
  useEffect(() => {
    const filtrados = catalogoService.filtrarProdutos(produtosAtencao, filtros);
    setProdutosFiltrados(filtrados);
    setVisibleCount(50);
  }, [filtros, produtosAtencao]);

  // Carregar na montagem
  useEffect(() => {
    carregarProdutos();
  }, []);

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

  // Sincronizar produto
  const handleSincronizar = async (codigo: string) => {
    if (!isAdmin) {
      showToast('Apenas administradores podem sincronizar', 'warning');
      return;
    }

    setIsSincronizando(codigo);
    try {
      const result = await catalogoService.sincronizarProduto(codigo);

      if (result.success) {
        showToast(`Produto ${codigo} sincronizado com sucesso!`, 'success');
        await carregarProdutos(true);
      } else {
        showToast(`Erro ao sincronizar produto ${codigo}`, 'error');
      }
    } catch (error) {
      console.error(`❌ Erro ao sincronizar produto ${codigo}:`, error);
      showToast(`Erro ao sincronizar produto ${codigo}`, 'error');
    } finally {
      setIsSincronizando(null);
    }
  };

  // Definir estoque mínimo
  const handleDefinirEstoqueMinimo = async (
    minimo: number,
    voltaAsAulas: number,
    geral: number
  ) => {
    if (!modalEstoqueMinimo.produto) return;

    const codigo = modalEstoqueMinimo.produto.codigo;
    const success = await catalogoService.definirEstoqueMinimo(
      codigo,
      minimo,
      voltaAsAulas,
      geral
    );

    if (success) {
      showToast(`Estoque mínimo do produto ${codigo} atualizado!`, 'success');
      await carregarProdutos(true);
    } else {
      throw new Error('Erro ao definir estoque mínimo');
    }
  };

  // Inativar produto
  const handleInativar = async (codigo: string, descricao: string) => {
    if (!isAdmin) {
      showToast('Apenas administradores podem inativar produtos', 'warning');
      return;
    }

    const confirmacao = window.confirm(
      `Tem certeza que deseja inativar o produto "${descricao}" (${codigo})?`
    );

    if (!confirmacao) return;

    setIsInativando(codigo);
    try {
      const success = await catalogoService.inativarProduto(codigo);

      if (success) {
        showToast(`Produto ${codigo} inativado com sucesso!`, 'success');
        setProdutosCompleto(prev => prev.filter(p => p.codigo !== codigo));
      } else {
        showToast(`Erro ao inativar produto ${codigo}`, 'error');
      }
    } catch (error) {
      console.error(`❌ Erro ao inativar produto ${codigo}:`, error);
      showToast(`Erro ao inativar produto ${codigo}`, 'error');
    } finally {
      setIsInativando(null);
    }
  };

  const abrirModalEstoqueMinimo = (produto: ProdutoCompras) => {
    setModalEstoqueMinimo({ open: true, produto });
  };

  // Produtos visíveis
  const visibleProdutos = useMemo(() => {
    return produtosFiltrados.slice(0, visibleCount);
  }, [produtosFiltrados, visibleCount]);

  // Categorias disponíveis (para o filtro) - do catálogo completo, não só da atenção
  const categorias = useMemo(() => {
    const set = new Set<string>();
    produtosCompleto.forEach(p => { if (p.categoria) set.add(p.categoria); });
    return Array.from(set).sort();
  }, [produtosCompleto]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = produtosAtencao.length;
    const estoqueZerado = produtosAtencao.filter(p => (p.estoqueTotal || 0) === 0).length;
    const abaixoMinimo = total - estoqueZerado;

    return { total, estoqueZerado, abaixoMinimo };
  }, [produtosAtencao]);

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
        {/* Header */}
        <div className="mb-4 flex flex-col gap-2 md:mb-6 md:flex-row md:items-center md:justify-between md:gap-4">
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-foreground">
              Compras ADM
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              <span className="tnum">{stats.total}</span> produtos precisam de atenção
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => carregarProdutos(true)}
              disabled={isRefreshing}
              className="h-toque gap-2 px-3 md:h-9"
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        </div>

        {/* Resumo: 2 colunas no celular, 4 no desktop */}
        <div className="mb-3 grid grid-cols-2 gap-2 md:mb-6 md:grid-cols-4 md:gap-3">
          <div className="rounded-lg border border-border bg-surface p-3 shadow-card md:rounded-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl md:text-2xl font-bold text-foreground tnum">
                  {stats.total}
                </p>
              </div>
              <Package className="w-6 h-6 shrink-0 text-accent-foreground opacity-60" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-3 shadow-card md:rounded-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-aguardando-ink">Estoque zerado</p>
                <p className="text-xl md:text-2xl font-bold text-destructive tnum">
                  {stats.estoqueZerado}
                </p>
              </div>
              <AlertTriangle className="w-6 h-6 shrink-0 text-destructive opacity-60" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-3 shadow-card md:rounded-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-chama-ink">Abaixo do mínimo</p>
                <p className="text-xl md:text-2xl font-bold text-chama-ink tnum">
                  {stats.abaixoMinimo}
                </p>
              </div>
              <AlertTriangle className="w-6 h-6 shrink-0 text-chama-ink opacity-60" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-3 shadow-card md:rounded-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Ações pendentes</p>
                <p className="text-xl md:text-2xl font-bold text-foreground tnum">
                  {stats.estoqueZerado + stats.abaixoMinimo}
                </p>
              </div>
              <RefreshIcon className="w-6 h-6 shrink-0 text-accent-foreground opacity-60" />
            </div>
          </div>
        </div>

        {/* Busca e filtros: único lugar com vidro nesta tela (barra grudada
            no topo). Nada de backdrop-filter em linha de tabela ou cartão -
            com centenas de itens o recálculo a cada rolagem mata o FPS.
            z-20 porque o dropdown do SearchableSelect escapa deste card. */}
        <div className="glass-thin sticky top-0 z-20 -mx-4 mb-3 border-b border-border px-4 py-2 md:mx-0 md:mb-6 md:rounded-xl md:border md:px-3 md:py-3">
          <div className="flex flex-col gap-2 md:flex-row md:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, descrição ou GTIN..."
                className="pl-9 h-toque md:h-9 text-base md:text-sm"
                value={filtros.busca || ''}
                onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
              />
            </div>
            {categorias.length > 0 && (
              <div className="-mx-4 flex gap-2 overflow-x-auto scrollbar-custom px-4 md:mx-0 md:flex-wrap md:px-0">
                <div className="shrink-0">
                  <SearchableSelect
                    value={filtros.categoria || ''}
                    onChange={(cat) => setFiltros(prev => ({ ...prev, categoria: cat || undefined }))}
                    options={categorias}
                    allLabel="Todas categorias"
                    placeholder="Buscar categoria..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Celular: cartões */}
        <div className="space-y-2 md:hidden">
          {visibleProdutos.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface py-8 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado
            </div>
          ) : (
            visibleProdutos.map((produto) => (
              <CartaoCompra
                key={produto.codigo}
                produto={produto}
                isAdmin={isAdmin}
                isSincronizando={isSincronizando}
                isInativando={isInativando}
                onSincronizar={handleSincronizar}
                onDefinirMinimo={abrirModalEstoqueMinimo}
                onInativar={handleInativar}
              />
            ))
          )}
        </div>

        {/* Desktop: tabela */}
        <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
          <div className="overflow-x-auto scrollbar-custom">
            <table className="w-full">
              <thead className="sticky top-0 z-10 border-b border-border bg-surface">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Código</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Descrição</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">GTIN</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Preço venda</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Preço custo</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Estoque disponível</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Mínimo geral</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleProdutos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum produto encontrado
                    </td>
                  </tr>
                ) : (
                  visibleProdutos.map((produto) => {
                    const estoqueTotal = produto.estoqueTotal || 0;
                    const estoqueMinimoGeral = produto.estoqueMinimoGeral || 0;
                    const status = statusDe(estoqueTotal, estoqueMinimoGeral);

                    return (
                      <tr
                        key={produto.codigo}
                        className={cn(
                          'border-l-4 transition-colors hover:bg-surface-muted',
                          status.borda
                        )}
                      >
                        <td className="px-4 py-3 text-sm font-mono text-foreground tnum">
                          {produto.codigo}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div className="line-clamp-2 max-w-xs" title={produto.descricao || 'Sem descrição'}>
                            {produto.descricao || 'Sem descrição'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-muted-foreground tnum">
                          {produto.tiny?.gtin || '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-foreground tnum">
                          {formatarPreco(produto.preco)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-foreground tnum">
                          {produto.tiny?.preco_custo ? formatarPreco(produto.tiny.preco_custo) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className={cn('font-bold tnum', status.numero)}>
                              {estoqueTotal}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground tnum">
                              <Building2 className="w-3 h-3 text-accent-foreground" />
                              {produto.estoque['Controle Geral'] || 0}
                              <Warehouse className="ml-1 w-3 h-3 text-atendendo-ink" />
                              {produto.estoque['Deposito Loja'] || 0}
                              <Home className="ml-1 w-3 h-3 text-chama-ink" />
                              {produto.estoque['Casa Velha'] || 0}
                            </div>
                            {(produto.totalReservado || 0) > 0 && (
                              <span
                                className="text-[10px] text-muted-foreground tnum"
                                title="Reservado - não conta como disponível"
                              >
                                {produto.totalReservado} reservado{produto.totalReservado === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-foreground tnum">
                          {produto.estoqueMinimoGeral !== undefined && produto.estoqueMinimoGeral !== null
                            ? produto.estoqueMinimoGeral
                            : 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              'whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              status.selo
                            )}
                          >
                            {status.rotulo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSincronizar(produto.codigo)}
                                  disabled={isSincronizando === produto.codigo}
                                  className="h-9 w-9 p-0 text-chama-ink"
                                  title="Sincronizar com Tiny"
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
                                  onClick={() => abrirModalEstoqueMinimo(produto)}
                                  className="h-9 w-9 p-0 text-accent-foreground hover:bg-accent-soft"
                                  title="Definir Estoque Mínimo"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleInativar(produto.codigo, produto.descricao)}
                                  disabled={isInativando === produto.codigo}
                                  className="h-9 w-9 p-0 text-destructive"
                                  title="Inativar Cadastro"
                                >
                                  {isInativando === produto.codigo ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sentinela do scroll infinito: uma só para celular e desktop */}
        {visibleCount < produtosFiltrados.length && (
          <div ref={loadMoreRef} className="py-4 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto w-4 h-4 animate-spin" />
            <span className="mt-1 block">Carregando mais produtos...</span>
          </div>
        )}

        {/* Contador */}
        <div className="mt-2 text-center text-xs text-muted-foreground">
          Mostrando <span className="tnum">{Math.min(visibleCount, produtosFiltrados.length)}</span> de{' '}
          <span className="tnum">{produtosFiltrados.length}</span> produtos
        </div>
      </div>

      {/* Modal Estoque Mínimo */}
      <ModalEstoqueMinimo
        open={modalEstoqueMinimo.open}
        onClose={() => setModalEstoqueMinimo({ open: false, produto: null })}
        onSave={handleDefinirEstoqueMinimo}
        produto={modalEstoqueMinimo.produto ? {
          codigo: modalEstoqueMinimo.produto.codigo,
          descricao: modalEstoqueMinimo.produto.descricao,
          estoqueMinimo: modalEstoqueMinimo.produto.tiny?.estoque_minimo || 0,
          estoqueMinimoVoltaAsAulas: modalEstoqueMinimo.produto.tiny?.estoque_minimo_volta_as_aulas || 0,
          estoqueMinimoGeral: modalEstoqueMinimo.produto.estoqueMinimoGeral || 0
        } : null}
      />
    </div>
  );
}
