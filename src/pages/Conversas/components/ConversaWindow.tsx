import React, { useCallback, useMemo } from 'react';
import { useChat } from '../../../hooks/useChat';
import { Sessao } from '../../../types/sessoes.types';
import { MessageInput } from './MessageInput';
import { MensagemItem } from './MensagemItem';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../utils/cn';
import { ArrowLeft, Phone, MoreVertical, Search, User, Loader2, ArrowDown } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface ConversaWindowProps {
  sessao: Sessao;
  onBack: () => void;
}

export function ConversaWindow({ sessao, onBack }: ConversaWindowProps) {
  const { showToast } = useToast();
  
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

  // Renderizar mensagens - memoizado
  const messageList = useMemo(() => {
    return messages.map((msg) => (
      <MensagemItem key={msg.id} mensagem={msg} sessaoId={sessao.id} />
    ));
  }, [messages, sessao.id]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f8f6f0] dark:bg-[#1a1f2e]">
        <div className="text-center text-[#6b7299] dark:text-[#8a93b8]">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
          <p className="text-sm">Carregando mensagens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#f8f6f0] dark:bg-[#1a1f2e] relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 bg-[#ffffff] dark:bg-[#1f2638] border-b border-[#e8e5dd] dark:border-[#2a3147] shrink-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden hover:bg-[#f0ede7] dark:hover:bg-[#2a3147] rounded-full"
        >
          <ArrowLeft className="w-5 h-5 text-[#4A5080] dark:text-[#A5B0D0]" />
        </Button>
        
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EA70B0] to-[#D860A0] flex items-center justify-center shrink-0 overflow-hidden">
          {sessao.nome ? (
            <span className="text-lg font-semibold text-white">
              {sessao.nome.charAt(0).toUpperCase()}
            </span>
          ) : (
            <User className="w-5 h-5 text-white" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate text-[#2d3348] dark:text-[#dde1f0]">
            {sessao.nome}
          </div>
          <div className="flex items-center gap-1 text-xs text-[#6b7299] dark:text-[#8a93b8]">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              sessao.status === "online" ? "bg-[#ACBD6F]" : "bg-[#6b7299] dark:bg-[#8a93b8]"
            )} />
            <span>{getStatusText()}</span>
            <span className="mx-1">•</span>
            <span>{formatPhone(sessao.telefone)}</span>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="hover:bg-[#f0ede7] dark:hover:bg-[#2a3147] rounded-full">
            <Search className="w-5 h-5 text-[#6b7299] dark:text-[#8a93b8]" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-[#f0ede7] dark:hover:bg-[#2a3147] rounded-full">
            <MoreVertical className="w-5 h-5 text-[#6b7299] dark:text-[#8a93b8]" />
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
          className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[#EA70B0] text-white text-sm font-medium shadow-lg hover:bg-[#D860A0] transition-all duration-200 flex items-center gap-2 animate-fade-in z-10"
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