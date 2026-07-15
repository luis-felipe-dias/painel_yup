import React, { createContext, useContext, useState, useCallback } from 'react';
import { Mensagem } from '../types/mensagens.types';

interface MessageSelectionContextType {
  mensagensSelecionadas: Mensagem[];
  toggleMensagem: (mensagem: Mensagem) => void;
  limparSelecao: () => void;
  removerMensagem: (id: string) => void;
  adicionarMensagem: (mensagem: Mensagem) => void;
  totalSelecionadas: number;
}

const MessageSelectionContext = createContext<MessageSelectionContextType | undefined>(undefined);

export const MessageSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mensagensSelecionadas, setMensagensSelecionadas] = useState<Mensagem[]>([]);

  const toggleMensagem = useCallback((mensagem: Mensagem) => {
    setMensagensSelecionadas(prev => {
      const exists = prev.some(m => m.id === mensagem.id);
      if (exists) {
        return prev.filter(m => m.id !== mensagem.id);
      } else {
        return [...prev, mensagem];
      }
    });
  }, []);

  const limparSelecao = useCallback(() => {
    setMensagensSelecionadas([]);
  }, []);

  const removerMensagem = useCallback((id: string) => {
    setMensagensSelecionadas(prev => prev.filter(m => m.id !== id));
  }, []);

  const adicionarMensagem = useCallback((mensagem: Mensagem) => {
    setMensagensSelecionadas(prev => {
      const exists = prev.some(m => m.id === mensagem.id);
      if (!exists) {
        return [...prev, mensagem];
      }
      return prev;
    });
  }, []);

  const totalSelecionadas = mensagensSelecionadas.length;

  return (
    <MessageSelectionContext.Provider value={{
      mensagensSelecionadas,
      toggleMensagem,
      limparSelecao,
      removerMensagem,
      adicionarMensagem,
      totalSelecionadas
    }}>
      {children}
    </MessageSelectionContext.Provider>
  );
};

export const useMessageSelection = () => {
  const context = useContext(MessageSelectionContext);
  if (!context) {
    throw new Error('useMessageSelection must be used within MessageSelectionProvider');
  }
  return context;
};