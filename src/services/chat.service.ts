import { api } from './api/client';
import { Message } from '../types/chat.types';
import { adaptMensagens } from '../utils/adapters/mensagem.adapter';

interface ChatCache {
  messages: Message[];
  messageMap: Map<string, Message>; // Para busca rápida por ID
  lastMessageId: string | null;
  lastUpdate: number;
  sessaoId: string;
  isFirstLoad: boolean;
  lastIndex: number;
  messageHashes: Map<string, string>; // Hash do conteúdo para detectar mudanças
}

// Função para gerar hash simples do conteúdo da mensagem
function gerarHashMensagem(msg: Message): string {
  // Considerar conteúdo, respondida e metadados relevantes
  const conteudo = msg.conteudo || '';
  const respondida = msg.respondida ? '1' : '0';
  const legenda = msg.metadata?.legenda || '';
  return `${conteudo}|${respondida}|${legenda}`.slice(0, 200);
}

class ChatCacheManager {
  private caches = new Map<string, ChatCache>();
  private updateCallbacks: Map<string, ((diff: any) => void)[]> = new Map();

  getOrCreate(sessaoId: string): ChatCache {
    if (!this.caches.has(sessaoId)) {
      console.log(`🆕 Criando novo cache para ${sessaoId}`);
      this.caches.set(sessaoId, {
        messages: [],
        messageMap: new Map(),
        messageHashes: new Map(),
        lastMessageId: null,
        lastUpdate: 0,
        sessaoId,
        isFirstLoad: true,
        lastIndex: -1
      });
    }
    return this.caches.get(sessaoId)!;
  }

  // Registrar callback para mudanças
  onUpdate(sessaoId: string, callback: (diff: any) => void) {
    if (!this.updateCallbacks.has(sessaoId)) {
      this.updateCallbacks.set(sessaoId, []);
    }
    this.updateCallbacks.get(sessaoId)!.push(callback);
  }

  // Notificar mudanças
  private notifyUpdate(sessaoId: string, diff: any) {
    const callbacks = this.updateCallbacks.get(sessaoId) || [];
    for (const cb of callbacks) {
      try {
        cb(diff);
      } catch (e) {
        console.error('Erro no callback de atualização:', e);
      }
    }
  }

