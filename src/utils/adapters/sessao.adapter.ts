import { Sessao } from "../../types/sessoes.types";

interface ApiSessao {
  sessao_id: string;
  cliente: string;
  telefone: string;
  status: string;
  estado_atual: string;
  setor_responsavel: string;
  aguardando_atendente: boolean;
  data_inicio: string;
  ultima_interacao: string;
  [key: string]: any;
}

export function adaptSessao(apiSessao: ApiSessao): Sessao {
  const mapStatus = (status: string): "online" | "offline" | "digitando" => {
    if (status === "humano" || status === "online") return "online";
    if (status === "digitando") return "digitando";
    return "offline";
  };

  const mapEstado = (estado: string): "aberta" | "aguardando" | "fechada" => {
    if (estado === "atendimento_humano" || estado === "aberta") return "aberta";
    if (estado === "aguardando" || estado === "aguardando_atendente") return "aguardando";
    return "fechada";
  };

  return {
    id: apiSessao.sessao_id,
    nome: apiSessao.cliente || "Cliente",
    telefone: apiSessao.telefone || "",
    ultimaInteracao: apiSessao.ultima_interacao || apiSessao.data_inicio || new Date().toISOString(),
    estado: mapEstado(apiSessao.estado_atual),
    status: mapStatus(apiSessao.status),
    aguardandoAtendente: apiSessao.aguardando_atendente || false,
    createdAt: apiSessao.data_inicio || new Date().toISOString(),
    updatedAt: apiSessao.ultima_interacao || apiSessao.data_inicio || new Date().toISOString(),
    setorResponsavel: apiSessao.setor_responsavel,
    statusOriginal: apiSessao.status,
    estadoAtualOriginal: apiSessao.estado_atual,
  };
}

export function adaptSessoes(apiSessoes: ApiSessao[]): Sessao[] {
  if (!Array.isArray(apiSessoes)) return [];
  return apiSessoes.map(adaptSessao);
}