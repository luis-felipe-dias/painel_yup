import { useState, useEffect, useRef, useCallback } from 'react';
import { mensagensService } from '../services/mensagens.service';
import { Mensagem } from '../types/mensagens.types';

export function useMessages(sessaoId: string) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessages, setNewMessages] = useState<Mensagem[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Carregar mensagens iniciais
  const carregarInicial = useCallback(async () => {
    try {
      const data = await mensagensService.carregarInicial(sessaoId);
      if (isMountedRef.current) {
        setMensagens(data);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [sessaoId]);

  // Verificar novas mensagens (sem recarregar tudo)
  const verificarNovas = useCallback(async () => {
    try {
      const novas = await mensagensService.verificarNovas(sessaoId);
      
      if (isMountedRef.current && novas.length > 0) {
        // Atualizar estado com novas mensagens
        setMensagens(prev => {
          const novasUnicas = novas.filter(n => !prev.some(p => p.id === n.id));
          if (novasUnicas.length > 0) {
            setNewMessages(novasUnicas);
            return [...prev, ...novasUnicas];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Erro ao verificar novas mensagens:', error);
    }
  }, [sessaoId]);

  // Inicializar
  useEffect(() => {
    isMountedRef.current = true;
    
    // Carregar inicial
    carregarInicial();
    
    // Configurar verificação periódica
    intervalRef.current = setInterval(() => {
      verificarNovas();
    }, 5000);
    
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessaoId, carregarInicial, verificarNovas]);

  // Adicionar mensagem local (para envio otimista)
  const adicionarMensagemLocal = useCallback((mensagem: Mensagem) => {
    setMensagens(prev => {
      if (prev.some(m => m.id === mensagem.id)) {
        return prev;
      }
      return [...prev, mensagem];
    });
  }, []);

  // Limpar cache ao desmontar
  useEffect(() => {
    return () => {
      mensagensService.limparCache(sessaoId);
    };
  }, [sessaoId]);

  return {
    mensagens,
    isLoading,
    newMessages,
    adicionarMensagemLocal,
    carregarInicial,
    verificarNovas
  };
}