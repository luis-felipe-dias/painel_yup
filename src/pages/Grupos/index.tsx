import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SessaoList } from "../Conversas/components/SessaoList";
import { ConversaWindow } from "../Conversas/components/ConversaWindow";
import { sessoesService } from "../../services/sessoes.service";
import { Sessao } from "../../types/sessoes.types";
import { useToast } from "../../hooks/useToast";
import { Skeleton } from "../../components/ui/Skeleton";
import { cn } from "../../utils/cn";
import { Users } from "lucide-react";

// Página separada da de Conversas pra não misturar grupo com atendimento
// 1:1 de cliente - grupo não tem senha de atendente, não transfere de
// setor e não tem botão de "cancelar atendimento" (isso é tudo coisa do
// fluxo do bot com cliente, que grupo nunca passa).
export default function Grupos() {
  const [sessaoSelecionada, setSessaoSelecionada] = useState<Sessao | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "conversation">("list");
  const { showToast } = useToast();

  const {
    data: grupos = [],
    isLoading,
    error,
    refetch: refetchGrupos
  } = useQuery({
    queryKey: ["sessoes", "grupos"],
    queryFn: () => sessoesService.listarGrupos(),
    refetchInterval: 8000,
    staleTime: 3000,
  });

  useEffect(() => {
    if (error) {
      showToast("Erro ao carregar grupos. Tentando novamente...", "error");
    }
  }, [error, showToast]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setMobileView(sessaoSelecionada ? "conversation" : "list");
      } else {
        setMobileView("list");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [sessaoSelecionada]);

  const handleSelectSessao = (sessao: Sessao) => {
    setSessaoSelecionada(sessao);
    if (window.innerWidth < 768) {
      setMobileView("conversation");
    }
  };

  const handleBackToList = () => setMobileView("list");

  const handleSessaoUpdated = () => {
    refetchGrupos();
    if (sessaoSelecionada) {
      sessoesService.obter(sessaoSelecionada.id).then((updated) => {
        if (updated) setSessaoSelecionada(updated);
      });
    }
  };

  const showList = mobileView === "list";
  const showConversation = mobileView === "conversation" || window.innerWidth >= 768;

  if (isLoading && grupos.length === 0) {
    return <GruposSkeleton />;
  }

  return (
    <div className="h-full flex bg-[#f5f5f7] dark:bg-[#1a1a1e]">
      <div
        className={cn(
          "h-full border-r bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl transition-all duration-300",
          showList ? "w-full md:w-80 lg:w-96" : "hidden md:block md:w-80 lg:w-96"
        )}
      >
        <SessaoList
          sessoes={grupos}
          sessaoSelecionada={sessaoSelecionada}
          onSelectSessao={handleSelectSessao}
          onRefetch={refetchGrupos}
          isLoading={isLoading}
        />
      </div>

      {showConversation && (
        <div className="flex-1 h-full">
          {sessaoSelecionada ? (
            <ConversaWindow
              key={sessaoSelecionada.id}
              sessao={sessaoSelecionada}
              onBack={handleBackToList}
              onSessaoUpdated={handleSessaoUpdated}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-[#86868b] dark:text-[#86868b]">
              <div className="text-center p-8 max-w-sm">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#5856d6]/10 flex items-center justify-center">
                  <Users className="w-10 h-10 text-[#5856d6]/50" />
                </div>
                <h3 className="text-lg font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">
                  Nenhum grupo selecionado
                </h3>
                <p className="text-sm text-[#86868b]">
                  Escolha um grupo para visualizar as mensagens
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GruposSkeleton() {
  return (
    <div className="h-full flex">
      <div className="w-96 h-full border-r p-4 space-y-4 bg-white/80 dark:bg-[#1c1c1e]/80">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <div className="flex-1 h-full flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="w-16 h-16 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto mt-4" />
          <Skeleton className="h-4 w-64 mx-auto mt-2" />
        </div>
      </div>
    </div>
  );
}
