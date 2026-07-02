import { api } from "./api/client";
import { Sessao, SessaoFilter, PRIORIDADE_ORDEM } from "../types/sessoes.types";
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
      
      console.log(`✅ ${sorted.length} sessões ordenadas por prioridade`);
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
};

function ordenarSessoesPorPrioridade(sessoes: Sessao[]): Sessao[] {
  return [...sessoes].sort((a, b) => {
    // 1. Aguardando atendente primeiro
    if (a.aguardandoAtendente && !b.aguardandoAtendente) return -1;
    if (!a.aguardandoAtendente && b.aguardandoAtendente) return 1;
    
    // 2. Estado (aberta > aguardando > fechada)
    const estadoPrioridade = { aberta: 0, aguardando: 1, fechada: 2 };
    const priorA = estadoPrioridade[a.estado] ?? 2;
    const priorB = estadoPrioridade[b.estado] ?? 2;
    if (priorA !== priorB) return priorA - priorB;
    
    // 3. Data de início (mais antiga primeiro)
    const dataA = new Date(a.createdAt || a.ultimaInteracao).getTime();
    const dataB = new Date(b.createdAt || b.ultimaInteracao).getTime();
    if (dataA !== dataB) return dataA - dataB;
    
    // 4. Última interação (mais antiga primeiro)
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