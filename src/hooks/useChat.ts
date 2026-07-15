import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { chatService } from '../services/chat.service';
import { Message } from '../types/chat.types';

type IntervalId = ReturnType<typeof setInterval>;

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isAtBottom: boolean;
  hasNewMessages: boolean;
  newMessagesCount: number;
  containerRef: React.RefObject<HTMLDivElement>;
  bottomRef: React.RefObject<HTMLDivElement>;
  sendMessage: (text: string) => Promise<void>;
  handleScroll: () => void;
  scrollToBottom: (smooth?: boolean) => void;
}

export function useChat(sessaoId: string): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const intervalRef = useRef<IntervalId | null>(null);
  const isAtBottomRef = useRef(true);
  const isUpdatingRef = useRef(false);
  const pendingUpdatesRef = useRef<any[]>([]);

  // Scroll para o final
  const scrollToBottom = useCallback((smooth: boolean = true) => {
    const container = containerRef.current;
    if (!container) return;

    if (smooth) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      container.scrollTop = container.scrollHeight;
    }

    isAtBottomRef.current = true;
    setHasNewMessages(false);
    setNewMessagesCount(0);
  }, []);

  // Aplicar atualizações de forma otimizada
  const aplicarAtualizacoes = useCallback((diff: { 
    added: Message[]; 
    updated: Message[]; 
    removed: string[];
    allMessages: Message[];
  }) => {
    if (!isMountedRef.current) return;

    console.log(`📦 Aplicando diff: +${diff.added.length}, ~${diff.updated.length}, -${diff.removed.length}`);

    setMessages(prev => {
      let newMessages = [...prev];

      // 1. Remover mensagens deletadas
      if (diff.removed.length > 0) {
        const removeSet = new Set(diff.removed);
        newMessages = newMessages.filter(m => !removeSet.has(m.id));
      }

      // 2. Atualizar mensagens modificadas (preservando referência)
      if (diff.updated.length > 0) {
        const updateMap = new Map(diff.updated.map(m => [m.id, m]));
        newMessages = newMessages.map(m => {
          const updated = updateMap.get(m.id);
          return updated || m;
        });
      }

      // 3. Adicionar mensagens novas
      if (diff.added.length > 0) {
        const existingIds = new Set(newMessages.map(m => m.id));
        const trulyNew = diff.added.filter(m => !existingIds.has(m.id));
        
        if (trulyNew.length > 0) {
          newMessages = [...newMessages, ...trulyNew];
          
          // Se não está no final, acumular contagem
          if (!isAtBottomRef.current) {
            setHasNewMessages(true);
            setNewMessagesCount(prev => prev + trulyNew.length);
          }
        }
      }

      // Ordenar por índice
      newMessages.sort((a, b) => (a.index || 0) - (b.index || 0));

      return newMessages;
    });

    // Se está no final e tem atualizações, scrollar
    if (isAtBottomRef.current && (diff.added.length > 0 || diff.updated.length > 0)) {
      requestAnimationFrame(() => {
        scrollToBottom(true);
      });
    }
  }, [scrollToBottom]);

  // CARREGAMENTO INICIAL
  const loadInitial = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log(`🔄 [useChat] Carregando mensagens iniciais para ${sessaoId}`);
      
      const cached = chatService.getCachedMessages(sessaoId);
      
      if (cached.length > 0) {
        console.log(`📦 [useChat] Usando cache: ${cached.length} mensagens`);
        setMessages(cached);
        setIsLoading(false);
        setTimeout(() => scrollToBottom(false), 50);
        return;
      }

      const messages = await chatService.loadInitialMessages(sessaoId);
      if (isMountedRef.current) {
        console.log(`✅ [useChat] ${messages.length} mensagens carregadas`);
        setMessages(messages);
        setIsLoading(false);
        setTimeout(() => scrollToBottom(false), 100);
      }
    } catch (error) {
      if (isMountedRef.current) {
        setError('Erro ao carregar mensagens');
        setIsLoading(false);
      }
    }
  }, [sessaoId, scrollToBottom]);

  // ATUALIZAÇÃO - Buscar mudanças
  const fetchUpdates = useCallback(async () => {
    // Evitar múltiplas atualizações simultâneas
    if (isUpdatingRef.current) {
      console.log('⏳ Atualização já em andamento, agendando...');
      return;
    }

    isUpdatingRef.current = true;
    
    try {
      console.log(`🔄 [useChat] Verificando atualizações para ${sessaoId}`);
      
      const diff = await chatService.fetchUpdates(sessaoId);
      
      if (!isMountedRef.current) return;

      // Aplicar atualizações
      aplicarAtualizacoes(diff);
      
    } catch (error) {
      console.error('❌ [useChat] Erro ao buscar atualizações:', error);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [sessaoId, aplicarAtualizacoes]);

  // Handler de scroll
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;

    isAtBottomRef.current = atBottom;

    if (atBottom) {
      setHasNewMessages(false);
      setNewMessagesCount(0);
    }
  }, []);

  // Enviar mensagem
  const sendMessage = useCallback(async (texto: string) => {
    if (!texto.trim()) return;

    try {
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        sessaoId,
        tipo: 'texto',
        conteudo: texto,
        remetente: 'atendente',
        dataHora: new Date().toISOString(),
        metadata: {},
        index: messages.length,
        respondida: true
      };

      // Adicionar otimisticamente
      setMessages(prev => [...prev, tempMessage]);

      if (isAtBottomRef.current) {
        setTimeout(() => scrollToBottom(true), 50);
      }

      await chatService.sendMessage(sessaoId, texto);
      
      // Buscar atualizações para confirmar
      await fetchUpdates();

    } catch (error) {
      console.error('❌ [useChat] Erro ao enviar mensagem:', error);
      // Recarregar para corrigir
      await loadInitial();
    }
  }, [sessaoId, scrollToBottom, fetchUpdates, loadInitial, messages.length]);

  // Registrar callback para atualizações em tempo real
  useEffect(() => {
    const handleUpdate = (diff: any) => {
      if (isMountedRef.current) {
        aplicarAtualizacoes(diff);
      }
    };

    chatService.onUpdate(sessaoId, handleUpdate);

    return () => {
      chatService.clearCache(sessaoId);
    };
  }, [sessaoId, aplicarAtualizacoes]);

  // Inicializar
  useEffect(() => {
    console.log(`🚀 [useChat] Inicializando chat para ${sessaoId}`);
    
    isMountedRef.current = true;
    
    chatService.clearCache(sessaoId);
    loadInitial();

    // Configurar polling a cada 5 segundos com debounce
    intervalRef.current = setInterval(() => {
      if (!isUpdatingRef.current) {
        fetchUpdates();
      }
    }, 5000);

    return () => {
      console.log(`🧹 [useChat] Limpando chat para ${sessaoId}`);
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isUpdatingRef.current = false;
    };
  }, [sessaoId, loadInitial, fetchUpdates]);

  // Memoizar mensagens
  const memoizedMessages = useMemo(() => messages, [messages]);

  return {
    messages: memoizedMessages,
    isLoading,
    error,
    isAtBottom: isAtBottomRef.current,
    hasNewMessages,
    newMessagesCount,
    containerRef,
    bottomRef,
    sendMessage,
    handleScroll,
    scrollToBottom
  };
}