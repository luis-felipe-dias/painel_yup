import { painelApi } from "./api/client";
import { RespostaRapida } from "../types/respostaRapida.types";

/**
 * Respostas rápidas devem ficar no Mongo do painel (coleção
 * `respostas_rapidas`), porque com vários atendentes no mesmo número a lista
 * precisa ser a mesma para todo mundo.
 *
 * MAS: enquanto o `server.js` novo não estiver publicado e reiniciado no
 * servidor, as rotas /config/* não existem lá. O Express cai no catch-all
 * do SPA e devolve o index.html com status 200 — ou seja, uma resposta
 * "de sucesso" que na verdade é HTML. É exatamente isso que fazia a lista
 * voltar vazia e o salvar falhar sem explicação.
 *
 * Por isso este serviço:
 *  1. detecta a resposta falsa (HTML em vez de JSON) e marca modo LOCAL;
 *  2. cai para localStorage para a equipe não ficar travada;
 *  3. avisa a tela, que mostra o aviso de que ainda não está compartilhado.
 */

const CHAVE_LOCAL = "yup:respostas_rapidas";
const CACHE_MS = 60_000;

let cache: RespostaRapida[] | null = null;
let cacheEm = 0;

export type ModoArmazenamento = "servidor" | "local" | "desconhecido";
let modo: ModoArmazenamento = "desconhecido";

export function getModoArmazenamento(): ModoArmazenamento {
  return modo;
}

/** O catch-all do SPA devolve HTML com 200. Isso não é resposta de API. */
function respostaValida(data: any): boolean {
  if (typeof data === "string") return false;
  return data && typeof data === "object" && Array.isArray(data.respostas);
}

function normalizar(r: any): RespostaRapida {
  return {
    id: String(r._id ?? r.id ?? crypto.randomUUID()),
    atalho: String(r.atalho ?? "").replace(/^\//, "").toLowerCase(),
    titulo: r.titulo ?? "",
    texto: r.texto ?? "",
    categoria: r.categoria ?? "Geral",
    ativo: r.ativo !== false,
    criadoPor: r.criadoPor,
    atualizadoEm: r.atualizadoEm,
  };
}

/** Sugestões que aparecem na primeira vez, para a tela não nascer vazia. */
const PADRAO: RespostaRapida[] = [
  {
    id: "seed-saudacao",
    atalho: "oi",
    titulo: "Saudação",
    texto: "{saudacao}, {primeiro_nome}! Aqui é a Yup 💙 Como posso ajudar?",
    categoria: "Saudação",
    ativo: true,
  },
  {
    id: "seed-horario",
    atalho: "horario",
    titulo: "Horário de funcionamento",
    texto:
      "Nosso horário é de segunda a sexta, das 8h às 18h, e sábado das 8h às 13h. Estamos na Av. Salime Nacif, 222 — Baixada, Manhuaçu 💙",
    categoria: "Geral",
    ativo: true,
  },
  {
    id: "seed-obrigado",
    atalho: "obrigado",
    titulo: "Agradecimento / encerramento",
    texto:
      "Obrigada pela preferência, {primeiro_nome}! Qualquer coisa é só chamar aqui 💙",
    categoria: "Encerramento",
    ativo: true,
  },
];

function lerLocal(): RespostaRapida[] {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCAL);
    if (!bruto) return PADRAO.map(normalizar);
    return JSON.parse(bruto).map(normalizar);
  } catch {
    return PADRAO.map(normalizar);
  }
}

function gravarLocal(lista: RespostaRapida[]) {
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(lista));
  } catch {
    /* cota cheia ou modo privado - nada a fazer */
  }
  cache = lista;
  cacheEm = Date.now();
}

export const respostasRapidasService = {
  invalidarCache() {
    cache = null;
  },

  async listar(forcar = false): Promise<RespostaRapida[]> {
    if (!forcar && cache && Date.now() - cacheEm < CACHE_MS) return cache;

    try {
      const { data } = await painelApi.get("/config/respostas-rapidas");
      if (!respostaValida(data)) throw new Error("rota ausente no servidor");
      modo = "servidor";
      cache = data.respostas.map(normalizar);
      cacheEm = Date.now();
      return cache!;
    } catch {
      modo = "local";
      cache = lerLocal();
      cacheEm = Date.now();
      return cache;
    }
  },

  /** Busca por atalho, título ou trecho do texto — o que o "/" usa. */
  async buscar(termo: string): Promise<RespostaRapida[]> {
    const todas = (await this.listar()).filter((r) => r.ativo);
    const t = termo.trim().toLowerCase();
    if (!t) return todas;

    const pontua = (r: RespostaRapida) => {
      if (r.atalho === t) return 0;
      if (r.atalho.startsWith(t)) return 1;
      if (r.titulo.toLowerCase().includes(t)) return 2;
      if (r.texto.toLowerCase().includes(t)) return 3;
      return 99;
    };

    return todas
      .map((r) => ({ r, p: pontua(r) }))
      .filter((x) => x.p < 99)
      .sort((a, b) => a.p - b.p || a.r.atalho.localeCompare(b.r.atalho))
      .map((x) => x.r);
  },

  async criar(dados: Omit<RespostaRapida, "id">): Promise<RespostaRapida> {
    try {
      const { data } = await painelApi.post("/config/respostas-rapidas", dados);
      if (!data || typeof data !== "object" || data.sucesso !== true) {
        throw new Error("rota ausente no servidor");
      }
      modo = "servidor";
      this.invalidarCache();
      return normalizar(data.resposta ?? dados);
    } catch {
      modo = "local";
      const nova = normalizar({ ...dados, id: crypto.randomUUID() });
      gravarLocal([...lerLocal(), nova]);
      return nova;
    }
  },

  async atualizar(id: string, dados: Partial<RespostaRapida>): Promise<void> {
    try {
      const { data } = await painelApi.put(`/config/respostas-rapidas/${id}`, dados);
      if (!data || typeof data !== "object" || data.sucesso !== true) {
        throw new Error("rota ausente no servidor");
      }
      modo = "servidor";
      this.invalidarCache();
    } catch {
      modo = "local";
      gravarLocal(lerLocal().map((r) => (r.id === id ? { ...r, ...dados } : r)));
    }
  },

  async remover(id: string): Promise<void> {
    try {
      const { data } = await painelApi.delete(`/config/respostas-rapidas/${id}`);
      if (!data || typeof data !== "object" || data.sucesso !== true) {
        throw new Error("rota ausente no servidor");
      }
      modo = "servidor";
      this.invalidarCache();
    } catch {
      modo = "local";
      gravarLocal(lerLocal().filter((r) => r.id !== id));
    }
  },
};
