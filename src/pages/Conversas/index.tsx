import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SessaoList } from "./components/SessaoList";
import { ConversaWindow } from "./components/ConversaWindow";
import { AtendentePasswordModal } from "./components/AtendentePasswordModal";
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

  // Carregar atendentes das sessões abertas
  useEffect(() => {
    const carregarAtendentesSessoes = async () => {
      const sessaoIds = sessoes.filter(s => s.estado === 'aberta').map(s => s.id);
      const newMap = new Map<string, string>();
      
      for (const id of sessaoIds) {
        try {
          const atendente = await authService.buscarAtendenteSessao(id);
          if (atendente) {
            newMap.set(id, atendente.nome);
          }
        } catch (error) {
          console.error(`Erro ao buscar atendente para sessão ${id}:`, error);
        }
      }
      
      setSessaoAtendenteMap(newMap);
    };
    
    if (sessoes.length > 0) {
      carregarAtendentesSessoes();
    }
  }, [sessoes]);

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

  const sessoesArray = Array.isArray(sessoes) ? sessoes : [];

  const showList = mobileView === "list";
  const showConversation = mobileView === "conversation" || window.innerWidth >= 768;

  if (isLoading && sessoesArray.length === 0) {
    return <ConversasSkeleton />;
  }

  if (setoresPermitidos.length === 0 && usuario?.tipo !== 'admin') {
    return (
      <div className="h-full flex items-center justify-center bg-[#f5f5f7] dark:bg-[#1a1a1e]">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-[#86868b] opacity-50" />
          <h2 className="text-xl font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
            Sem Permissão
          </h2>
          <p className="text-[#86868b]">
            Você não tem permissão para acessar nenhum setor de atendimento.
            <br />
            Entre em contato com o administrador.
          </p>
        </div>
      </div>
    );
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
          sessaoAtendenteMap={sessaoAtendenteMap}
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
              atendenteId={atendenteInfo?.id || undefined}
              atendenteNome={atendenteInfo?.nome || undefined}
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