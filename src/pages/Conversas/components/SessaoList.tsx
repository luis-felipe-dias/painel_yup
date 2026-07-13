import { useState } from "react";
import { Search, RefreshCw, Users, Loader2 } from "lucide-react";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { SessaoCard } from "./SessaoCard";
import { Sessao } from "../../../types/sessoes.types";
import { useDebounce } from "../../../hooks/useDebounce";
import { sessoesService } from "../../../services/sessoes.service";
import { useQuery } from "@tanstack/react-query";

interface SessaoListProps {
  sessoes: Sessao[];
  sessaoSelecionada: Sessao | null;
  onSelectSessao: (sessao: Sessao) => void;
  onRefetch: () => void;
  isLoading?: boolean;
  sessaoAtendenteMap?: Map<string, string>;
}

export function SessaoList({ 
  sessoes = [],
  sessaoSelecionada, 
  onSelectSessao,
  onRefetch,
  isLoading = false,
  sessaoAtendenteMap = new Map()
}: SessaoListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: searchResults = [] } = useQuery({
    queryKey: ["sessoes", "search", debouncedSearch],
    queryFn: () => sessoesService.buscar(debouncedSearch),
    enabled: debouncedSearch.length > 0,
  });

  const displayedSessoes = debouncedSearch ? searchResults : sessoes;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefetch();
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const handleSelectSessao = (sessao: Sessao) => {
    console.log(`🖱️ Clicou na sessão: ${sessao.nome} (${sessao.id})`);
    onSelectSessao(sessao);
  };

  return (
    <div className="h-full flex flex-col bg-[#fcfbf8] dark:bg-[#1a1f2e]">
      <div className="p-4 border-b bg-[#ffffff] dark:bg-[#1f2638] border-[#e8e5dd] dark:border-[#2a3147] shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7299] dark:text-[#8a93b8]" />
            <Input
              placeholder="Pesquisar sessões..."
              className="pl-9 bg-[#f5f3ee] dark:bg-[#232a3e] border-0 text-[#2d3348] dark:text-[#dde1f0] placeholder:text-[#6b7299] dark:placeholder:text-[#8a93b8] focus:ring-1 focus:ring-[#EA70B0]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="shrink-0 hover:bg-[#f0ede7] dark:hover:bg-[#2a3147] rounded-full"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#EA70B0]" />
            ) : (
              <RefreshCw className="w-4 h-4 text-[#6b7299] dark:text-[#8a93b8]" />
            )}
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-[#6b7299] dark:text-[#8a93b8]">
            {displayedSessoes?.length || 0} {displayedSessoes?.length === 1 ? 'sessão' : 'sessões'}
          </span>
          {isLoading && (
            <span className="flex items-center gap-1 text-[#6b7299] dark:text-[#8a93b8]">
              <Loader2 className="w-3 h-3 animate-spin" />
              Carregando...
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-custom">
        {isLoading && displayedSessoes?.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[#6b7299] dark:text-[#8a93b8]">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-30" />
              <p className="text-sm">Carregando sessões...</p>
            </div>
          </div>
        ) : !displayedSessoes || displayedSessoes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#6b7299] dark:text-[#8a93b8] p-8">
            <Users className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-center font-medium">Nenhuma sessão encontrada</p>
            <p className="text-sm text-center">Aguarde novas interações</p>
          </div>
        ) : (
          <div className="divide-y divide-[#e8e5dd] dark:divide-[#2a3147]">
            {displayedSessoes.map((sessao) => (
              <SessaoCard
                key={sessao.id}
                sessao={sessao}
                isActive={sessaoSelecionada?.id === sessao.id}
                onClick={() => handleSelectSessao(sessao)}
                atendenteNome={sessaoAtendenteMap.get(sessao.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}