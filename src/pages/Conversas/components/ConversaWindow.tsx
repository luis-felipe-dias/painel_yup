import React, { useCallback, useMemo, useState } from 'react';
import { useChat } from '../../../hooks/useChat';
import { Sessao } from '../../../types/sessoes.types';
import { MessageInput } from './MessageInput';
import { MensagemItem } from './MensagemItem';
import { useToast } from '../../../hooks/useToast';
import { sessoesService } from '../../../services/sessoes.service';
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
  AlertCircle
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface ConversaWindowProps {
  sessao: Sessao;
  onBack: () => void;
  onSessaoUpdated?: () => void;
}

export function ConversaWindow({ sessao, onBack, onSessaoUpdated }: ConversaWindowProps) {
  const { showToast } = useToast();
  const [isCanceling, setIsCanceling] = useState(false);
  
  const {
    messages,
    isLoading,
    hasNewMessages,
    newMessagesCount,
    containerRef,
    bottomRef,
    sendMessage,
    handleScroll,
    scrollToBottom
  } = useChat(sessao.id);

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
    if (!sessao.aguardandoAtendente) return;
    
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
    } catch (error) {
      showToast("Erro ao cancelar atendimento", "error");
      console.error("Erro ao cancelar:", error);
    } finally {
      setIsCanceling(false);
    }
  }, [sessao.id, sessao.aguardandoAtendente, showToast, onSessaoUpdated]);

  const messageList = useMemo(() => {
    return messages.map((msg) => (
      <MensagemItem key={msg.id} mensagem={msg} sessaoId={sessao.id} />
    ));
  }, [messages, sessao.id]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f5f5f7] dark:bg-[#1a1a1e]">
        <div className="text-center text-[#86868b] dark:text-[#86868b]">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
          <p className="text-sm font-light">Carregando mensagens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7] dark:bg-[#1a1a1e] relative">
      {/* Header - Estilo Apple */}
      <div className="flex items-center gap-3 px-4 h-[52px] bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-[#e5e5ea] dark:border-[#38383a] shrink-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] rounded-full text-[#007aff] dark:text-[#0a84ff]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#007aff] to-[#5856d6] flex items-center justify-center shrink-0 overflow-hidden">
          {sessao.nome ? (
            <span className="text-lg font-semibold text-white">
              {sessao.nome.charAt(0).toUpperCase()}
            </span>
          ) : (
            <User className="w-5 h-5 text-white" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[15px] text-[#1c1c1e] dark:text-[#f5f5f7] truncate">
            {sessao.nome}
          </div>
          <div className="flex items-center gap-1 text-[13px] text-[#86868b] dark:text-[#86868b]">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              sessao.status === "online" ? "bg-[#34c759]" : "bg-[#86868b]"
            )} />
            <span>{getStatusText()}</span>
            <span className="mx-1">•</span>
            <span>{formatPhone(sessao.telefone)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {sessao.aguardandoAtendente && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelarAtendimento}
              disabled={isCanceling}
              className="text-[#ff3b30] hover:bg-[#ff3b30]/10 dark:hover:bg-[#ff453a]/10 rounded-full px-3 py-1 h-8 text-[13px] font-medium"
            >
              {isCanceling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-1" />
                  Cancelar
                </>
              )}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] rounded-full text-[#007aff] dark:text-[#0a84ff]">
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] rounded-full text-[#007aff] dark:text-[#0a84ff]">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

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
          className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[#007aff] text-white text-sm font-medium shadow-lg hover:bg-[#0066d9] transition-all duration-200 flex items-center gap-2 animate-fade-in z-10"
        >
          <ArrowDown className="w-4 h-4" />
          <span>{newMessagesCount} nova{newMessagesCount > 1 ? 's' : ''} mensagen{newMessagesCount > 1 ? 's' : ''}</span>
        </button>
      )}

      {/* Input */}
      <MessageInput onSend={sendMessage} />
    </div>
  );
}