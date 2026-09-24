export interface Sessao {
  id: string;
  nome: string;
  telefone: string;
  ultimaInteracao: string;
  estado: "aberta" | "aguardando" | "fechada";
  status: "online" | "offline" | "digitando";
  aguardandoAtendente: boolean;
  createdAt: string;
  updatedAt: string;
  setorResponsavel?: string;
  statusOriginal?: string;
  estadoAtualOriginal?: string;
  // true = essa sessão é um GRUPO do WhatsApp, não um cliente individual
  isGroup?: boolean;
  // true = o atendente mandou a primeira mensagem (não foi o cliente que chamou)
  iniciadaPorAtendente?: boolean;
  // Desde quando o cliente está esperando resposta (null quando não está
  // aguardando) - diferente de ultimaInteracao, que é a última mensagem
  // de qualquer um dos lados.
  aguardandoDesde?: string | null;
  // Campos adicionais para priorização
  prioridade?: 'alta' | 'media' | 'baixa';
  tempoEspera?: number; // em minutos
}

export interface SessaoFilter {
  status?: "aberta" | "aguardando" | "fechada";
  search?: string;
  page?: number;
  limit?: number;
}

// Ordem de prioridade para ordenação
export const PRIORIDADE_ORDEM = {
  aguardando: 0,  // Maior prioridade
  respondida: 1,   // Média prioridade
  finalizada: 2    // Menor prioridade
};