import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useChat } from '../../../hooks/useChat';
import { Sessao } from '../../../types/sessoes.types';
import { MessageInput } from './MessageInput';
import { MensagemItem } from './MensagemItem';
import { useToast } from '../../../hooks/useToast';
import { sessoesService } from '../../../services/sessoes.service';
import { authService } from '../../../services/auth.service';
import { useMessageSelection } from '../../../contexts/MessageSelectionContext';
import { cn } from '../../../utils/cn';
import { 
  ArrowLeft, 
  Phone, 
  MoreVertical, 
  Search, 
  User,
  Loader2,
  ArrowDown,
  XCircle,
  Clock,
  AlertCircle,
  User as UserIcon,
  CheckSquare,
  Square,
  Share2,
  Users,
  Bot
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { EncaminharPopover } from './EncaminharPopover';
import { TransferirSetorPopover } from './TransferirSetorPopover';

interface ConversaWindowProps {
  sessao: Sessao;
  onBack: () => void;
  onSessaoUpdated?: () => void;
  atendenteId?: string;
  atendenteNome?: string;
}

export function ConversaWindow({ 
  sessao, 
  onBack, 
  onSessaoUpdated,
  atendenteId,
  atendenteNome 
}: ConversaWindowProps) {
  const { showToast } = useToast();
  const [isCanceling, setIsCanceling] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isDevolvendo, setIsDevolvendo] = useState(false);
  const [podeCancelar, setPodeCancelar] = useState({ pode: false, motivo: '' });
  const [tempoRestante, setTempoRestante] = useState(0);
  const [atendenteAtual, setAtendenteAtual] = useState<string | null>(atendenteNome || null);
  const [atendenteIdAtual, setAtendenteIdAtual] = useState<string | null>(atendenteId || null);
  const [modoSelecao, setModoSelecao] = useState(false);
  
  const { mensagensSelecionadas, limparSelecao } = useMessageSelection();
  
  const {
    messages,
    isLoading,
    hasNewMessages,
    newMessagesCount,
    containerRef,
    bottomRef,
    sendMessage: sendMessageBase,
    handleScroll,
    scrollToBottom
  } = useChat(sessao.id);

  // Verificar se pode cancelar
  const verificarPodeCancelar = useCallback(() => {
    const result = sessoesService.podeCancelarAtendimento(sessao);
    setPodeCancelar(result);
    
    if (!result.pode && result.motivo.includes('minutos')) {
      const match = result.motivo.match(/(\d+)/);
      if (match) {
        setTempoRestante(parseInt(match[1]));
      }
    }
  }, [sessao]);

  useEffect(() => {
    verificarPodeCancelar();
    
    const interval = setInterval(() => {
      verificarPodeCancelar();
    }, 30000);

    return () => clearInterval(interval);
  }, [verificarPodeCancelar]);

  // Registrar atendente na sessão
  useEffect(() => {
    const registrarAtendente = async () => {
      if (atendenteIdAtual && !sessao.aguardandoAtendente) {
        const success = await authService.registrarAberturaSessao(sessao.id, atendenteIdAtual);
        if (success) {
          console.log(`✅ Atendente ${atendenteAtual} registrado na sessão ${sessao.id}`);
        }
      }
    };
    
    registrarAtendente();
  }, [sessao.id, atendenteIdAtual, atendenteAtual]);

  // Desativar modo seleção ao trocar de conversa
  useEffect(() => {
    setModoSelecao(false);
    limparSelecao();
  }, [sessao.id]);

  // Função para enviar mensagem com nome do atendente
  const handleSendMessage = useCallback(async (texto: string) => {
    if (!texto.trim()) return;
    
    try {
      if (atendenteIdAtual) {
        await authService.registrarResposta(sessao.id, atendenteIdAtual);
      }
      
      let mensagemFinal = texto;
      
      if (atendenteAtual) {
        mensagemFinal = `*${atendenteAtual} - Atendimento*\n${texto}`;
        console.log(`📝 Mensagem com identificação: ${mensagemFinal}`);
      }
      
      await sendMessageBase(mensagemFinal);
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      // O backend passou a devolver 502 com o motivo real quando o
      // WhatsApp recusa o envio (fora da janela de 24h, número sem
      // WhatsApp, canal errado). Mostrar "Erro ao enviar mensagem" seco
      // obriga a atendente a chamar alguém para descobrir o porquê.
      const detalhe =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(detalhe ? `Não enviou: ${detalhe}` : 'Erro ao enviar mensagem', 'error');
    }
  }, [sessao.id, atendenteIdAtual, atendenteAtual, sendMessageBase, showToast]);

  const formatPhone = useCallback((phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  }, []);

  const getStatusText = useCallback(() => {
    if (sessao.aguardandoAtendente) return "Aguardando atendente...";
    if (sessao.status === "online") return "Online";
    if (sessao.status === "digitando") return "Digitando...";
    return "Offline";
  }, [sessao]);

  const handleCancelarAtendimento = useCallback(async () => {
    if (!podeCancelar.pode) {
      showToast(podeCancelar.motivo, "warning");
      return;
    }
    
    setIsCanceling(true);
    try {
      const success = await sessoesService.cancelarAtendimento(sessao.id);
      
      if (success) {
        showToast("Atendimento cancelado com sucesso!", "success");
        if (onSessaoUpdated) {
          onSessaoUpdated();
        }
      } else {
        showToast("Erro ao cancelar atendimento", "error");
      }
    } catch {
      showToast("Erro ao cancelar atendimento", "error");
    } finally {
      setIsCanceling(false);
    }
  }, [sessao.id, podeCancelar, showToast, onSessaoUpdated]);

  // Devolve a conversa para a Peper. Só aparece quando a sessão está em
  // atendimento humano - fora disso o botão não faz sentido nenhum.
  const handleDevolverAoBot = useCallback(async () => {
    setIsDevolvendo(true);
    try {
      const ok = await sessoesService.devolverAoBot(sessao.id);
      if (ok) {
        showToast("Conversa devolvida para a Peper", "success");
        onSessaoUpdated?.();
      } else {
        showToast("Não foi possível devolver: a conversa não está em atendimento humano", "warning");
      }
    } catch {
      showToast("Erro ao devolver a conversa para a Peper", "error");
    } finally {
      setIsDevolvendo(false);
    }
  }, [sessao.id, showToast, onSessaoUpdated]);

  // Encerra de vez - diferente de "Cancelar" (que devolve pro bot). Usado
  // quando o atendente não vai mais falar com a pessoa nesse momento.
  const handleFinalizarAtendimento = useCallback(async () => {
    setIsFinalizing(true);
    try {
      const success = await sessoesService.finalizarAtendimento(sessao.id);
      if (success) {
        showToast("Conversa finalizada", "success");
        onBack();
        if (onSessaoUpdated) onSessaoUpdated();
      } else {
        showToast("Erro ao finalizar conversa", "error");
      }
    } catch {
      showToast("Erro ao finalizar conversa", "error");
    } finally {
      setIsFinalizing(false);
    }
  }, [sessao.id, showToast, onBack, onSessaoUpdated]);

  const tempoUltimaInteracao = useMemo(() => {
    const ultima = new Date(sessao.ultimaInteracao);
    const agora = new Date();
    return Math.floor((agora.getTime() - ultima.getTime()) / (1000 * 60));
  }, [sessao]);

  // Alternar modo de seleção
  const toggleModoSelecao = useCallback(() => {
    setModoSelecao(prev => {
      if (prev) {
        limparSelecao();
      }
      return !prev;
    });
  }, [limparSelecao]);

  // Renderizar mensagens com ou sem checkbox
  const messageList = useMemo(() => {
    return messages.map((msg) => (
      <MensagemItem 
        key={msg.id} 
        mensagem={msg} 
        sessaoId={sessao.id}
        showCheckbox={modoSelecao}
      />
    ));
  }, [messages, sessao.id, modoSelecao]);

  // Função para pluralizar
  const pluralizar = (count: number, singular: string, plural: string) => {
    return count === 1 ? singular : plural;
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-background/35">
        <div className="text-center text-muted-foreground">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
          <p className="text-sm font-light">Carregando mensagens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-background/35">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-[52px] glass shrink-0 rounded-none border-x-0 border-t-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden hover:bg-surface-muted rounded-full text-accent-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-brincadeira flex items-center justify-center shrink-0 overflow-hidden">
          {sessao.isGroup ? (
            <Users className="w-5 h-5 text-white" />
          ) : sessao.nome ? (
            <span className="text-lg font-semibold text-white">
              {sessao.nome.charAt(0).toUpperCase()}
            </span>
          ) : (
            <User className="w-5 h-5 text-white" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[15px] text-foreground truncate">
              {sessao.nome}
            </span>
            {sessao.isGroup && (
              <span className="shrink-0 text-[10px] font-medium text-brincadeira-ink bg-brincadeira/12 px-1.5 py-0.5 rounded-full">
                Grupo
              </span>
            )}
            {sessao.iniciadaPorAtendente && (
              <span className="shrink-0 text-[10px] font-medium text-accent-foreground bg-accent/12 px-1.5 py-0.5 rounded-full">
                Iniciado pelo atendente
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              sessao.status === "online" ? "bg-atendendo" : "bg-muted-foreground"
            )} />
            <span>{getStatusText()}</span>
            <span className="mx-1">•</span>
            <span>{formatPhone(sessao.telefone)}</span>
          </div>
          {atendenteAtual && (
            <div className="flex items-center gap-1 text-[11px] text-accent-foreground">
              <UserIcon className="w-3 h-3" />
              <span>Atendente: {atendenteAtual}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Botão de seleção múltipla */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleModoSelecao}
            className={cn(
              "hover:bg-surface-muted rounded-full transition-all",
              modoSelecao ? "text-accent-foreground bg-accent/12" : "text-accent-foreground"
            )}
            title={modoSelecao ? "Desativar seleção" : "Selecionar mensagens"}
          >
            {modoSelecao ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </Button>

          {/* Botão encaminhar múltiplo - aparece apenas em modo seleção */}
          {modoSelecao && mensagensSelecionadas.length > 0 && (
            <EncaminharPopover
              sessaoOrigemId={sessao.id}
            >
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-surface-muted rounded-full text-accent-foreground"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </EncaminharPopover>
          )}

          {!sessao.isGroup && !sessao.aguardandoAtendente && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelarAtendimento}
              disabled={isCanceling || !podeCancelar.pode}
              className={cn(
                "rounded-full px-3 py-1 h-8 text-[13px] font-medium transition-all duration-200",
                podeCancelar.pode 
                  ? "text-destructive hover:bg-destructive/10 "
                  : "text-muted-foreground cursor-not-allowed opacity-60"
              )}
              title={podeCancelar.motivo}
            >
              {isCanceling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-1" />
                  {podeCancelar.pode ? 'Cancelar' : `${Math.ceil(tempoRestante)}min`}
                </>
              )}
            </Button>
          )}
          
          {/* Só pra conversa que o ATENDENTE iniciou: cancelar antes dos
              30min de bot suspenso que definimos pra esse caso. Conversa
              normal (cliente que chamou) já tem o botão "Cancelar" acima. */}
          {!sessao.isGroup && sessao.iniciadaPorAtendente && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFinalizarAtendimento}
              disabled={isFinalizing}
              className="rounded-full px-3 py-1 h-8 text-[13px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
              title="Encerra essa conversa iniciada por você antes dos 30min de bot suspenso"
            >
              {isFinalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalizar"}
            </Button>
          )}

          {!sessao.aguardandoAtendente && tempoUltimaInteracao > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-surface-muted px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              <span>{tempoUltimaInteracao}m</span>
            </div>
          )}

          {sessao.aguardandoAtendente && (
            <div className="flex items-center gap-1 text-[11px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" />
              <span>Aguardando</span>
            </div>
          )}

          {sessao.statusOriginal === 'humano' && !sessao.isGroup && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDevolverAoBot}
              disabled={isDevolvendo}
              title="Devolver esta conversa para a Peper"
              className="hover:bg-surface-muted rounded-full text-accent-foreground gap-1.5"
            >
              {isDevolvendo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
              <span className="hidden sm:inline text-xs">Devolver ao bot</span>
            </Button>
          )}

          <Button variant="ghost" size="icon" className="hover:bg-surface-muted rounded-full text-accent-foreground">
            <Search className="w-5 h-5" />
          </Button>
          {!sessao.isGroup && (
            <TransferirSetorPopover
              sessaoId={sessao.id}
              setorAtual={sessao.setorResponsavel}
              onTransferido={() => onSessaoUpdated?.()}
            >
              <Button
                variant="ghost"
                size="icon"
                title="Transferir para outro setor"
                className="hover:bg-surface-muted rounded-full text-accent-foreground"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </TransferirSetorPopover>
          )}
        </div>
      </div>

      {/* Indicador de modo seleção */}
      {modoSelecao && (
        <div className="bg-primary/5 border-b border-accent/20 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-accent-foreground">
            {mensagensSelecionadas.length} mensagen{mensagensSelecionadas.length !== 1 ? 's' : ''} selecionada{mensagensSelecionadas.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={limparSelecao}
              className="text-muted-foreground hover:text-destructive"
            >
              Limpar seleção
            </Button>
            {mensagensSelecionadas.length > 0 && (
              <EncaminharPopover sessaoOrigemId={sessao.id}>
                <Button size="sm" className="bg-primary text-primary-foreground hover:opacity-90 gap-2">
                  <Share2 className="w-4 h-4" />
                  Encaminhar ({mensagensSelecionadas.length})
                </Button>
              </EncaminharPopover>
            )}
          </div>
        </div>
      )}

      {/* Mensagens */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-custom px-4 py-3"
      >
        <div className="space-y-1 max-w-4xl mx-auto">
          {messageList}
          <div ref={bottomRef} style={{ height: '1px' }} />
        </div>
      </div>

      {/* Botão "Novas mensagens" */}
      {hasNewMessages && newMessagesCount > 0 && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-pop hover:opacity-90 transition-all duration-200 flex items-center gap-2 animate-fade-in z-10"
        >
          <ArrowDown className="w-4 h-4" />
          <span>{newMessagesCount} nova{newMessagesCount > 1 ? 's' : ''} mensagen{newMessagesCount > 1 ? 's' : ''}</span>
        </button>
      )}

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        clienteNome={sessao.nome}
        clienteTelefone={sessao.telefone}
        atendenteNome={atendenteNome}
      />
    </div>
  );
}