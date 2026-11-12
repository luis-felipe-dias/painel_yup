import { api, painelApi } from "./api/client";
import type {
  ItemApurado,
  RespostaAjuste,
  RespostaBipe,
  RespostaDetalhe,
  RespostaDivergencias,
  RespostaFinalizar,
  RespostaIniciar,
  RespostaDrive,
  NomePlanilha,
  Sessao,
} from "../types/contagem.types";

/**
 * Conferência de estoque.
 *
 * Duas APIs diferentes, de propósito:
 *  - backend-yup (FastAPI) guarda a conferência e consulta o Olist ao vivo;
 *  - server.js do painel é quem conhece a senha de 4 dígitos do atendente.
 *
 * A senha NUNCA vai para o backend-yup. Ele não tem autenticação; mandar
 * senha para lá seria espalhar credencial sem ganho nenhum. O painel
 * verifica, recebe o nome, e manda só o nome adiante.
 */
const BASE = import.meta.env.VITE_API_ESTOQUE_URL || "https://api.nowlords.com.br";
const CONTAGEM = `${BASE}/contagem`;

export interface OperadorIdentificado {
  id: string;
  nome: string;
}

export const contagemService = {
  /**
   * Troca a senha de 4 dígitos pelo nome da pessoa.
   * É a MESMA senha que abre as conversas — ninguém decora um segundo código.
   */
  async identificar(senha: string): Promise<{ ok: boolean; operador?: OperadorIdentificado; erro?: string }> {
    try {
      const { data } = await painelApi.post("/auth/atendente/verificar-senha", { senha });
      if (!data?.success || !data?.atendente?._id) {
        return { ok: false, erro: data?.message || "Senha não reconhecida" };
      }
      return { ok: true, operador: { id: data.atendente._id, nome: data.atendente.nome } };
    } catch (e: any) {
      return { ok: false, erro: e?.response?.data?.message || "Não deu para verificar a senha agora" };
    }
  },

  async motivos(): Promise<string[]> {
    try {
      const { data } = await api.get(`${CONTAGEM}/motivos`);
      return data?.motivos ?? [];
    } catch {
      return [];
    }
  },

  /** Conferência que a pessoa deixou aberta. Evita contar o mesmo setor duas vezes pela metade. */
  async sessaoAberta(operadorId: string): Promise<Sessao | null> {
    try {
      const { data } = await api.get(`${CONTAGEM}/sessoes/aberta/${operadorId}`);
      return data?.sessao ?? null;
    } catch {
      return null;
    }
  },

  async iniciar(p: {
    operador_id: string;
    operador_nome: string;
    deposito: string;
    secao?: string;
    empresa?: string;
  }): Promise<RespostaIniciar> {
    const { data } = await api.post(`${CONTAGEM}/sessoes`, {
      secao: "",
      empresa: "filial",
      ...p,
    });
    return data;
  },

  async detalhe(sessaoId: string): Promise<RespostaDetalhe> {
    const { data } = await api.get(`${CONTAGEM}/sessoes/${sessaoId}`);
    return data;
  },

  async bipar(sessaoId: string, codigo: string, qtd = 1, secao = ""): Promise<RespostaBipe> {
    const { data } = await api.post(`${CONTAGEM}/sessoes/${sessaoId}/bipar`, { codigo, qtd, secao });
    return data;
  },

  async ajustar(sessaoId: string, codigoProduto: string, delta: number): Promise<RespostaAjuste> {
    const { data } = await api.post(`${CONTAGEM}/sessoes/${sessaoId}/ajustar`, {
      codigo_produto: codigoProduto,
      delta,
    });
    return data;
  },

  async registrarDivergencia(
    sessaoId: string,
    p: { codigo_produto?: string; codigo_lido?: string; motivo: string; observacao?: string; qtd_contada?: number | null }
  ): Promise<{ sucesso: boolean; total?: number; erro?: string }> {
    const { data } = await api.post(`${CONTAGEM}/sessoes/${sessaoId}/divergencia`, {
      codigo_produto: "",
      codigo_lido: "",
      observacao: "",
      qtd_contada: null,
      ...p,
    });
    return data;
  },

  async finalizar(sessaoId: string): Promise<RespostaFinalizar> {
    const { data } = await api.post(`${CONTAGEM}/sessoes/${sessaoId}/finalizar`);
    return data;
  },

  async listarSessoes(status?: "aberta" | "finalizada", limite = 50): Promise<Sessao[]> {
    try {
      const { data } = await api.get(`${CONTAGEM}/sessoes`, { params: { status, limite } });
      return data?.sessoes ?? [];
    } catch {
      return [];
    }
  },

  async divergencias(p?: {
    desde?: string;
    deposito?: string;
    apenas_com_diferenca?: boolean;
    limite?: number;
  }): Promise<RespostaDivergencias | null> {
    try {
      const { data } = await api.get(`${CONTAGEM}/divergencias`, { params: p });
      return data;
    } catch {
      return null;
    }
  },

  urlCsv(sessaoId: string): string {
    return `${CONTAGEM}/sessoes/${sessaoId}/csv`;
  },

  urlPlanilha(sessaoId: string, planilha: NomePlanilha): string {
    return `${CONTAGEM}/sessoes/${sessaoId}/csv/${planilha}`;
  },

  /** Marcas já cadastradas, para o autocompletar — evita três grafias da mesma marca. */
  async marcasConhecidas(): Promise<string[]> {
    try {
      const { data } = await api.get(`${CONTAGEM}/marcas`);
      return data?.marcas ?? [];
    } catch {
      return [];
    }
  },

  /** Anota a cubagem medida. Vira CSV — NÃO altera o Olist. */
  async registrarCubagem(
    sessaoId: string,
    p: {
      codigo_produto: string;
      peso_bruto?: number | null;
      comprimento?: number | null;
      altura?: number | null;
      largura?: number | null;
      observacao?: string;
    }
  ): Promise<{ sucesso: boolean; total?: number; erro?: string }> {
    const { data } = await api.post(`${CONTAGEM}/sessoes/${sessaoId}/cubagem`, {
      observacao: "",
      ...p,
    });
    return data;
  },

  /** Anota a marca correta. Mesma regra: vira CSV. */
  async registrarMarca(
    sessaoId: string,
    p: { codigo_produto: string; marca: string; marca_anterior?: string }
  ): Promise<{ sucesso: boolean; total?: number; erro?: string }> {
    const { data } = await api.post(`${CONTAGEM}/sessoes/${sessaoId}/marca`, {
      marca_anterior: "",
      ...p,
    });
    return data;
  },

  /**
   * Manda as planilhas para a pasta da conferência no Drive da Yup.
   * `parcial` mantém a conferência aberta — é o antigo botão Exportar.
   */
  async enviarDrive(sessaoId: string, parcial = false): Promise<RespostaDrive> {
    try {
      const { data } = await api.post(
        `${CONTAGEM}/sessoes/${sessaoId}/enviar-drive`,
        null,
        { params: { parcial }, timeout: 90000 }
      );
      return data;
    } catch (e: any) {
      return {
        sucesso: false,
        erro: "falha_de_rede",
        detalhe: e?.message || "O servidor não respondeu ao envio.",
      };
    }
  },

  /** Diferença pior primeiro — mesma ordem do backend, usada nas listas locais. */
  ordenarPorDiferenca(itens: ItemApurado[]): ItemApurado[] {
    return [...itens].sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca));
  },
};
