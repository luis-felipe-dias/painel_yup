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
//
// Apresentação: nenhum hexadecimal solto, só tokens do design system.
// Vidro NÃO entra nesta coluna: o cabeçalho de busca dentro de SessaoList
// já é `glass-thin sticky`, e empilhar dois backdrop-filter faz o
// navegador recalcular o desfoque a cada rolagem da lista.
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
    // overflow-x-hidden: a 360px a coluna da lista ocupa a tela inteira;
    // qualquer nome de grupo comprido não pode empurrar a página pro lado.
    <div className="h-full flex bg-background text-foreground overflow-x-hidden">
      <div
        className={cn(
          "h-full border-r border-border bg-surface transition-all duration-300",
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
        // min-w-0: mesmo bug do Conversas/index.tsx - sem isso o painel
        // não encolhe no mobile e corta cabeçalho/mensagens na borda.
        <div className="flex-1 h-full min-w-0">
          {sessaoSelecionada ? (
            <ConversaWindow
              key={sessaoSelecionada.id}
              sessao={sessaoSelecionada}
              onBack={handleBackToList}
              onSessaoUpdated={handleSessaoUpdated}
            />
          ) : (
            <GruposVazio temGrupos={grupos.length > 0} />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Estado vazio do painel da direita. Declarado no escopo do módulo (e não
 * dentro da página) pra não remontar a árvore a cada render da lista.
 * A frase diz o que fazer, não só que está vazio.
 */
function GruposVazio({ temGrupos }: { temGrupos: boolean }) {
  return (
    <div className="h-full flex items-center justify-center p-4 md:p-6">
      <div className="text-center max-w-sm animate-fade-in">
        <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-full bg-brincadeira/12 flex items-center justify-center">
          <Users className="w-8 h-8 md:w-10 md:h-10 text-brincadeira" />
        </div>
        <h3 className="text-base md:text-lg font-semibold text-foreground mb-1">
          {temGrupos ? "Nenhum grupo selecionado" : "Nenhum grupo por aqui ainda"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {temGrupos
            ? "Toque em um grupo da lista para ler as mensagens e responder."
            : "Os grupos aparecem aqui quando alguém escreve em um grupo em que o número da Yup está."}
        </p>
      </div>
    </div>
  );
}

function GruposSkeleton() {
  return (
    <div className="h-full flex bg-background overflow-x-hidden">
      <div className="w-full md:w-80 lg:w-96 h-full border-r border-border bg-surface p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      {/* No celular a coluna da lista já ocupa a tela: o esqueleto da
          conversa só faz sentido a partir do md. */}
      <div className="hidden md:flex flex-1 h-full items-center justify-center">
        <div className="text-center">
          <Skeleton className="w-16 h-16 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto mt-4" />
          <Skeleton className="h-4 w-64 mx-auto mt-2" />
        </div>
      </div>
    </div>
  );
}
