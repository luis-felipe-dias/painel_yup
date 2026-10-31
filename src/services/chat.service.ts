import { api } from './api/client';
import { Message } from '../types/chat.types';
import { adaptMensagens } from '../utils/adapters/mensagem.adapter';

/**
 * Cache e sincronização das mensagens de uma sessão.
 *
 * O que mudou nesta versão, e por quê:
 *
 * 1. ACABOU O PUB/SUB. Existiam dois caminhos para a mesma atualização:
 *    `updateCache` disparava `notifyUpdate` para callbacks registrados E o
 *    `useChat` ainda aplicava o diff retornado. Dois `setMessages` por
 *    ciclo, dois renders, e um `onUpdate` sem `offUpdate` que acumulava
 *    callback a cada montagem. Agora há um caminho só: quem chama recebe
 *    o diff e aplica.
 *
 * 2. ASSINATURA BARATA ANTES DO DIFF. A API não tem endpoint incremental,
 *    então o poll baixa tudo. Antes, a cada 5s, o cliente recalculava o
 *    hash de TODAS as mensagens da conversa. Numa conversa de 300
 *    mensagens isso é 300 hashes a cada 5 segundos, por conversa aberta —
 *    é o que ia deixando o painel pesado ao longo do expediente. Agora
 *    calcula uma assinatura barata primeiro (quantidade + marca da
 *    última mensagem); se não mudou nada, sai sem tocar em mapa nenhum.
 *
 * 3. MENSAGEM OTIMISTA COM RECONCILIAÇÃO. O id da mensagem é derivado da
 *    POSIÇÃO na lista (`sessaoId-index`, ver mensagem.adapter). Então um
 *    id inventado no cliente colide ou duplica, dependendo da ordem em
 *    que o servidor gravou. A mensagem otimista agora nasce marcada como
 *    `pendente` e é removida assim que a mensagem real equivalente chega.
 */

interface ChatCache {
  messages: Message[];
  messageMap: Map<string, Message>;
  messageHashes: Map<string, string>;
  lastMessageId: string | null;
  lastUpdate: number;
  sessaoId: string;
  isFirstLoad: boolean;
  lastIndex: number;
  /** Assinatura da última resposta da API — evita rediff desnecessário. */
  assinatura: string;
  /** Mensagens otimistas aguardando confirmação do servidor. */
  pendentes: Message[];
}

export interface DiffMensagens {
  added: Message[];
  updated: Message[];
  removed: string[];
  allMessages: Message[];
  /** true quando nada mudou — quem chama pode sair sem re-renderizar. */
  semMudanca: boolean;
}

const DIFF_VAZIO = (allMessages: Message[]): DiffMensagens => ({
  added: [],
  updated: [],
  removed: [],
  allMessages,
  semMudanca: true,
});

function gerarHashMensagem(msg: Message): string {
  const conteudo = msg.conteudo || '';
  const respondida = msg.respondida ? '1' : '0';
  const legenda = msg.metadata?.legenda || '';
  return `${conteudo}|${respondida}|${legenda}`.slice(0, 200);
}

/**
 * Assinatura da resposta inteira, em O(1) depois do map do adapter.
 * Quantidade + conteúdo da última mensagem cobre o caso real: chegou
 * mensagem nova, ou a última mudou de estado. Mudança no MEIO da conversa
 * (uma mensagem antiga marcada como respondida) escapa da assinatura, por
 * isso o diff completo roda de tempos em tempos — ver REDIFF_FORCADO_MS.
 */
function gerarAssinatura(mensagens: Message[]): string {
  if (mensagens.length === 0) return '0';
  const ultima = mensagens[mensagens.length - 1];
  return `${mensagens.length}|${ultima.id}|${gerarHashMensagem(ultima)}`;
}

const REDIFF_FORCADO_MS = 60_000;

class ChatCacheManager {
  private caches = new Map<string, ChatCache>();

  getOrCreate(sessaoId: string): ChatCache {
    if (!this.caches.has(sessaoId)) {
      this.caches.set(sessaoId, {
        messages: [],
        messageMap: new Map(),
        messageHashes: new Map(),
        lastMessageId: null,
        lastUpdate: 0,
        sessaoId,
        isFirstLoad: true,
        lastIndex: -1,
        assinatura: '',
        pendentes: [],
      });
    }
    return this.caches.get(sessaoId)!;
  }

