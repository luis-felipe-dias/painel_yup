import { useMemo, useState, type ReactNode } from "react";
import { Search, RefreshCw, Users, Loader2, MessageSquarePlus, Filter, WifiOff } from "lucide-react";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { SessaoCard } from "./SessaoCard";
import { Sessao } from "../../../types/sessoes.types";
import { useDebounce } from "../../../hooks/useDebounce";
import { sessoesService } from "../../../services/sessoes.service";
import { useQuery } from "@tanstack/react-query";
import { cn } from "../../../utils/cn";

type FiltroAtribuicao = "todos" | "sem-atendente" | "meus";
type FiltroStatus = "todas" | "aguardando" | "atendendo" | "finalizadas";

interface SessaoListProps {
  sessoes: Sessao[];
  sessaoSelecionada: Sessao | null;
  onSelectSessao: (sessao: Sessao) => void;
  onRefetch: () => void;
  isLoading?: boolean;
  sessaoAtendenteMap?: Map<string, string>;
  onNovaConversa?: () => void;
  /** Nome do atendente logado — usado para o filtro "Meus chats". */
  atendenteAtualNome?: string;
  /** Erro de carregamento — a lista vazia por falha não pode parecer calma. */
  erro?: boolean;
  /** Setores que este usuário pode ver. A busca TAMBÉM precisa respeitar. */
  setoresPermitidos?: string[];
}

/** Chip de filtro com contador, no padrão de inbox de atendimento. */
function Chip({
  ativo,
  onClick,
  children,
  contador,
  tom = "neutro",
}: {
  ativo: boolean;
  onClick: () => void;
  children: ReactNode;
  contador?: number;
  tom?: "neutro" | "aguardando" | "atendendo";
}) {
  const tomAtivo = {
    neutro: "bg-primary text-primary-foreground",
    aguardando: "bg-aguardando text-white",
    atendendo: "bg-atendendo-ink text-white",
  }[tom];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors",
        ativo ? tomAtivo : "bg-surface-muted text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      {typeof contador === "number" && contador > 0 && (
        <span
          className={cn(
            "tnum text-[10px] font-bold px-1.5 rounded-full",
            ativo ? "bg-white/25" : "bg-background"
          )}
        >
          {contador}
        </span>
      )}
    </button>
  );
}

