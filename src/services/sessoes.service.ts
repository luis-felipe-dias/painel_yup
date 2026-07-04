import { api } from "./api/client";
import { Sessao, SessaoFilter } from "../types/sessoes.types";
import { adaptSessoes } from "../utils/adapters/sessao.adapter";

export const sessoesService = {
  async listar(filter?: SessaoFilter): Promise<Sessao[]> {
    try {
      const response = await api.get("/human/sessoes", {
        params: filter,
      });
      
      let sessoesData: any[] = [];
      
      if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data.sessoes)) {
          sessoesData = response.data.sessoes;
        } else if (Array.isArray(response.data)) {
          sessoesData = response.data;
        } else if (Array.isArray(response.data.data)) {
          sessoesData = response.data.data;
        } else {
          for (const key of Object.keys(response.data)) {
            if (Array.isArray(response.data[key])) {
              sessoesData = response.data[key];
              break;
            }
          }
        }
      }
      
      const adapted = adaptSessoes(sessoesData);
      const sorted = ordenarSessoesPorPrioridade(adapted);
      
      return sorted;
    } catch (error) {
      console.error("❌ Erro ao listar sessões:", error);
      return [];
    }
  },

  async obter(id: string): Promise<Sessao | null> {
    try {
      const response = await api.get(`/human/sessoes/${id}`);
      return response.data ? adaptSessoes([response.data])[0] : null;
    } catch (error) {
      console.error(`❌ Erro ao obter sessão ${id}:`, error);
      return null;
    }
  },

  async buscar(termo: string): Promise<Sessao[]> {
    try {
      const response = await api.get("/human/sessoes", {
        params: { search: termo },
      });
      
      let sessoesData: any[] = [];
      
      if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data.sessoes)) {
          sessoesData = response.data.sessoes;
        } else if (Array.isArray(response.data)) {
          sessoesData = response.data;
        } else if (Array.isArray(response.data.data)) {
          sessoesData = response.data.data;
        }
      }
      
      const adapted = adaptSessoes(sessoesData);
      return ordenarSessoesPorPrioridade(adapted);
    } catch (error) {
      console.error(`❌ Erro ao buscar sessões com termo "${termo}":`, error);
      return [];
    }
  },

  // CANCELAR ATENDIMENTO - Nova função
  async cancelarAtendimento(sessaoId: string): Promise<boolean> {
    try {
      console.log(`🔄 Cancelando atendimento da sessão ${sessaoId}`);
      const response = await api.post(`/human/sessoes/${sessaoId}/cancelar`, {});
      
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Atendimento cancelado com sucesso para ${sessaoId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Erro ao cancelar atendimento da sessão ${sessaoId}:`, error);
      throw error;
    }
  },
};

function ordenarSessoesPorPrioridade(sessoes: Sessao[]): Sessao[] {
  return [...sessoes].sort((a, b) => {
    if (a.aguardandoAtendente && !b.aguardandoAtendente) return -1;
    if (!a.aguardandoAtendente && b.aguardandoAtendente) return 1;
    
    const estadoPrioridade = { aberta: 0, aguardando: 1, fechada: 2 };
    const priorA = estadoPrioridade[a.estado] ?? 2;
    const priorB = estadoPrioridade[b.estado] ?? 2;
    if (priorA !== priorB) return priorA - priorB;
    
    const dataA = new Date(a.createdAt || a.ultimaInteracao).getTime();
    const dataB = new Date(b.createdAt || b.ultimaInteracao).getTime();
    if (dataA !== dataB) return dataA - dataB;
    
    const ultimaA = new Date(a.ultimaInteracao).getTime();
    const ultimaB = new Date(b.ultimaInteracao).getTime();
    return ultimaA - ultimaB;
  });
}

export function getPrioridadeSessao(sessao: Sessao): 'alta' | 'media' | 'baixa' {
  if (sessao.aguardandoAtendente) return 'alta';
  if (sessao.estado === 'aberta') return 'media';
  return 'baixa';
}

export function getTempoEspera(sessao: Sessao): number {
  const inicio = new Date(sessao.createdAt || sessao.ultimaInteracao);
  const agora = new Date();
  return Math.floor((agora.getTime() - inicio.getTime()) / (1000 * 60));
}