  loadInitial(sessaoId: string, messages: Message[]): Message[] {
    const cache = this.getOrCreate(sessaoId);

    cache.messages = [...messages];
    cache.messageMap = new Map();
    cache.messageHashes = new Map();
    cache.lastIndex = -1;

    for (const msg of messages) {
      cache.messageMap.set(msg.id, msg);
      cache.messageHashes.set(msg.id, gerarHashMensagem(msg));
      if (msg.index !== undefined && msg.index > cache.lastIndex) {
        cache.lastIndex = msg.index;
      }
    }

    cache.lastMessageId = messages.length ? messages[messages.length - 1].id : null;
    cache.assinatura = gerarAssinatura(messages);
    cache.lastUpdate = Date.now();
    cache.isFirstLoad = false;
    cache.pendentes = [];

    return cache.messages;
  }

  updateCache(sessaoId: string, allApiMessages: Message[]): DiffMensagens {
    const cache = this.getOrCreate(sessaoId);

    if (cache.isFirstLoad) {
      return {
        added: allApiMessages,
        updated: [],
        removed: [],
        allMessages: this.loadInitial(sessaoId, allApiMessages),
        semMudanca: false,
      };
    }

    // Caminho rápido: nada mudou desde o último poll. É o caso em 90% dos
    // ciclos e antes custava um hash por mensagem.
    const assinatura = gerarAssinatura(allApiMessages);
    const precisaRediff = Date.now() - cache.lastUpdate > REDIFF_FORCADO_MS;
    if (assinatura === cache.assinatura && !precisaRediff) {
      return DIFF_VAZIO(cache.messages);
    }

    const added: Message[] = [];
    const updated: Message[] = [];
    const removed: string[] = [];

    const apiMap = new Map<string, Message>();
    for (const msg of allApiMessages) apiMap.set(msg.id, msg);

    for (const id of Array.from(cache.messageMap.keys())) {
      if (!apiMap.has(id)) {
        removed.push(id);
        cache.messageMap.delete(id);
        cache.messageHashes.delete(id);
      }
    }
    if (removed.length > 0) {
      const removeSet = new Set(removed);
      cache.messages = cache.messages.filter((m) => !removeSet.has(m.id));
    }

    for (const [id, msg] of apiMap) {
      const existing = cache.messageMap.get(id);
      if (!existing) {
        added.push(msg);
        cache.messageMap.set(id, msg);
        cache.messageHashes.set(id, gerarHashMensagem(msg));
        cache.messages.push(msg);
        if (msg.index !== undefined && msg.index > cache.lastIndex) {
          cache.lastIndex = msg.index;
        }
      } else {
        const novoHash = gerarHashMensagem(msg);
        if (cache.messageHashes.get(id) !== novoHash) {
          updated.push(msg);
          cache.messageMap.set(id, msg);
          cache.messageHashes.set(id, novoHash);
          const i = cache.messages.findIndex((m) => m.id === id);
          if (i !== -1) cache.messages[i] = msg;
        }
      }
    }

    // Reconciliação das otimistas: a real chegou, a provisória sai.
    const pendentesResolvidas = this.resolverPendentes(cache, added);

    cache.lastMessageId = allApiMessages.length
      ? allApiMessages[allApiMessages.length - 1].id
      : null;
    cache.assinatura = assinatura;
    cache.lastUpdate = Date.now();
    cache.messages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    const semMudanca =
      added.length === 0 &&
      updated.length === 0 &&
      removed.length === 0 &&
      pendentesResolvidas.length === 0;

    return {
      added,
      updated,
      removed: [...removed, ...pendentesResolvidas],
      allMessages: [...cache.messages],
      semMudanca,
    };
  }

