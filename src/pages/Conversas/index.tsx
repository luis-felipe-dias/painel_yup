import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SessaoList } from "./components/SessaoList";
import { ConversaWindow } from "./components/ConversaWindow";
import { sessoesService } from "../../services/sessoes.service";
import { Sessao } from "../../types/sessoes.types";
import { useToast } from "../../hooks/useToast";
import { Skeleton } from "../../components/ui/Skeleton";
import { cn } from "../../utils/cn";
import { MessageSquare } from "lucide-react";

export default function Conversas() {
  const [sessaoSelecionada, setSessaoSelecionada] = useState<Sessao | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "conversation">("list");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const { 
    data: sessoes = [], 
    isLoading, 
    error,
    refetch: refetchSessoes 
  } = useQuery({
    queryKey: ["sessoes"],
    queryFn: () => sessoesService.listar(),
    refetchInterval: 5000,
    staleTime: 2000,
  });

  useEffect(() => {
    if (error) {
      showToast(
        "Erro ao carregar sessões. Tentando novamente...",
        "error"
      );
    }
  }, [error, showToast]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        if (sessaoSelecionada) {
          setMobileView("conversation");
        } else {
          setMobileView("list");
        }
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

  const handleBackToList = () => {
    setMobileView("list");
  };

  const handleSessaoUpdated = () => {
    refetchSessoes();
    if (sessaoSelecionada) {
      sessoesService.obter(sessaoSelecionada.id).then((updated) => {
        if (updated) {
          setSessaoSelecionada(updated);
        }
      });
    }
  };

  const sessoesArray = Array.isArray(sessoes) ? sessoes : [];

  const showList = mobileView === "list";
  const showConversation = mobileView === "conversation" || window.innerWidth >= 768;

  if (isLoading && sessoesArray.length === 0) {
    return <ConversasSkeleton />;
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
          sessoes={sessoesArray}
          sessaoSelecionada={sessaoSelecionada}
          onSelectSessao={handleSelectSessao}
          onRefetch={refetchSessoes}
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
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#007aff]/10 flex items-center justify-center">
                  <MessageSquare className="w-10 h-10 text-[#007aff]/50" />
                </div>
                <h3 className="text-lg font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">
                  Nenhuma conversa selecionada
                </h3>
                <p className="text-sm text-[#86868b]">
                  Escolha uma sessão para visualizar a conversa
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConversasSkeleton() {
  return (
    <div className="h-full flex">
      <div className="w-96 h-full border-r p-4 space-y-4 bg-white/80 dark:bg-[#1c1c1e]/80">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
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