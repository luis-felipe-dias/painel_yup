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
  // Usar Map para armazenar mensagens por ID
  const [messagesMap, setMessagesMap] = useState<Map<string, Message>>(new Map());
  const [messagesOrder, setMessagesOrder] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const intervalRef = useRef<IntervalId | null>(null);
  const isAtBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);

  // Converter Map para array ordenado
  const messages = useMemo(() => {
    return messagesOrder.map(id => messagesMap.get(id)!);
  }, [messagesMap, messagesOrder]);

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

  // Adicionar mensagens de forma incremental
  const addMessagesIncremental = useCallback((newMessages: Message[]) => {
    if (newMessages.length === 0) return;

    setMessagesMap(prev => {
      const newMap = new Map(prev);
      let addedCount = 0;
      
      for (const msg of newMessages) {
        if (!newMap.has(msg.id)) {
          newMap.set(msg.id, msg);
          addedCount++;
          console.log(`📨 Adicionando mensagem ${msg.id} ao Map`);
        } else {
          console.log(`⏭️ Mensagem ${msg.id} já existe no Map`);
        }
      }
      
      if (addedCount > 0) {
        console.log(`📨 Adicionando ${addedCount} novas mensagens ao Map`);
        // Atualizar ordem
        setMessagesOrder(prevOrder => {
          const newOrder = [...prevOrder];
          for (const msg of newMessages) {
            if (!prevOrder.includes(msg.id)) {
              newOrder.push(msg.id);
            }
          }
          return newOrder;
        });
      }
      
      return newMap;
    });

    // Atualizar último ID
    if (newMessages.length > 0) {
      const last = newMessages[newMessages.length - 1];
      if (last) {
        lastMessageIdRef.current = last.id;
      }
    }

    // Se está no final, scrollar
    if (isAtBottomRef.current) {
      setTimeout(() => scrollToBottom(true), 50);
      setHasNewMessages(false);
      setNewMessagesCount(0);
    } else {
      setHasNewMessages(true);
      setNewMessagesCount(prev => prev + newMessages.length);
    }
  }, [scrollToBottom]);

  // CARREGAMENTO INICIAL
  const loadInitial = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log(`🔄 [useChat] Carregando mensagens iniciais para ${sessaoId}`);
      
      // NÃO limpar o cache aqui - o cache já pode ter dados
      const cached = chatService.getCachedMessages(sessaoId);
      
      if (cached.length > 0) {
        console.log(`📦 [useChat] Usando cache: ${cached.length} mensagens`);
        
        const newMap = new Map<string, Message>();
        const newOrder: string[] = [];
        
        for (const msg of cached) {
          newMap.set(msg.id, msg);
          newOrder.push(msg.id);
        }
        
        setMessagesMap(newMap);
        setMessagesOrder(newOrder);
        
        if (cached.length > 0) {
          lastMessageIdRef.current = cached[cached.length - 1].id;
        }
        
        setIsLoading(false);
        setTimeout(() => scrollToBottom(false), 50);
        return;
      }

      const messages = await chatService.loadInitialMessages(sessaoId);
      if (isMountedRef.current) {
        console.log(`✅ [useChat] ${messages.length} mensagens carregadas`);
        
        const newMap = new Map<string, Message>();
        const newOrder: string[] = [];
        
        for (const msg of messages) {
          newMap.set(msg.id, msg);
          newOrder.push(msg.id);
        }
        
        setMessagesMap(newMap);
        setMessagesOrder(newOrder);
        
        if (messages.length > 0) {
          lastMessageIdRef.current = messages[messages.length - 1].id;
        }
        
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

  // ATUALIZAÇÃO - Apenas adiciona mensagens novas
  const fetchNewMessages = useCallback(async () => {
    try {
      console.log(`🔄 [useChat] Verificando novas mensagens para ${sessaoId}`);
      
      const result = await chatService.fetchNewMessages(sessaoId);
      
      if (!isMountedRef.current) return;

      if (result.added.length > 0) {
        console.log(`🆕 [useChat] Adicionando ${result.added.length} novas mensagens`);
        
        // Adicionar apenas as mensagens novas ao Map
        addMessagesIncremental(result.added);
      } else {
        console.log(`ℹ️ [useChat] Nenhuma nova mensagem`);
      }
    } catch (error) {
      console.error('❌ [useChat] Erro ao buscar novas mensagens:', error);
    }
  }, [sessaoId, addMessagesIncremental]);

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
      console.log(`📤 [useChat] Enviando mensagem: "${texto}"`);
      
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        sessaoId,
        tipo: 'texto',
        conteudo: texto,
        remetente: 'atendente',
        dataHora: new Date().toISOString(),
        metadata: {}
      };

      // Adicionar mensagem otimista ao Map
      setMessagesMap(prev => {
        const newMap = new Map(prev);
        newMap.set(tempMessage.id, tempMessage);
        return newMap;
      });
      
      setMessagesOrder(prev => [...prev, tempMessage.id]);

      if (isAtBottomRef.current) {
        setTimeout(() => scrollToBottom(true), 50);
      }

      await chatService.sendMessage(sessaoId, texto);
      
      // Buscar novas mensagens para pegar o ID real
      console.log(`🔄 [useChat] Buscando atualizações após envio`);
      await fetchNewMessages();

    } catch (error) {
      console.error('❌ [useChat] Erro ao enviar mensagem:', error);
      await loadInitial();
    }
  }, [sessaoId, scrollToBottom, fetchNewMessages, loadInitial]);

  // Inicializar
  useEffect(() => {
    console.log(`🚀 [useChat] Inicializando chat para ${sessaoId}`);
    
    isMountedRef.current = true;
    
    // Resetar estado
    setMessagesMap(new Map());
    setMessagesOrder([]);
    lastMessageIdRef.current = null;
    
    // NÃO limpar o cache aqui - deixamos o cache persistir
    // chatService.clearCache(sessaoId); // REMOVER esta linha
    
    // Carregar mensagens
    loadInitial();

    // Configurar polling a cada 5 segundos
    intervalRef.current = setInterval(() => {
      console.log(`⏰ [useChat] Polling a cada 5s...`);
      fetchNewMessages();
    }, 5000);

    return () => {
      console.log(`🧹 [useChat] Limpando chat para ${sessaoId}`);
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessaoId, loadInitial, fetchNewMessages]);

  return {
    messages,
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