  /**
   * Casa a mensagem otimista com a real. Casa por conteúdo + remetente,
   * não por id: o id real vem da posição na lista, que o cliente não tem
   * como adivinhar. Devolve os ids provisórios que devem sair da tela.
   */
  private resolverPendentes(cache: ChatCache, chegaram: Message[]): string[] {
    if (cache.pendentes.length === 0) return [];

    const resolvidos: string[] = [];
    const sobraram: Message[] = [];

    for (const pendente of cache.pendentes) {
      const casou = chegaram.some(
        (m) => m.remetente === 'atendente' && m.conteudo.trim() === pendente.conteudo.trim()
      );
      // 45s sem confirmação: tira da tela do mesmo jeito. Deixar a bolha
      // "fantasma" para sempre é pior do que sumir — o atendente reenvia.
      const expirou = Date.now() - new Date(pendente.dataHora).getTime() > 45_000;

      if (casou || expirou) {
        resolvidos.push(pendente.id);
      } else {
        sobraram.push(pendente);
      }
    }

    cache.pendentes = sobraram;
    return resolvidos;
  }

  registrarPendente(sessaoId: string, msg: Message) {
    this.getOrCreate(sessaoId).pendentes.push(msg);
  }

  getMessages(sessaoId: string): Message[] {
    const cache = this.caches.get(sessaoId);
    return cache ? [...cache.messages] : [];
  }

  getMessageMap(sessaoId: string): Map<string, Message> | null {
    return this.caches.get(sessaoId)?.messageMap ?? null;
  }

  isFirstLoad(sessaoId: string): boolean {
    return this.caches.get(sessaoId)?.isFirstLoad !== false;
  }

  /**
   * Libera memória de conversas que ninguém está olhando. O atendente abre
   * dezenas de conversas num expediente; sem isso, o cache de todas elas
   * fica vivo até o F5. Mantém as `manter` mais recentes.
   */
  podar(manter: number = 8) {
    if (this.caches.size <= manter) return;
    const porRecencia = Array.from(this.caches.entries()).sort(
      (a, b) => b[1].lastUpdate - a[1].lastUpdate
    );
    for (const [id] of porRecencia.slice(manter)) {
      this.caches.delete(id);
    }
  }

  clear(sessaoId?: string) {
    if (sessaoId) this.caches.delete(sessaoId);
    else this.caches.clear();
  }
}

export const chatCache = new ChatCacheManager();

export const chatService = {
  async loadInitialMessages(sessaoId: string): Promise<Message[]> {
    try {
      const response = await api.get(`/human/sessoes/${sessaoId}/mensagens`);
      const messages = adaptMensagens(response.data, sessaoId);
      const resultado = chatCache.loadInitial(sessaoId, messages);
      chatCache.podar();
      return resultado;
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens iniciais:', error);
      throw error;
    }
  },

  async fetchUpdates(sessaoId: string): Promise<DiffMensagens> {
    const response = await api.get(`/human/sessoes/${sessaoId}/mensagens`);
    const allApiMessages = adaptMensagens(response.data, sessaoId);
    return chatCache.updateCache(sessaoId, allApiMessages);
  },

  /**
   * Envia e devolve a mensagem otimista já registrada como pendente.
   * Não inventa id definitivo nem empurra nada para o array principal do
   * cache: era isso que fazia a mensagem aparecer duas vezes.
   */
  async sendMessage(sessaoId: string, texto: string): Promise<Message> {
    const otimista: Message = {
      id: `pendente-${sessaoId}-${Date.now()}`,
      sessaoId,
      tipo: 'texto',
      conteudo: texto,
      remetente: 'atendente',
      dataHora: new Date().toISOString(),
      metadata: {},
      index: Number.MAX_SAFE_INTEGER, // sempre no fim até o servidor confirmar
      respondida: true,
    };

    chatCache.registrarPendente(sessaoId, otimista);

    try {
      await api.post(`/human/sessoes/${sessaoId}/enviar`, { mensagem: texto });
      return otimista;
    } catch (error) {
      // Falhou: tira a pendente na hora, senão fica bolha de mensagem que
      // o cliente nunca recebeu.
      const cache = chatCache.getOrCreate(sessaoId);
      cache.pendentes = cache.pendentes.filter((m) => m.id !== otimista.id);
      throw error;
    }
  },

  getCachedMessages(sessaoId: string): Message[] {
    return chatCache.getMessages(sessaoId);
  },

  getMessageMap(sessaoId: string): Map<string, Message> | null {
    return chatCache.getMessageMap(sessaoId);
  },

  isFirstLoad(sessaoId: string): boolean {
    return chatCache.isFirstLoad(sessaoId);
  },

  clearCache(sessaoId?: string) {
    chatCache.clear(sessaoId);
  },
};
