import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { catalogoService } from '../../services/estoqueCatalogo.service';
import { ProdutoEstoqueMinimo, FiltrosEstoqueMinimo } from '../../types/estoqueMinimo.types';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import {
  Search,
  RefreshCw,
  Loader2,
  Package,
  Building2,
  Warehouse,
  Home,
  Save,
  Trash2,
  Filter
} from 'lucide-react';
import { cn } from '../../utils/cn';

export default function EstoqueMinimo() {
  const { usuario } = useAuth();
  const { showToast } = useToast();

  const [produtos, setProdutos] = useState<ProdutoEstoqueMinimo[]>([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState<ProdutoEstoqueMinimo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isInativando, setIsInativando] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosEstoqueMinimo>({});
  const [visibleCount, setVisibleCount] = useState(50);
  const [ultimaAtualizacaoLive, setUltimaAtualizacaoLive] = useState<Date | null>(null);
  const [editando, setEditando] = useState<Map<string, {
    estoque_minimo: number;
    estoque_minimo_volta_as_aulas: number;
    estoque_minimo_geral: number;
  }>>(new Map());
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const isAdmin = usuario?.tipo === 'admin';
  const debouncedBusca = useDebounce(filtros.busca || '', 300);

  const sincronizarEdicao = useCallback((data: ProdutoEstoqueMinimo[]) => {
    setEditando(prev => {
      const newEditando = new Map(prev);
      data.forEach(p => {
        // não sobrescreve o que o usuário já está editando na tela
        if (newEditando.has(p.codigo)) return;
        newEditando.set(p.codigo, {
          estoque_minimo: p.tiny?.estoque_minimo || p.estoqueMinimo || 0,
          estoque_minimo_volta_as_aulas: p.tiny?.estoque_minimo_volta_as_aulas || p.estoqueMinimoVoltaAsAulas || 0,
          estoque_minimo_geral: p.tiny?.estoque_minimo_geral || p.estoqueMinimoGeral || 0
        });
      });
      return newEditando;
    });
  }, []);

  // Carregar produtos
  const carregarProdutos = useCallback(async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await catalogoService.buscarCatalogo(forceRefresh);

      // Inicializar estado de edição com os valores atuais (só quem ainda não existe)
      const newEditando = new Map();
      data.forEach(p => {
        newEditando.set(p.codigo, {
          estoque_minimo: p.tiny?.estoque_minimo || p.estoqueMinimo || 0,
          estoque_minimo_volta_as_aulas: p.tiny?.estoque_minimo_volta_as_aulas || p.estoqueMinimoVoltaAsAulas || 0,
          estoque_minimo_geral: p.tiny?.estoque_minimo_geral || p.estoqueMinimoGeral || 0
        });
      });
      setEditando(newEditando);

      setProdutos(data);
      setVisibleCount(50);
    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error);
      showToast('Erro ao carregar produtos', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  // Atualização em tempo real: webhook do Tiny + jobs automáticos, sem F5.
  // Não mexe no que o usuário já está editando numa linha (sincronizarEdicao
  // só preenche códigos novos no mapa de edição).
  useEffect(() => {
    const cancelar = catalogoService.assinarAtualizacoes((produtosAtualizados) => {
      setProdutos(produtosAtualizados);
      sincronizarEdicao(produtosAtualizados);
      setUltimaAtualizacaoLive(new Date());
    });
    return cancelar;
  }, [sincronizarEdicao]);

  // Aplicar filtros
  useEffect(() => {
    const filtrados = catalogoService.filtrarProdutos(produtos, filtros);
    setProdutosFiltrados(filtrados);
    setVisibleCount(50);
  }, [filtros, produtos]);

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

  // Atualizar estoque mínimo
  const handleAtualizar = async (codigo: string) => {
    if (!isAdmin) {
      showToast('Apenas administradores podem atualizar', 'warning');
      return;
    }

    const valores = editando.get(codigo);
    if (!valores) return;

    if (valores.estoque_minimo < 0 || valores.estoque_minimo_volta_as_aulas < 0 || valores.estoque_minimo_geral < 0) {
      showToast('Os valores devem ser maiores ou iguais a zero', 'warning');
      return;
    }

    setIsUpdating(codigo);
    try {
      const success = await catalogoService.definirEstoqueMinimo(
        codigo,
        valores.estoque_minimo,
        valores.estoque_minimo_volta_as_aulas,
        valores.estoque_minimo_geral
      );

      if (success) {
        showToast(`Estoque mínimo do produto ${codigo} atualizado!`, 'success');

        // Atualizar apenas o produto específico
        setProdutos(prev => prev.map(p => {
          if (p.codigo === codigo) {
            return {
              ...p,
              tiny: {
                ...p.tiny,
                estoque_minimo: valores.estoque_minimo,
                estoque_minimo_volta_as_aulas: valores.estoque_minimo_volta_as_aulas,
                estoque_minimo_geral: valores.estoque_minimo_geral
              },
              estoqueMinimo: valores.estoque_minimo,
              estoqueMinimoVoltaAsAulas: valores.estoque_minimo_volta_as_aulas,
              estoqueMinimoGeral: valores.estoque_minimo_geral
            };
          }
          return p;
        }));
      } else {
        showToast(`Erro ao atualizar estoque mínimo do produto ${codigo}`, 'error');
      }
    } catch (error) {
      console.error(`❌ Erro ao atualizar produto ${codigo}:`, error);
      showToast(`Erro ao atualizar estoque mínimo do produto ${codigo}`, 'error');
    } finally {
      setIsUpdating(null);
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
        setProdutos(prev => prev.filter(p => p.codigo !== codigo));
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

  // Atualizar valor no estado de edição
  const handleValorChange = (codigo: string, campo: string, valor: string) => {
    const numValor = Number(valor);
    if (isNaN(numValor) || numValor < 0) return;

    setEditando(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(codigo);
      if (current) {
        newMap.set(codigo, {
          ...current,
          [campo]: numValor
        });
      }
      return newMap;
    });
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

  // Categorias disponíveis (para o filtro)
  const categorias = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach(p => { if (p.categoria) set.add(p.categoria); });
    return Array.from(set).sort();
  }, [produtos]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = produtos.length;
    const semEstoqueMinimo = produtos.filter(p => {
      const minimo = p.tiny?.estoque_minimo || p.estoqueMinimo || 0;
      const vta = p.tiny?.estoque_minimo_volta_as_aulas || p.estoqueMinimoVoltaAsAulas || 0;
      const geral = p.tiny?.estoque_minimo_geral || p.estoqueMinimoGeral || 0;
      return minimo === 0 && vta === 0 && geral === 0;
    }).length;

    return { total, semEstoqueMinimo };
  }, [produtos]);

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
              Estoque Mínimo
            </h1>
            <p className="text-sm text-[#86868b]">
              {stats.total} produtos • {stats.semEstoqueMinimo} sem estoque mínimo definido
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-xs text-[#16a34a] bg-[#16a34a]/10 px-3 py-1.5 rounded-full flex items-center gap-1"
              title="A lista se atualiza sozinha quando o estoque muda no Tiny - não precisa dar F5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
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
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-xl p-3 border border-[#e5e5ea] dark:border-[#38383a]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#86868b]">Total de Produtos</p>
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
                <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">🟡 Sem Estoque Mínimo</p>
                <p className="text-xl font-bold text-[#ca8a04]">
                  {stats.semEstoqueMinimo}
                </p>
              </div>
              <Filter className="w-6 h-6 text-[#ca8a04] opacity-50" />
            </div>
          </div>
        </div>

        {/* Filtros */}
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
            <div className="flex flex-wrap gap-1.5 items-center">
              <button
                onClick={() => setFiltros(prev => ({
                  ...prev,
                  apenasSemEstoqueMinimo: !prev.apenasSemEstoqueMinimo
                }))}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1",
                  filtros.apenasSemEstoqueMinimo
                    ? "bg-[#ff9500] text-white"
                    : "bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b] hover:text-[#1c1c1e]"
                )}
              >
                <Filter className="w-3 h-3" />
                Sem estoque mínimo
              </button>
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
        </div>

        {/* Lista de Produtos */}
        <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-xl border border-[#e5e5ea] dark:border-[#38383a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f5f5f7] dark:bg-[#2c2c2e] border-b border-[#e5e5ea] dark:border-[#38383a] sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#86868b]">Código</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#86868b]">Descrição</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#86868b]">GTIN</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-[#86868b]">Preço</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-[#86868b]">Estoque Disponível</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-[#86868b]">Mínimo</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-[#86868b]">Volta às Aulas</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-[#86868b]">Geral</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-[#86868b]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5ea] dark:divide-[#38383a]">
                {visibleProdutos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-[#86868b]">
                      Nenhum produto encontrado
                    </td>
                  </tr>
                ) : (
                  visibleProdutos.map((produto) => {
                    const estoqueTotal = produto.estoqueTotal || 0;

                    // Buscar valores atuais
                    const minimoAtual = produto.tiny?.estoque_minimo || produto.estoqueMinimo || 0;
                    const vtaAtual = produto.tiny?.estoque_minimo_volta_as_aulas || produto.estoqueMinimoVoltaAsAulas || 0;
                    const geralAtual = produto.tiny?.estoque_minimo_geral || produto.estoqueMinimoGeral || 0;

                    const valores = editando.get(produto.codigo) || {
                      estoque_minimo: minimoAtual,
                      estoque_minimo_volta_as_aulas: vtaAtual,
                      estoque_minimo_geral: geralAtual
                    };

                    return (
                      <tr key={produto.codigo} className="hover:bg-[#f5f5f7]/50 dark:hover:bg-[#2c2c2e]/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-[#1c1c1e] dark:text-[#f5f5f7]">
                          {produto.codigo}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#1c1c1e] dark:text-[#f5f5f7]">
                          <div className="line-clamp-2 max-w-xs" title={produto.descricao}>
                            {produto.descricao}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#86868b] font-mono">
                          {produto.tiny?.gtin || '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                          {formatPrice(produto.preco)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">
                              {estoqueTotal}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-[#86868b]">
                              <Building2 className="w-3 h-3 text-[#007aff]" />
                              {produto.estoque['Controle Geral'] || 0}
                              <Warehouse className="w-3 h-3 text-[#34c759] ml-1" />
                              {produto.estoque['Deposito Loja'] || 0}
                              <Home className="w-3 h-3 text-[#ff9500] ml-1" />
                              {produto.estoque['Casa Velha'] || 0}
                            </div>
                            {(produto.totalReservado || 0) > 0 && (
                              <span className="text-[10px] text-[#86868b]" title="Reservado - não conta como disponível">
                                {produto.totalReservado} reservado{produto.totalReservado === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-[#86868b]">Atual: {minimoAtual}</span>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={valores.estoque_minimo}
                              onChange={(e) => handleValorChange(produto.codigo, 'estoque_minimo', e.target.value)}
                              className="w-20 h-8 text-center text-sm bg-[#f5f5f7] dark:bg-[#2c2c2e] border-0"
                              disabled={isUpdating === produto.codigo}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-[#86868b]">Atual: {vtaAtual}</span>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={valores.estoque_minimo_volta_as_aulas}
                              onChange={(e) => handleValorChange(produto.codigo, 'estoque_minimo_volta_as_aulas', e.target.value)}
                              className="w-20 h-8 text-center text-sm bg-[#f5f5f7] dark:bg-[#2c2c2e] border-0"
                              disabled={isUpdating === produto.codigo}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-[#86868b]">Atual: {geralAtual}</span>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={valores.estoque_minimo_geral}
                              onChange={(e) => handleValorChange(produto.codigo, 'estoque_minimo_geral', e.target.value)}
                              className="w-20 h-8 text-center text-sm bg-[#f5f5f7] dark:bg-[#2c2c2e] border-0"
                              disabled={isUpdating === produto.codigo}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAtualizar(produto.codigo)}
                                  disabled={isUpdating === produto.codigo}
                                  className="h-7 px-2 text-[11px] text-[#007aff] hover:bg-[#007aff]/10 w-full"
                                >
                                  {isUpdating === produto.codigo ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Save className="w-3 h-3 mr-1" />
                                      Atualizar
                                    </>
                                  )}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleInativar(produto.codigo, produto.descricao)}
                                  disabled={isInativando === produto.codigo}
                                  className="h-7 px-2 text-[11px] text-[#ff3b30] hover:bg-[#ff3b30]/10 w-full"
                                >
                                  {isInativando === produto.codigo ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Inativar
                                    </>
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
    </div>
  );
}