  loadInitial(sessaoId: string, messages: Message[]): Message[] {
    const cache = this.getOrCreate(sessaoId);
    
    cache.messages = [];
    cache.messageMap = new Map();
    cache.messageHashes = new Map();
    
    for (const msg of messages) {
      cache.messages.push(msg);
      cache.messageMap.set(msg.id, msg);
      cache.messageHashes.set(msg.id, gerarHashMensagem(msg));
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

  // Atualizar cache com diff detalhado
  updateCache(sessaoId: string, allApiMessages: Message[]): { 
    added: Message[]; 
    updated: Message[]; 
    removed: string[];
    allMessages: Message[];
  } {
    const cache = this.getOrCreate(sessaoId);
    
    if (cache.isFirstLoad) {
      return { 
        added: allApiMessages, 
        updated: [],
        removed: [],
        allMessages: this.loadInitial(sessaoId, allApiMessages) 
      };
    }

    const added: Message[] = [];
    const updated: Message[] = [];
    const removed: string[] = [];
    
    // Criar mapa das mensagens da API
    const apiMap = new Map<string, Message>();
    for (const msg of allApiMessages) {
      apiMap.set(msg.id, msg);
    }
    
    // 1. Verificar mensagens removidas
    const currentIds = new Set(cache.messageMap.keys());
    const newIds = new Set(apiMap.keys());
    
    for (const id of currentIds) {
      if (!newIds.has(id)) {
        removed.push(id);
        cache.messageMap.delete(id);
        cache.messageHashes.delete(id);
      }
    }
    
    // Remover do array de mensagens
    if (removed.length > 0) {
      const removeSet = new Set(removed);
      cache.messages = cache.messages.filter(m => !removeSet.has(m.id));
    }
    
    // 2. Verificar mensagens adicionadas ou atualizadas
    for (const [id, msg] of apiMap) {
      const existing = cache.messageMap.get(id);
      if (!existing) {
        // Nova mensagem
        added.push(msg);
        cache.messageMap.set(id, msg);
        cache.messageHashes.set(id, gerarHashMensagem(msg));
        cache.messages.push(msg);
        if (msg.index !== undefined && msg.index > cache.lastIndex) {
          cache.lastIndex = msg.index;
        }
      } else {
        // Verificar se houve mudança no conteúdo
        const oldHash = cache.messageHashes.get(id) || '';
        const newHash = gerarHashMensagem(msg);
        
        if (oldHash !== newHash) {
          // Mensagem foi atualizada (ex: respondida mudou de false para true)
          updated.push(msg);
          cache.messageMap.set(id, msg);
          cache.messageHashes.set(id, newHash);
          
          // Atualizar no array
          const index = cache.messages.findIndex(m => m.id === id);
          if (index !== -1) {
            cache.messages[index] = msg;
          }
          console.log(`🔄 Mensagem ${id} foi atualizada`);
        }
      }
    }

    // Atualizar último ID
    if (allApiMessages.length > 0) {
      const last = allApiMessages[allApiMessages.length - 1];
      if (last) {
        cache.lastMessageId = last.id;
      }
    }
    cache.lastUpdate = Date.now();
    
    // Ordenar mensagens por índice
    cache.messages.sort((a, b) => (a.index || 0) - (b.index || 0));
    
    const diff = { added, updated, removed, allMessages: [...cache.messages] };
    
    if (added.length > 0 || updated.length > 0 || removed.length > 0) {
      console.log(`📊 Diff: +${added.length} novas, ~${updated.length} atualizadas, -${removed.length} removidas`);
      console.log(`📦 Cache agora tem ${cache.messages.length} mensagens`);
      
      // Notificar mudanças
      this.notifyUpdate(sessaoId, diff);
    } else {
      console.log(`ℹ️ Nenhuma mudança detectada`);
    }

    return diff;
  }

  getMessages(sessaoId: string): Message[] {
    const cache = this.caches.get(sessaoId);
    return cache ? [...cache.messages] : [];
  }

  getMessageMap(sessaoId: string): Map<string, Message> | null {
    const cache = this.caches.get(sessaoId);
    return cache ? cache.messageMap : null;
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
      this.caches.delete(sessaoId);
      this.updateCallbacks.delete(sessaoId);
    } else {
      this.caches.clear();
      this.updateCallbacks.clear();
    }
  }
}

export const chatCache = new ChatCacheManager();

export const chatService = {
  // Carregar mensagens iniciais
  async loadInitialMessages(sessaoId: string): Promise<Message[]> {
    try {
      console.log(`📡 Carregando mensagens iniciais para ${sessaoId}`);
      const startTime = Date.now();
      
      const response = await api.get(`/human/sessoes/${sessaoId}/mensagens`);
      const messages = adaptMensagens(response.data, sessaoId);
      
      console.log(`⏱️ API respondeu em ${Date.now() - startTime}ms`);
      
      const cached = chatCache.loadInitial(sessaoId, messages);
      console.log(`✅ ${cached.length} mensagens carregadas`);
      return cached;
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens iniciais:', error);
      return chatCache.getMessages(sessaoId);
    }
  },

  // Buscar atualizações com diff
  async fetchUpdates(sessaoId: string): Promise<{ 
    added: Message[]; 
    updated: Message[]; 
    removed: string[];
    allMessages: Message[];
  }> {
    try {
      console.log(`🔍 Buscando atualizações para ${sessaoId}...`);
      const startTime = Date.now();
      
      const response = await api.get(`/human/sessoes/${sessaoId}/mensagens`);
      const allApiMessages = adaptMensagens(response.data, sessaoId);
      
      console.log(`⏱️ API respondeu em ${Date.now() - startTime}ms`);
      console.log(`📊 API retornou ${allApiMessages.length} mensagens`);
      
      return chatCache.updateCache(sessaoId, allApiMessages);
      
    } catch (error) {
      console.error('❌ Erro ao buscar atualizações:', error);
      return { added: [], updated: [], removed: [], allMessages: chatCache.getMessages(sessaoId) };
    }
  },

  // Enviar mensagem
  async sendMessage(sessaoId: string, texto: string): Promise<Message | null> {
    try {
      console.log(`📤 Enviando mensagem para ${sessaoId}: "${texto.substring(0, 30)}..."`);
      
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
          index: nextIndex,
          respondida: true
        };
        
        cache.messages.push(tempMessage);
        cache.messageMap.set(tempMessage.id, tempMessage);
        cache.messageHashes.set(tempMessage.id, gerarHashMensagem(tempMessage));
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

  // Registrar callback para mudanças
  onUpdate(sessaoId: string, callback: (diff: any) => void) {
    chatCache.onUpdate(sessaoId, callback);
  },

  getCachedMessages(sessaoId: string): Message[] {
    return chatCache.getMessages(sessaoId);
  },

  getMessageMap(sessaoId: string): Map<string, Message> | null {
    return chatCache.getMessageMap(sessaoId);
  },

  clearCache(sessaoId?: string) {
    chatCache.clear(sessaoId);
  }
};