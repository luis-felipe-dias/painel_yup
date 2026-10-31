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

/**
 * crypto.randomUUID() SÓ existe em origem segura (https ou localhost).
 * O painel roda em http://2.25.147.117:3000, que é origem insegura — lá
 * a função é `undefined` e a chamada estourava TypeError DENTRO do catch
 * do fallback. Resultado: o erro escapava e a tela mostrava "não foi
 * possível salvar" mesmo com o modo local funcionando.
 */
function novoId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* ignora e usa o gerador abaixo */
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

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
    id: String(r._id ?? r.id ?? novoId()),
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

  /**
   * Quantas respostas existem só neste navegador (criadas em modo local).
   * Serve pra avisar que tem coisa pendente de subir pro Mongo.
   */
  pendentesLocais(): RespostaRapida[] {
    try {
      const bruto = localStorage.getItem(CHAVE_LOCAL);
      if (!bruto) return [];
      return JSON.parse(bruto).map(normalizar);
    } catch {
      return [];
    }
  },

  /**
   * Sobe pro Mongo tudo que foi cadastrado enquanto o servidor estava fora.
   * Sem isso, o que a equipe cadastrou em modo local morria no navegador
   * quando o server.js entrasse no ar.
   * Atalho que já existe no servidor é PULADO, nunca sobrescrito - quem
   * está no servidor é a versão combinada da equipe.
   */
  async migrarLocaisParaServidor(): Promise<{ enviadas: number; puladas: number; falhas: number }> {
    const locais = this.pendentesLocais();
    if (locais.length === 0) return { enviadas: 0, puladas: 0, falhas: 0 };

    const noServidor = await this.listar(true);
    if (modo !== "servidor") throw new Error("servidor indisponível");
    const existentes = new Set(noServidor.map((r) => r.atalho));

    let enviadas = 0, puladas = 0, falhas = 0;

    for (const r of locais) {
      if (existentes.has(r.atalho)) { puladas++; continue; }
      try {
        const { data } = await painelApi.post("/config/respostas-rapidas", {
          atalho: r.atalho,
          titulo: r.titulo,
          texto: r.texto,
          categoria: r.categoria,
          ativo: r.ativo,
          criadoPor: r.criadoPor,
        });
        if (data?.sucesso === true) { enviadas++; existentes.add(r.atalho); }
        else falhas++;
      } catch {
        falhas++;
      }
    }

    // Só limpa o navegador quando NADA falhou. Falhou uma, fica tudo
    // guardado - perder o rascunho da equipe é pior que repetir a migração.
    if (falhas === 0) {
      try { localStorage.removeItem(CHAVE_LOCAL); } catch { /* ignora */ }
    }
    this.invalidarCache();
    return { enviadas, puladas, falhas };
  },

  /** Backup em JSON - o arquivo que você guarda fora do banco. */
  async exportarJson(): Promise<string> {
    const lista = await this.listar(true);
    return JSON.stringify(
      {
        exportadoEm: new Date().toISOString(),
        origem: modo,
        total: lista.length,
        respostas: lista.map(({ id: _id, ...r }) => r),
      },
      null,
      2
    );
  },

  /**
   * Restaura de um backup. Atalho que já existe é pulado - importar nunca
   * apaga nem sobrescreve o que a equipe já tem.
   */
  async importarJson(texto: string): Promise<{ criadas: number; puladas: number; falhas: number }> {
    const bruto = JSON.parse(texto);
    const lista: any[] = Array.isArray(bruto) ? bruto : bruto?.respostas;
    if (!Array.isArray(lista)) throw new Error("arquivo sem a lista de respostas");

    const atuais = await this.listar(true);
    const existentes = new Set(atuais.map((r) => r.atalho));

    let criadas = 0, puladas = 0, falhas = 0;
    for (const item of lista) {
      const r = normalizar(item);
      if (!r.atalho || !r.texto) { falhas++; continue; }
      if (existentes.has(r.atalho)) { puladas++; continue; }
      try {
        const { id: _id, ...dados } = r;
        await this.criar(dados);
        existentes.add(r.atalho);
        criadas++;
      } catch {
        falhas++;
      }
    }
    this.invalidarCache();
    return { criadas, puladas, falhas };
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
      try {
        const nova = normalizar({ ...dados, id: novoId() });
        gravarLocal([...lerLocal(), nova]);
        return nova;
      } catch (e) {
        // Aqui é falha real do modo local (localStorage bloqueado, por
        // exemplo). Só nesse caso a tela deve avisar que não salvou.
        console.error("❌ Falha também no modo local:", e);
        throw e;
      }
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
