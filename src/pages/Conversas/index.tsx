import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SessaoList } from "./components/SessaoList";
import { ConversaWindow } from "./components/ConversaWindow";
import { AtendentePasswordModal } from "./components/AtendentePasswordModal";
import { NovaConversaModal } from "./components/NovaConversaModal";
import { sessoesService } from "../../services/sessoes.service";
import { authService } from "../../services/auth.service";
import { Sessao } from "../../types/sessoes.types";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../contexts/AuthContext";
import { Skeleton } from "../../components/ui/Skeleton";
import { cn } from "../../utils/cn";
import { MessageSquare, Shield } from "lucide-react";

export default function Conversas() {
  const [sessaoSelecionada, setSessaoSelecionada] = useState<Sessao | null>(null);
  const [sessaoPendente, setSessaoPendente] = useState<Sessao | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "conversation">("list");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [atendenteInfo, setAtendenteInfo] = useState<{ id: string; nome: string } | null>(null);
  const [sessaoAtendenteMap, setSessaoAtendenteMap] = useState<Map<string, string>>(new Map());
  const [isOpening, setIsOpening] = useState(false);
  const [showNovaConversaModal, setShowNovaConversaModal] = useState(false);
  
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { usuario, hasSessaoPermission } = useAuth();
  const intervalRef = useRef<number | undefined>(undefined);

  const setoresPermitidos = usuario?.permissoes?.setores || [];

  const { 
    data: sessoes = [], 
    isLoading, 
    error,
    refetch: refetchSessoes 
  } = useQuery({
    queryKey: ["sessoes", setoresPermitidos],
    queryFn: () => sessoesService.listar(undefined, setoresPermitidos),
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

  // Quem está atendendo cada sessão.
  // Antes: um `for` com uma requisição POR sessão aberta, disparado a cada
  // atualização da lista (5s). Com 20 sessões abertas isso era 240
  // requisições por minuto, por atendente logado - e o resultado chegava
  // fora de ordem. Agora é UMA chamada que devolve o mapa pronto, e num
  // intervalo próprio de 15s: saber quem está atendendo não precisa da
  // mesma pressa que a lista de mensagens.
  const { data: mapaAtendentes } = useQuery({
    queryKey: ["atendentes-por-sessao"],
    queryFn: () => authService.buscarAtendentesPorSessao(),
    refetchInterval: 15000,
    staleTime: 10000,
  });

  useEffect(() => {
    if (!mapaAtendentes) return;
    setSessaoAtendenteMap(new Map(Object.entries(mapaAtendentes)));
  }, [mapaAtendentes]);

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

  // Função chamada quando clica em uma sessão
  const handleSelectSessao = (sessao: Sessao) => {
    console.log(`🖱️ Tentando abrir sessão: ${sessao.nome} (${sessao.id})`);
    console.log(`📊 Estado da sessão: ${sessao.estado}`);
    console.log(`👤 Usuário tipo: ${usuario?.tipo}`);
    
    // Se for admin, abre direto sem senha
    if (usuario?.tipo === 'admin') {
      console.log('🔓 Admin - Abrindo sem senha');
      abrirSessao(sessao);
      return;
    }
    
    // SEMPRE pedir senha para atendentes, independente do estado
    console.log('🔐 Solicitando senha do atendente');
    setSessaoPendente(sessao);
    setShowPasswordModal(true);
  };

  // Função para abrir a sessão (usada tanto por admin quanto após validação)
  const abrirSessao = (sessao: Sessao) => {
    console.log(`✅ Abrindo sessão: ${sessao.nome}`);
    setSessaoSelecionada(sessao);
    if (window.innerWidth < 768) {
      setMobileView("conversation");
    }
    setShowPasswordModal(false);
    setSessaoPendente(null);
  };

  // Função chamada quando a senha é validada com sucesso
  const handlePasswordSuccess = async (atendenteId: string, atendenteNome: string) => {
    console.log(`✅ Atendente autenticado: ${atendenteNome} (${atendenteId})`);
    setAtendenteInfo({ id: atendenteId, nome: atendenteNome });
    
    if (sessaoPendente) {
      console.log(`📝 Registrando abertura da sessão ${sessaoPendente.id} para ${atendenteNome}`);
      
      // Registrar abertura da sessão
      await authService.registrarAberturaSessao(sessaoPendente.id, atendenteId);
      
      // Atualizar mapa de atendentes
      setSessaoAtendenteMap(prev => {
        const newMap = new Map(prev);
        newMap.set(sessaoPendente.id, atendenteNome);
        return newMap;
      });
      
      // Abrir a sessão
      abrirSessao(sessaoPendente);
      
      // Atualizar lista de sessões
      refetchSessoes();
      
      showToast(`Sessão aberta por ${atendenteNome}`, 'success');
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

  // Chamado depois que o atendente manda a primeira mensagem em
  // NovaConversaModal - abre a sessão recém-criada do mesmo jeito que
  // clicar em qualquer sessão da lista (respeita a senha do atendente).
  const handleConversaIniciada = async (sessaoId: string) => {
    refetchSessoes();
    const nova = await sessoesService.obter(sessaoId);
    if (nova) {
      handleSelectSessao(nova);
    }
  };

  const sessoesArray = Array.isArray(sessoes) ? sessoes : [];

  const showList = mobileView === "list";
  const showConversation = mobileView === "conversation" || window.innerWidth >= 768;

  if (isLoading && sessoesArray.length === 0) {
    return <ConversasSkeleton />;
  }

  if (setoresPermitidos.length === 0 && usuario?.tipo !== 'admin') {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold text-foreground">
            Sem Permissão
          </h2>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar nenhum setor de atendimento.
            <br />
            Entre em contato com o administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-background">
      <div 
        className={cn(
          "h-full border-r border-border bg-surface transition-all duration-300",
          showList ? "w-full md:w-80 lg:w-96" : "hidden md:block md:w-80 lg:w-96"
        )}
      >
        <SessaoList
          sessoes={sessoesArray}
          sessaoSelecionada={sessaoSelecionada}
          onSelectSessao={handleSelectSessao}
          onRefetch={refetchSessoes}
          isLoading={isLoading}
          sessaoAtendenteMap={sessaoAtendenteMap}
          onNovaConversa={() => setShowNovaConversaModal(true)}
          atendenteAtualNome={atendenteInfo?.nome || usuario?.nome}
          erro={Boolean(error)}
        />
      </div>

      {showConversation && (
        // min-w-0 é obrigatório aqui: um filho flex-1 sem isso usa
        // min-width:auto por padrão, então não encolhe abaixo da largura
        // do seu conteúdo (nome/mensagens longas). Isso fazia o painel de
        // conversa ficar largo demais no mobile e cortar o cabeçalho e as
        // bolhas de mensagem na borda da tela em vez de truncar/quebrar.
        <div className="flex-1 h-full min-w-0">
          {sessaoSelecionada ? (
            <ConversaWindow
              // O id do atendente entra na key de propósito: trocando de
              // atendente na MESMA sessão (passagem de turno, troca de
              // senha), o componente tem que remontar. Sem isso o estado
              // interno antigo continuava e a mensagem saía assinada pelo
              // atendente anterior.
              key={`${sessaoSelecionada.id}:${atendenteInfo?.id ?? 'sem-atendente'}`}
              sessao={sessaoSelecionada}
              onBack={handleBackToList}
              onSessaoUpdated={handleSessaoUpdated}
              atendenteId={atendenteInfo?.id || undefined}
              atendenteNome={atendenteInfo?.nome || undefined}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center p-8 max-w-sm">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-accent-soft flex items-center justify-center">
                  <MessageSquare className="w-10 h-10 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Nenhuma conversa selecionada
                </h3>
                <p className="text-sm text-muted-foreground">
                  Escolha uma sessão para visualizar a conversa
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Senha do Atendente - aparece SEMPRE que clica para abrir */}
      <AtendentePasswordModal
        open={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setSessaoPendente(null);
        }}
        onSuccess={handlePasswordSuccess}
        sessaoNome={sessaoPendente?.nome || ''}
      />

      <NovaConversaModal
        open={showNovaConversaModal}
        onOpenChange={setShowNovaConversaModal}
        atendenteNome={atendenteInfo?.nome || usuario?.nome}
        onConversaIniciada={handleConversaIniciada}
      />
    </div>
  );
}

function ConversasSkeleton() {
  return (
    <div className="h-full flex">
      <div className="w-96 h-full border-r p-4 space-y-4 bg-surface">
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