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
  const intervalRef = useRef<number | undefined>(undefined);

  // Buscar sessões
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

  // Tratar erro
  useEffect(() => {
    if (error) {
      showToast(
        "Erro ao carregar sessões. Tentando novamente...",
        "error"
      );
    }
  }, [error, showToast]);

  // Responsividade
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

  // Função para selecionar sessão
  const handleSelectSessao = (sessao: Sessao) => {
    console.log(`🖱️ Selecionando sessão: ${sessao.nome} (${sessao.id})`);
    setSessaoSelecionada(sessao);
    if (window.innerWidth < 768) {
      setMobileView("conversation");
    }
  };

  const handleBackToList = () => {
    setMobileView("list");
  };

  const sessoesArray = Array.isArray(sessoes) ? sessoes : [];

  const showList = mobileView === "list";
  const showConversation = mobileView === "conversation" || window.innerWidth >= 768;

  if (isLoading && sessoesArray.length === 0) {
    return <ConversasSkeleton />;
  }

  return (
    <div className="h-full flex bg-background">
      {/* Lista de Sessões */}
      <div 
        className={cn(
          "h-full border-r bg-card/30 transition-all duration-300",
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

      {/* Janela de Conversa */}
      {showConversation && (
        <div className="flex-1 h-full">
          {sessaoSelecionada ? (
            <ConversaWindow
              key={sessaoSelecionada.id}
              sessao={sessaoSelecionada}
              onBack={handleBackToList}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground bg-gradient-to-b from-background to-card/30">
              <div className="text-center p-8 max-w-sm">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-10 h-10 text-primary/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">
                  Nenhuma conversa selecionada
                </h3>
                <p className="text-sm text-muted-foreground">
                  Escolha uma sessão no menu lateral para visualizar a conversa
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
      <div className="w-96 h-full border-r p-4 space-y-4 bg-card/30">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <div className="flex-1 h-full flex items-center justify-center bg-gradient-to-b from-background to-card/30">
        <div className="text-center">
          <Skeleton className="w-16 h-16 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto mt-4" />
          <Skeleton className="h-4 w-64 mx-auto mt-2" />
        </div>
      </div>
    </div>
  );
}