export function SessaoList({
  sessoes = [],
  sessaoSelecionada,
  onSelectSessao,
  onRefetch,
  isLoading = false,
  sessaoAtendenteMap = new Map(),
  onNovaConversa,
  atendenteAtualNome,
  erro = false,
  setoresPermitidos,
}: SessaoListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [atribuicao, setAtribuicao] = useState<FiltroAtribuicao>("todos");
  const [status, setStatus] = useState<FiltroStatus>("todas");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // FURO CORRIGIDO: a busca não recebia os setores permitidos. Resultado:
  // bastava digitar qualquer coisa na caixa para o atendente de
  // "atendimento" receber sessões de ouvidoria, financeiro e RH — inclusive
  // currículos e reclamações. Sem truque nenhum, só digitando.
  const { data: searchResults = [] } = useQuery({
    queryKey: ["sessoes", "search", debouncedSearch, setoresPermitidos],
    queryFn: () => sessoesService.buscar(debouncedSearch, setoresPermitidos),
    enabled: debouncedSearch.length > 0,
  });

  const base = debouncedSearch ? searchResults : sessoes;

  const contagens = useMemo(() => {
    const semAtendente = base.filter((s) => !sessaoAtendenteMap.get(s.id)).length;
    const meus = atendenteAtualNome
      ? base.filter((s) => sessaoAtendenteMap.get(s.id) === atendenteAtualNome).length
      : 0;
    const aguardando = base.filter((s) => s.aguardandoAtendente).length;
    const atendendo = base.filter((s) => !s.aguardandoAtendente && s.estado === "aberta").length;
    const finalizadas = base.filter((s) => s.estado === "fechada").length;
    return { semAtendente, meus, aguardando, atendendo, finalizadas };
  }, [base, sessaoAtendenteMap, atendenteAtualNome]);

  const displayedSessoes = useMemo(() => {
    return base.filter((s) => {
      const dono = sessaoAtendenteMap.get(s.id);

      if (atribuicao === "sem-atendente" && dono) return false;
      if (atribuicao === "meus" && dono !== atendenteAtualNome) return false;

      if (status === "aguardando" && !s.aguardandoAtendente) return false;
      if (status === "atendendo" && (s.aguardandoAtendente || s.estado !== "aberta")) return false;
      if (status === "finalizadas" && s.estado !== "fechada") return false;

      return true;
    });
  }, [base, atribuicao, status, sessaoAtendenteMap, atendenteAtualNome]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefetch();
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const temFiltro = atribuicao !== "todos" || status !== "todas";

  return (
    <div className="flex h-full flex-col bg-surface/60">
      {/* Cabeçalho em vidro fino e GRUDADO no topo: a busca e os filtros
          continuam à mão mesmo com 60 conversas roladas. Vidro aqui é
          barato porque é uma superfície só; nos cards da lista seria caro
          (um recálculo de desfoque por card, por quadro). */}
      <div className="glass-thin sticky top-0 z-10 shrink-0 rounded-none border-x-0 border-t-0 px-3 pb-2 pt-3">
        {/* Busca + ações */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              className="pl-9 bg-surface-muted border-0 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Atualizar agora"
            className="shrink-0 hover:bg-surface-muted rounded-full"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
            ) : (
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
          {onNovaConversa && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onNovaConversa}
              title="Iniciar nova conversa"
              className="shrink-0 hover:bg-accent-soft rounded-full"
            >
              <MessageSquarePlus className="w-4 h-4 text-accent" />
            </Button>
          )}
        </div>

        {/* Filtro por responsável — equivale à coluna "Atribuído" das
            plataformas de atendimento: é o que permite a atendente ver só
            o que é dela e o gestor ver o que está sem dono. */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto scrollbar-custom pb-0.5">
          <Chip ativo={atribuicao === "todos"} onClick={() => setAtribuicao("todos")}>
            Todos
          </Chip>
          <Chip
            ativo={atribuicao === "sem-atendente"}
            onClick={() => setAtribuicao("sem-atendente")}
            contador={contagens.semAtendente}
          >
            Sem atendente
          </Chip>
          {atendenteAtualNome && (
            <Chip
              ativo={atribuicao === "meus"}
              onClick={() => setAtribuicao("meus")}
              contador={contagens.meus}
            >
              Meus chats
            </Chip>
          )}
        </div>

        {/* Filtro por estado da conversa */}
        <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto scrollbar-custom pb-0.5">
          <Chip ativo={status === "todas"} onClick={() => setStatus("todas")}>
            Todas
          </Chip>
          <Chip
            ativo={status === "aguardando"}
            onClick={() => setStatus("aguardando")}
            contador={contagens.aguardando}
            tom="aguardando"
          >
            Aguardando
          </Chip>
          <Chip
            ativo={status === "atendendo"}
            onClick={() => setStatus("atendendo")}
            contador={contagens.atendendo}
            tom="atendendo"
          >
            Em atendimento
          </Chip>
          <Chip
            ativo={status === "finalizadas"}
            onClick={() => setStatus("finalizadas")}
            contador={contagens.finalizadas}
          >
            Finalizadas
          </Chip>
        </div>

        {/* Resumo */}
        <div className="mt-2 flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground tnum">
            {displayedSessoes.length}
            {temFiltro && <span className="opacity-60"> de {base.length}</span>}{" "}
            {displayedSessoes.length === 1 ? "conversa" : "conversas"}
          </span>
          <span className="flex items-center gap-2">
            {temFiltro && (
              <button
                type="button"
                onClick={() => {
                  setAtribuicao("todos");
                  setStatus("todas");
                }}
                className="flex items-center gap-1 text-accent-foreground hover:underline"
              >
                <Filter className="w-3 h-3" />
                Limpar filtros
              </button>
            )}
            {isLoading && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Atualizando
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-custom">
        {erro && displayedSessoes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <WifiOff className="w-10 h-10 mb-3 text-chama opacity-70" />
            <p className="font-medium text-foreground">Não foi possível carregar</p>
            <p className="text-sm text-muted-foreground mt-1">
              O servidor de conversas não respondeu. Isso é falha de conexão,
              não ausência de cliente esperando.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onRefetch}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Tentar de novo
            </Button>
          </div>
        ) : isLoading && displayedSessoes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-40" />
              <p className="text-sm">Carregando conversas...</p>
            </div>
          </div>
        ) : displayedSessoes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
            <Users className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-center font-medium">
              {temFiltro ? "Nada neste filtro" : "Nenhuma conversa"}
            </p>
            <p className="text-sm text-center">
              {temFiltro ? "Tente limpar os filtros acima" : "Aguarde novas interações"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayedSessoes.map((sessao) => (
              <SessaoCard
                key={sessao.id}
                sessao={sessao}
                isActive={sessaoSelecionada?.id === sessao.id}
                onClick={() => onSelectSessao(sessao)}
                atendenteNome={sessaoAtendenteMap.get(sessao.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
