export interface AtendenteMetrica {
  id: string;
  nome: string;
  atendendoAgora: boolean;
  atendimentosHoje: number;
  atendimentos7dias: number;
  totalAtendimentos: number;
  totalRespostas: number;
  taxaResposta: number | null;
  cargaVsMedia: "sobrecarregado" | "ocioso" | "normal";
}

export interface MetricasAtendentes {
  mediaAtendimentos7dias: number;
  atendentes: AtendenteMetrica[];
}

export interface SetorCarga {
  setor: string;
  total: number;
  aguardando: number;
}

export interface EstatisticasGerais {
  total_contatos: number;
  sessoes_ativas: number;
  atendimento_humano_ativas: number;
  fila_humana_pendente: number;
  mensagens_hoje: number;
  mensagens_recebidas_hoje: number;
  mensagens_enviadas_hoje: number;
  total_avaliacoes: number;
}

export interface EstoqueSnapshotDia {
  data: string;
  criticos: number;
  precisaRepor: number;
  estoqueOk: number;
  total: number;
}
