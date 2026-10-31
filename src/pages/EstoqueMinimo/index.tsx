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

const formatarPreco = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

type ValoresEdicao = {
  estoque_minimo: number;
  estoque_minimo_volta_as_aulas: number;
  estoque_minimo_geral: number;
};

// Cartão do celular: mesmos campos da tabela do desktop. Em cima, nome e
// código + selo dizendo se o produto já tem mínimo definido; depois os três
// números que decidem (disponível, mínimo atual, geral atual) e só então os
// campos de edição. Declarado no escopo do módulo de propósito - dentro da
// página remontaria a lista toda a cada tecla digitada.
const CartaoEstoqueMinimo = React.memo(({
  produto,
  valores,
  minimoAtual,
  vtaAtual,
  geralAtual,
  isAdmin,
  isUpdating,
  isInativando,
  onValorChange,
  onAtualizar,
  onInativar
}: any) => {
  const estoqueTotal = produto.estoqueTotal || 0;
  const semMinimo = minimoAtual === 0 && vtaAtual === 0 && geralAtual === 0;

  return (
    <div className="rounded-lg border border-border bg-surface p-3 shadow-card">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-foreground" title={produto.descricao}>
            {produto.descricao}
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground tnum">
            {produto.codigo}
            {produto.tiny?.gtin ? ` · ${produto.tiny.gtin}` : ''}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
            semMinimo ? 'bg-chama text-chama-ink' : 'bg-atendendo text-atendendo-ink'
          )}
        >
          {semMinimo ? 'Sem mínimo' : 'Definido'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-sm bg-surface-muted py-1.5">
          <p className="text-[11px] text-muted-foreground">Disponível</p>
          <p className="text-base font-semibold text-foreground tnum">{estoqueTotal}</p>
        </div>
        <div className="rounded-sm bg-surface-muted py-1.5">
          <p className="text-[11px] text-muted-foreground">Mínimo atual</p>
          <p className="text-base font-semibold text-foreground tnum">{minimoAtual}</p>
        </div>
        <div className="rounded-sm bg-surface-muted py-1.5">
          <p className="text-[11px] text-muted-foreground">Geral atual</p>
          <p className="text-base font-semibold text-foreground tnum">{geralAtual}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <label className="text-[11px] text-muted-foreground">
          Mínimo
          <Input
            type="number"
            min="0"
            step="1"
            value={valores.estoque_minimo}
            onChange={(e) => onValorChange(produto.codigo, 'estoque_minimo', e.target.value)}
            className="mt-1 h-toque w-full border-0 bg-surface-muted text-center text-base md:text-sm tnum"
            disabled={isUpdating === produto.codigo}
          />
        </label>
        <label className="text-[11px] text-muted-foreground">
          Volta às aulas
          <Input
            type="number"
            min="0"
            step="1"
            value={valores.estoque_minimo_volta_as_aulas}
            onChange={(e) => onValorChange(produto.codigo, 'estoque_minimo_volta_as_aulas', e.target.value)}
            className="mt-1 h-toque w-full border-0 bg-surface-muted text-center text-base md:text-sm tnum"
            disabled={isUpdating === produto.codigo}
          />
        </label>
        <label className="text-[11px] text-muted-foreground">
          Geral
          <Input
            type="number"
            min="0"
            step="1"
            value={valores.estoque_minimo_geral}
            onChange={(e) => onValorChange(produto.codigo, 'estoque_minimo_geral', e.target.value)}
            className="mt-1 h-toque w-full border-0 bg-surface-muted text-center text-base md:text-sm tnum"
            disabled={isUpdating === produto.codigo}
          />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground tnum">
          Preço {formatarPreco(produto.preco)}
        </span>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAtualizar(produto.codigo)}
              disabled={isUpdating === produto.codigo}
              className="h-toque gap-1 px-3 text-sm text-accent-foreground hover:bg-accent-soft"
            >
              {isUpdating === produto.codigo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onInativar(produto.codigo, produto.descricao)}
              disabled={isInativando === produto.codigo}
              className="h-toque w-toque p-0 text-destructive"
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

CartaoEstoqueMinimo.displayName = 'CartaoEstoqueMinimo';

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
  const [editando, setEditando] = useState<Map<string, ValoresEdicao>>(new Map());
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const isAdmin = usuario?.tipo === 'admin';
  // Já vinha sem uso: a busca filtra direto no onChange, sem o debounce.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
              Estoque Mínimo
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              <span className="tnum">{stats.total}</span> produtos ·{' '}
              <span className="tnum">{stats.semEstoqueMinimo}</span> sem estoque mínimo definido
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

        {/* Resumo */}
        <div className="mb-3 grid grid-cols-2 gap-2 md:mb-6 md:gap-3">
          <div className="rounded-lg border border-border bg-surface p-3 shadow-card md:rounded-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total de produtos</p>
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
                <p className="text-xs font-medium text-chama-ink">Sem estoque mínimo</p>
                <p className="text-xl md:text-2xl font-bold text-chama-ink tnum">
                  {stats.semEstoqueMinimo}
                </p>
              </div>
              <Filter className="w-6 h-6 shrink-0 text-chama-ink opacity-60" />
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
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto scrollbar-custom px-4 md:mx-0 md:flex-wrap md:px-0">
              <button
                type="button"
                onClick={() => setFiltros(prev => ({
                  ...prev,
                  apenasSemEstoqueMinimo: !prev.apenasSemEstoqueMinimo
                }))}
                className={cn(
                  'foco-anel shrink-0 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 h-toque md:h-9 text-sm font-medium transition-colors',
                  filtros.apenasSemEstoqueMinimo
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                Sem estoque mínimo
              </button>
              {categorias.length > 0 && (
                <div className="shrink-0">
                  <SearchableSelect
                    value={filtros.categoria || ''}
                    onChange={(cat) => setFiltros(prev => ({ ...prev, categoria: cat || undefined }))}
                    options={categorias}
                    allLabel="Todas categorias"
                    placeholder="Buscar categoria..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Celular: cartões */}
        <div className="space-y-2 md:hidden">
          {visibleProdutos.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface py-8 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado
            </div>
          ) : (
            visibleProdutos.map((produto) => {
              const minimoAtual = produto.tiny?.estoque_minimo || produto.estoqueMinimo || 0;
              const vtaAtual = produto.tiny?.estoque_minimo_volta_as_aulas || produto.estoqueMinimoVoltaAsAulas || 0;
              const geralAtual = produto.tiny?.estoque_minimo_geral || produto.estoqueMinimoGeral || 0;

              const valores = editando.get(produto.codigo) || {
                estoque_minimo: minimoAtual,
                estoque_minimo_volta_as_aulas: vtaAtual,
                estoque_minimo_geral: geralAtual
              };

              return (
                <CartaoEstoqueMinimo
                  key={produto.codigo}
                  produto={produto}
                  valores={valores}
                  minimoAtual={minimoAtual}
                  vtaAtual={vtaAtual}
                  geralAtual={geralAtual}
                  isAdmin={isAdmin}
                  isUpdating={isUpdating}
                  isInativando={isInativando}
                  onValorChange={handleValorChange}
                  onAtualizar={handleAtualizar}
                  onInativar={handleInativar}
                />
              );
            })
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
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Preço</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Estoque disponível</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Mínimo</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Volta às Aulas</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Geral</th>
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
                      <tr key={produto.codigo} className="transition-colors hover:bg-surface-muted">
                        <td className="px-4 py-3 text-sm font-mono text-foreground tnum">
                          {produto.codigo}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div className="line-clamp-2 max-w-xs" title={produto.descricao}>
                            {produto.descricao}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-muted-foreground tnum">
                          {produto.tiny?.gtin || '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-foreground tnum">
                          {formatarPreco(produto.preco)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-bold text-foreground tnum">
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
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-muted-foreground tnum">Atual: {minimoAtual}</span>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={valores.estoque_minimo}
                              onChange={(e) => handleValorChange(produto.codigo, 'estoque_minimo', e.target.value)}
                              className="h-9 w-20 border-0 bg-surface-muted text-center text-sm tnum"
                              disabled={isUpdating === produto.codigo}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-muted-foreground tnum">Atual: {vtaAtual}</span>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={valores.estoque_minimo_volta_as_aulas}
                              onChange={(e) => handleValorChange(produto.codigo, 'estoque_minimo_volta_as_aulas', e.target.value)}
                              className="h-9 w-20 border-0 bg-surface-muted text-center text-sm tnum"
                              disabled={isUpdating === produto.codigo}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-muted-foreground tnum">Atual: {geralAtual}</span>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={valores.estoque_minimo_geral}
                              onChange={(e) => handleValorChange(produto.codigo, 'estoque_minimo_geral', e.target.value)}
                              className="h-9 w-20 border-0 bg-surface-muted text-center text-sm tnum"
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
                                  className="h-9 w-full px-2 text-xs text-accent-foreground hover:bg-accent-soft"
                                >
                                  {isUpdating === produto.codigo ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Save className="mr-1 w-3 h-3" />
                                      Atualizar
                                    </>
                                  )}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleInativar(produto.codigo, produto.descricao)}
                                  disabled={isInativando === produto.codigo}
                                  className="h-9 w-full px-2 text-xs text-destructive"
                                >
                                  {isInativando === produto.codigo ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Trash2 className="mr-1 w-3 h-3" />
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
    </div>
  );
}
