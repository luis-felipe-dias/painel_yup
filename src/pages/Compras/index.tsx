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
import { FotoProduto } from "../../components/FotoProduto";

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
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
      <div className="h-full flex items-center justify-center bg-surface-muted">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-surface-muted p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Compras ADM
            </h1>
            <p className="text-sm text-muted-foreground">
              {stats.total} produtos precisam de atenção
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-xs text-folha-ink bg-folha/15 px-3 py-1.5 rounded-full flex items-center gap-1"
              title="A lista se atualiza sozinha quando o estoque muda no Tiny - não precisa dar F5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-folha animate-pulse" />
              {ultimaAtualizacaoLive
                ? `Ao vivo · ${ultimaAtualizacaoLive.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Ao vivo'}
            </span>
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
          <div className="bg-card/80 backdrop-blur-xl rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-foreground">
                  {stats.total}
                </p>
              </div>
              <Package className="w-6 h-6 text-primary opacity-50" />
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-xl rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400">🔴 Estoque Zerado</p>
                <p className="text-xl font-bold text-chama-ink">
                  {stats.estoqueZerado}
                </p>
              </div>
              <AlertTriangle className="w-6 h-6 text-chama-ink opacity-50" />
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-xl rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">🟡 Abaixo do Mínimo</p>
                <p className="text-xl font-bold text-chama-ink">
                  {stats.abaixoMinimo}
                </p>
              </div>
              <AlertTriangle className="w-6 h-6 text-chama-ink opacity-50" />
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-xl rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ações Pendentes</p>
                <p className="text-xl font-bold text-foreground">
                  {stats.estoqueZerado + stats.abaixoMinimo}
                </p>
              </div>
              <RefreshIcon className="w-6 h-6 text-primary opacity-50" />
            </div>
          </div>
        </div>

        {/* Filtros - relative z-20: o backdrop-blur-xl cria um stacking
            context próprio, então sem isso o dropdown do SearchableSelect
            (que escapa desse card) ficava preso atrás do card seguinte
            (Lista de Produtos), mesmo tendo z-index maior */}
        <div className="relative z-20 bg-card/80 backdrop-blur-xl rounded-xl p-3 border border-border mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, descrição ou GTIN..."
                className="pl-9 h-9 text-sm"
                value={filtros.busca || ''}
                onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
              />
            </div>
            {categorias.length > 0 && (
              <SearchableSelect
                value={filtros.categoria || ''}
                onChange={(cat) => setFiltros(prev => ({ ...prev, categoria: cat || undefined }))}
                options={categorias}
                allLabel="Todas categorias"
                placeholder="Buscar categoria..."
              />
            )}
          </div>
        </div>

        {/* Lista de Produtos */}
        <div className="bg-card/80 backdrop-blur-xl rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-muted border-b border-border sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Código</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Descrição</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">GTIN</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Preço Venda</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Preço Custo</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Estoque Disponível</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Mínimo Geral</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleProdutos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum produto encontrado
                    </td>
                  </tr>
                ) : (
                  visibleProdutos.map((produto) => {
                    const estoqueTotal = produto.estoqueTotal || 0;
                    const estoqueMinimoGeral = produto.estoqueMinimoGeral || 0;
                    const isCritico = estoqueTotal === 0;
                    const isAbaixoMinimo = estoqueTotal > 0 && estoqueTotal < estoqueMinimoGeral;

                    return (
                      <tr
                        key={produto.codigo}
                        className={cn(
                          "hover:bg-surface-muted/60 dark:hover:bg-surface-muted/60 transition-colors",
                          isCritico && "bg-red-50/50 dark:bg-red-950/20",
                          isAbaixoMinimo && "bg-yellow-50/50 dark:bg-yellow-950/20"
                        )}
                      >
                        <td className="px-4 py-3 text-sm font-mono text-foreground">
                          {produto.codigo}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div className="flex items-center gap-2">
                            <FotoProduto url={produto.foto} descricao={produto.descricao} />
                            <div className="line-clamp-2 max-w-xs" title={produto.descricao || 'Sem descrição'}>
                              {produto.descricao || 'Sem descrição'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                          {produto.tiny?.gtin || '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-foreground">
                          {formatPrice(produto.preco)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-foreground">
                          {produto.tiny?.preco_custo ? formatPrice(produto.tiny.preco_custo) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={cn(
                              "font-bold",
                              isCritico ? "text-red-600 dark:text-red-400" :
                              isAbaixoMinimo ? "text-yellow-600 dark:text-yellow-400" :
                              "text-foreground"
                            )}>
                              {estoqueTotal}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="w-3 h-3 text-primary" />
                              {produto.estoque['Controle Geral'] || 0}
                              <Warehouse className="w-3 h-3 text-folha-ink ml-1" />
                              {produto.estoque['Deposito Loja'] || 0}
                              <Home className="w-3 h-3 text-brincadeira-ink ml-1" />
                              {produto.estoque['Casa Velha'] || 0}
                            </div>
                            {(produto.totalReservado || 0) > 0 && (
                              <span className="text-[10px] text-muted-foreground" title="Reservado - não conta como disponível">
                                {produto.totalReservado} reservado{produto.totalReservado === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                          {produto.estoqueMinimoGeral !== undefined && produto.estoqueMinimoGeral !== null
                            ? produto.estoqueMinimoGeral
                            : 0}
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
                                  className="h-7 px-2 text-[11px] text-brincadeira-ink hover:bg-brincadeira/15"
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
                                  onClick={() => setModalEstoqueMinimo({
                                    open: true,
                                    produto: produto
                                  })}
                                  className="h-7 px-2 text-[11px] text-primary hover:bg-primary/10"
                                  title="Definir Estoque Mínimo"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleInativar(produto.codigo, produto.descricao)}
                                  disabled={isInativando === produto.codigo}
                                  className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10"
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

          {/* Load more trigger */}
          {visibleCount < produtosFiltrados.length && (
            <div ref={loadMoreRef} className="py-4 text-center text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 mx-auto animate-spin" />
              <span className="block mt-1">Carregando mais produtos...</span>
            </div>
          )}

          {/* Contador */}
          <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground text-center">
            Mostrando {Math.min(visibleCount, produtosFiltrados.length)} de {produtosFiltrados.length} produtos
          </div>
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
