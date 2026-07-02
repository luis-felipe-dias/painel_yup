import { api } from './api/client';
import { Message } from '../types/chat.types';
import { adaptMensagens } from '../utils/adapters/mensagem.adapter';

interface ChatCache {
  messages: Message[];
  messageIds: Set<string>;
  lastMessageId: string | null;
  lastUpdate: number;
  sessaoId: string;
  isFirstLoad: boolean;
  lastIndex: number; // Último índice conhecido
}

class ChatCacheManager {
  private caches = new Map<string, ChatCache>();

  getOrCreate(sessaoId: string): ChatCache {
    if (!this.caches.has(sessaoId)) {
      console.log(`🆕 Criando novo cache para ${sessaoId}`);
      this.caches.set(sessaoId, {
        messages: [],
        messageIds: new Set(),
        lastMessageId: null,
        lastUpdate: 0,
        sessaoId,
        isFirstLoad: true,
        lastIndex: -1
      });
    }
    return this.caches.get(sessaoId)!;
  }

  loadInitial(sessaoId: string, messages: Message[]): Message[] {
    const cache = this.getOrCreate(sessaoId);
    
    cache.messages = [];
    cache.messageIds = new Set();
    
    for (const msg of messages) {
      cache.messages.push(msg);
      cache.messageIds.add(msg.id);
      if (msg.index !== undefined && msg.index > cache.lastIndex) {
        cache.lastIndex = msg.index;
      }
    }
    
    if (messages.length > 0) {
      cache.lastMessageId = messages[messages.length - 1].id;
    }
    cache.lastUpdate = Date.now();
    cache.isFirstLoad = false;
    
    console.log(`📦 Cache inicial: ${cache.messages.length} mensagens`);
    console.log(`📦 Último índice: ${cache.lastIndex}`);
    return cache.messages;
  }

  updateCache(sessaoId: string, allApiMessages: Message[]): { added: Message[]; allMessages: Message[] } {
    const cache = this.getOrCreate(sessaoId);
    
    if (cache.isFirstLoad) {
      return { 
        added: allApiMessages, 
        allMessages: this.loadInitial(sessaoId, allApiMessages) 
      };
    }

    const added: Message[] = [];
    const existingIds = cache.messageIds;
    
    console.log(`📊 Cache atual: ${cache.messages.length} mensagens`);
    console.log(`📊 Último índice conhecido: ${cache.lastIndex}`);
    console.log(`📊 API retornou ${allApiMessages.length} mensagens`);
    
    // Identificar mensagens novas - PELO ÍNDICE
    for (const msg of allApiMessages) {
      // Se o índice da mensagem é maior que o último índice conhecido, é nova
      if (msg.index !== undefined && msg.index > cache.lastIndex) {
        if (!existingIds.has(msg.id)) {
          added.push(msg);
          cache.messages.push(msg);
          cache.messageIds.add(msg.id);
          console.log(`🆕 Nova mensagem índice ${msg.index}: ${msg.id}`);
        }
      }
    }

    // Atualizar último índice
    if (allApiMessages.length > 0) {
      const last = allApiMessages[allApiMessages.length - 1];
      if (last && last.index !== undefined && last.index > cache.lastIndex) {
        cache.lastIndex = last.index;
        cache.lastMessageId = last.id;
      }
    }
    
    if (added.length > 0) {
      cache.lastUpdate = Date.now();
      console.log(`✅ ${added.length} novas mensagens adicionadas`);
      console.log(`📦 Cache agora tem ${cache.messages.length} mensagens`);
      console.log(`📦 Último índice: ${cache.lastIndex}`);
    } else {
      console.log(`ℹ️ Nenhuma nova mensagem (índice ${cache.lastIndex} é o mais recente)`);
    }

    return { added, allMessages: [...cache.messages] };
  }

  getMessages(sessaoId: string): Message[] {
    const cache = this.caches.get(sessaoId);
    return cache ? [...cache.messages] : [];
  }

  getLastId(sessaoId: string): string | null {
    const cache = this.caches.get(sessaoId);
    return cache?.lastMessageId || null;
  }

  isFirstLoad(sessaoId: string): boolean {
    const cache = this.caches.get(sessaoId);
    return cache?.isFirstLoad !== false;
  }

  clear(sessaoId?: string) {
    if (sessaoId) {
      console.log(`🗑️ Limpando cache para ${sessaoId}`);
      this.caches.delete(sessaoId);
    } else {
      console.log(`🗑️ Limpando todos os caches`);
      this.caches.clear();
    }
  }
}

export const chatCache = new ChatCacheManager();

export const chatService = {
  async loadInitialMessages(sessaoId: string): Promise<Message[]> {
    try {
      console.log(`📡 Carregando mensagens iniciais para ${sessaoId}`);
      const response = await api.get(`/human/sessoes/${sessaoId}/mensagens`);
      const messages = adaptMensagens(response.data, sessaoId);
      const cached = chatCache.loadInitial(sessaoId, messages);
      console.log(`✅ ${cached.length} mensagens carregadas`);
      return cached;
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens iniciais:', error);
      return chatCache.getMessages(sessaoId);
    }
  },

  async fetchNewMessages(sessaoId: string): Promise<{ added: Message[]; allMessages: Message[] }> {
    try {
      console.log(`🔍 Buscando novas mensagens para ${sessaoId}...`);
      
      const response = await api.get(`/human/sessoes/${sessaoId}/mensagens`);
      const allApiMessages = adaptMensagens(response.data, sessaoId);
      
      console.log(`📊 API retornou ${allApiMessages.length} mensagens`);
      
      return chatCache.updateCache(sessaoId, allApiMessages);
      
    } catch (error) {
      console.error('❌ Erro ao buscar novas mensagens:', error);
      return { added: [], allMessages: chatCache.getMessages(sessaoId) };
    }
  },

  async sendMessage(sessaoId: string, texto: string): Promise<Message | null> {
    try {
      console.log(`📤 Enviando mensagem para ${sessaoId}: "${texto}"`);
      
      const response = await api.post(`/human/sessoes/${sessaoId}/enviar`, {
        mensagem: texto
      });
      
      if (response.data) {
        const cache = chatCache.getOrCreate(sessaoId);
        const nextIndex = cache.lastIndex + 1;
        
        const tempMessage: Message = {
          id: `${sessaoId}-${nextIndex}`,
          sessaoId,
          tipo: 'texto',
          conteudo: texto,
          remetente: 'atendente',
          dataHora: new Date().toISOString(),
          metadata: {},
          index: nextIndex
        };
        
        cache.messages.push(tempMessage);
        cache.messageIds.add(tempMessage.id);
        cache.lastMessageId = tempMessage.id;
        cache.lastIndex = nextIndex;
        
        console.log(`✅ Mensagem enviada com sucesso (índice ${nextIndex})`);
        return tempMessage;
      }
      return null;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      throw error;
    }
  },

  getCachedMessages(sessaoId: string): Message[] {
    return chatCache.getMessages(sessaoId);
  },

  clearCache(sessaoId?: string) {
    chatCache.clear(sessaoId);
  }
};