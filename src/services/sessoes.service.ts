import { whatsappApi } from './api/client';
import { Sessao, SessaoFilter } from '../types/sessoes.types';
import { adaptSessoes } from '../utils/adapters/sessao.adapter';

// Setores humanos reais (espelha SETORES_VALIDOS do backend, em
// app/api/human.py) - usado pra listar opções de transferência no painel.
export const SETORES: Record<string, string> = {
  atendimento: "Atendimento",
  financeiro: "Financeiro",
  comercial: "Comercial",
  ouvidoria: "Ouvidoria",
  tecnico: "Técnico",
  rh: "RH",
  qualidade: "Qualidade"
};

const MAPEAMENTO_SETORES: Record<string, string> = {
  'atendente': 'atendimento',
  'pedido': 'financeiro',
  'trocas': 'comercial',
  'reclamacao': 'ouvidoria',
  'sugestoes': 'qualidade',
  'impressao': 'tecnico',
  'encadernacao': 'tecnico',
  'plastificacao': 'tecnico',
  'curriculo': 'rh'
};

export const sessoesService = {
  async listar(filter?: SessaoFilter, setoresPermitidos?: string[]): Promise<Sessao[]> {
    try {
      const response = await whatsappApi.get("/human/sessoes", {
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
      
      // Adicionar setor responsável
      const comSetor = adapted.map(sessao => ({
        ...sessao,
        setorResponsavel: MAPEAMENTO_SETORES[sessao.estadoAtualOriginal || ''] || sessao.setorResponsavel || 'atendimento'
      }));
      
      // Filtrar por setores permitidos (se houver)
      let filtradas = comSetor;
      if (setoresPermitidos && setoresPermitidos.length > 0 && !setoresPermitidos.includes('*')) {
        filtradas = comSetor.filter(sessao => 
          setoresPermitidos.includes(sessao.setorResponsavel || 'atendimento')
        );
        console.log(`🔍 Filtrando por setores: ${setoresPermitidos.join(', ')} -> ${filtradas.length} sessões`);
      }
      
      const sorted = ordenarSessoesPorPrioridade(filtradas);
      
      return sorted;
    } catch (error) {
      console.error("❌ Erro ao listar sessões:", error);
      return [];
    }
  },

  async obter(id: string): Promise<Sessao | null> {
    try {
      const response = await whatsappApi.get(`/human/sessoes/${id}`);
      if (!response.data) return null;
      
      const adapted = adaptSessoes([response.data])[0];
      if (!adapted) return null;
      
      return {
        ...adapted,
        setorResponsavel: MAPEAMENTO_SETORES[adapted.estadoAtualOriginal || ''] || adapted.setorResponsavel || 'atendimento'
      };
    } catch (error) {
      console.error(`❌ Erro ao obter sessão ${id}:`, error);
      return null;
    }
  },

  async buscar(termo: string, setoresPermitidos?: string[]): Promise<Sessao[]> {
    try {
      const response = await whatsappApi.get("/human/sessoes", {
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
      const comSetor = adapted.map(sessao => ({
        ...sessao,
        setorResponsavel: MAPEAMENTO_SETORES[sessao.estadoAtualOriginal || ''] || sessao.setorResponsavel || 'atendimento'
      }));
      
      // Filtrar por setores permitidos
      let filtradas = comSetor;
      if (setoresPermitidos && setoresPermitidos.length > 0 && !setoresPermitidos.includes('*')) {
        filtradas = comSetor.filter(sessao => 
          setoresPermitidos.includes(sessao.setorResponsavel || 'atendimento')
        );
      }
      
      return ordenarSessoesPorPrioridade(filtradas);
    } catch (error) {
      console.error(`❌ Erro ao buscar sessões com termo "${termo}":`, error);
      return [];
    }
  },

  async cancelarAtendimento(sessaoId: string): Promise<boolean> {
    try {
      console.log(`🔄 Cancelando atendimento da sessão ${sessaoId}`);
      const response = await whatsappApi.post(`/human/sessoes/${sessaoId}/cancelar`, {});
      
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

  async transferirSetor(sessaoId: string, setor: string): Promise<void> {
    const response = await whatsappApi.post(`/human/sessoes/${sessaoId}/transferir`, { setor });
    if (!response.data?.sucesso) {
      throw new Error("Falha ao transferir atendimento");
    }
  },

  async iniciarConversa(telefone: string, mensagem: string, atendenteNome?: string): Promise<{ sessaoId: string }> {
    const response = await whatsappApi.post("/human/sessoes/iniciar", {
      telefone,
      mensagem,
      atendente_nome: atendenteNome || "Atendente"
    });
    if (!response.data?.sucesso) {
      throw new Error("Falha ao iniciar conversa");
    }
    return { sessaoId: response.data.sessao_id };
  },

  podeCancelarAtendimento(sessao: Sessao): { pode: boolean; motivo: string } {
    if (sessao.aguardandoAtendente) {
      return {
        pode: false,
        motivo: "Cliente ainda aguardando atendimento. Responda antes de cancelar."
      };
    }

    const ultimaInteracao = new Date(sessao.ultimaInteracao);
    const agora = new Date();
    const diffMinutes = (agora.getTime() - ultimaInteracao.getTime()) / (1000 * 60);
    
    if (diffMinutes < 30) {
      return {
        pode: false,
        motivo: `Aguardar ${Math.ceil(30 - diffMinutes)} minutos para cancelar. Mínimo 30 minutos sem interação.`
      };
    }

    return {
      pode: true,
      motivo: "Cancelamento permitido"
    };
  }
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

export function getTempoUltimaInteracao(sessao: Sessao): number {
  const ultima = new Date(sessao.ultimaInteracao);
  const agora = new Date();
  return Math.floor((agora.getTime() - ultima.getTime()) / (1000 * 60));
}