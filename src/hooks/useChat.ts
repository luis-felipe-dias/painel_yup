import { useState, useEffect, useRef, useCallback } from 'react';
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

const POLL_MS = 5000;
/** Teto do backoff: 12 ciclos de 5s = 1 minuto entre tentativas. */
const CICLOS_PULADOS_MAX = 12;

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
  const errosSeguidosRef = useRef(0);
  const ciclosPulandoRef = useRef(0);

  const scrollToBottom = useCallback((smooth: boolean = true) => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });

    isAtBottomRef.current = true;
    setHasNewMessages(false);
    setNewMessagesCount(0);
  }, []);

  /**
   * Aplica o diff. Agora existe UM caminho só: antes o chat.service também
   * notificava callbacks registrados, então o mesmo diff era aplicado duas
   * vezes por ciclo — dois renders e dois scrolls para cada mensagem.
   */
  const aplicarDiff = useCallback(
    (diff: {
      added: Message[];
      updated: Message[];
      removed: string[];
      semMudanca?: boolean;
    }) => {
      if (!isMountedRef.current || diff.semMudanca) return;

      setMessages((prev) => {
        let lista = prev;

        if (diff.removed.length > 0) {
          const fora = new Set(diff.removed);
          lista = lista.filter((m) => !fora.has(m.id));
        }

        if (diff.updated.length > 0) {
          const mapa = new Map(diff.updated.map((m) => [m.id, m]));
          lista = lista.map((m) => mapa.get(m.id) ?? m);
        }

        if (diff.added.length > 0) {
          const jaTem = new Set(lista.map((m) => m.id));
          const novas = diff.added.filter((m) => !jaTem.has(m.id));
          if (novas.length > 0) {
            lista = [...lista, ...novas];
            if (!isAtBottomRef.current) {
              const doCliente = novas.filter((m) => m.remetente !== 'atendente').length;
              if (doCliente > 0) {
                setHasNewMessages(true);
                setNewMessagesCount((n) => n + doCliente);
              }
            }
          }
        }

        if (lista === prev) return prev; // nada mudou: não re-renderiza
        return [...lista].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      });

      if (isAtBottomRef.current && (diff.added.length > 0 || diff.removed.length > 0)) {
        requestAnimationFrame(() => scrollToBottom(true));
      }
    },
    [scrollToBottom]
  );

  /**
   * Abertura da conversa. Se o cache já tem a conversa, pinta na hora e
   * atualiza por trás. Antes o cache era APAGADO logo antes desta função,
   * então toda abertura baixava a conversa inteira do zero — era a trava
   * ao clicar no cliente.
   */
  const carregarInicial = useCallback(async () => {
    const cache = chatService.getCachedMessages(sessaoId);

    if (cache.length > 0) {
      setMessages(cache);
      setIsLoading(false);
      setError(null);
      requestAnimationFrame(() => scrollToBottom(false));
      return;
    }

    setIsLoading(true);
    try {
      const lista = await chatService.loadInitialMessages(sessaoId);
      if (!isMountedRef.current) return;
      setMessages(lista);
      setError(null);
      setIsLoading(false);
      requestAnimationFrame(() => scrollToBottom(false));
    } catch {
      if (!isMountedRef.current) return;
      setError('Não foi possível carregar as mensagens desta conversa.');
      setIsLoading(false);
    }
  }, [sessaoId, scrollToBottom]);

  const buscarAtualizacoes = useCallback(async () => {
    if (isUpdatingRef.current || !isMountedRef.current) return;

    isUpdatingRef.current = true;
    try {
      const diff = await chatService.fetchUpdates(sessaoId);
      if (!isMountedRef.current) return;
      errosSeguidosRef.current = 0;
      ciclosPulandoRef.current = 0;
      if (error) setError(null);
      aplicarDiff(diff);
    } catch {
      errosSeguidosRef.current += 1;
      // Backoff: o servidor caiu, não adianta bater de 5 em 5 segundos.
      // 1 erro = pula 1 ciclo, 2 = pula 2, 3 = pula 4... até 12 (1 min).
      ciclosPulandoRef.current = Math.min(2 ** (errosSeguidosRef.current - 1), CICLOS_PULADOS_MAX);
      if (errosSeguidosRef.current >= 3 && isMountedRef.current) {
        setError('Sem conexão com o servidor de mensagens. Tentando de novo...');
      }
    } finally {
      isUpdatingRef.current = false;
    }
  }, [sessaoId, aplicarDiff, error]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const noFim = scrollHeight - scrollTop - clientHeight < 50;
    isAtBottomRef.current = noFim;

    if (noFim) {
      setHasNewMessages(false);
      setNewMessagesCount(0);
    }
  }, []);

  const sendMessage = useCallback(
    async (texto: string) => {
      const limpo = texto.trim();
      if (!limpo) return;

      try {
        // A mensagem otimista vem do service já registrada como pendente,
        // e some sozinha quando a real chega. Antes eram DUAS otimistas
        // (uma aqui, outra no service) e nenhuma era removida: era a causa
        // de a mensagem aparecer duplicada no envio.
        const otimista = await chatService.sendMessage(sessaoId, limpo);

        if (!isMountedRef.current) return;
        setMessages((prev) => [...prev, otimista]);
        if (isAtBottomRef.current) {
          requestAnimationFrame(() => scrollToBottom(true));
        }

        await buscarAtualizacoes();
      } catch (err) {
        if (isMountedRef.current) {
          setError('A mensagem não foi enviada. Tente de novo.');
        }
        throw err;
      }
    },
    [sessaoId, scrollToBottom, buscarAtualizacoes]
  );

  useEffect(() => {
    isMountedRef.current = true;
    errosSeguidosRef.current = 0;
    ciclosPulandoRef.current = 0;
    carregarInicial();

    // Um intervalo só, de 5s, com duas regras de economia:
    //  - aba escondida não busca nada (o atendente não está olhando);
    //  - depois de erro, pula ciclos em progressão (backoff) em vez de
    //    bater no servidor caído a cada 5 segundos.
    const tick = () => {
      if (document.visibilityState === 'hidden') return;
      if (ciclosPulandoRef.current > 0) {
        ciclosPulandoRef.current -= 1;
        return;
      }
      buscarAtualizacoes();
    };

    intervalRef.current = setInterval(tick, POLL_MS);

    // Voltou para a aba: atualiza na hora, sem esperar o próximo ciclo.
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') {
        ciclosPulandoRef.current = 0;
        buscarAtualizacoes();
      }
    };
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', aoVoltar);
      isUpdatingRef.current = false;
      // O cache NÃO é apagado aqui de propósito: é ele que faz a conversa
      // reabrir instantânea. A limpeza é por recência, no chatCache.podar().
    };
  }, [sessaoId, carregarInicial, buscarAtualizacoes]);

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
    scrollToBottom,
  };
}
