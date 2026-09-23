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
  is_group?: boolean;
  iniciada_por_atendente?: boolean;
  [key: string]: any;
}

export function adaptSessao(apiSessao: ApiSessao): Sessao {
  const mapStatus = (status: string): "online" | "offline" | "digitando" => {
    if (status === "humano" || status === "online") return "online";
    if (status === "digitando") return "digitando";
    return "offline";
  };

  // Antes comparava com estado_atual ("menu_principal", "promocoes" etc,
  // o estado do FLUXO DO BOT) contra valores ("atendimento_humano",
  // "aberta") que o backend nunca escreve nesse campo - então toda sessão
  // humana caía no "fechada" por padrão e o painel mostrava "Finalizada"
  // pra conversas que estavam abertas e ativas. O campo certo pra saber
  // se está aberta é o status da sessão (humano/ativa vs finalizada).
  const mapEstado = (status: string, aguardandoAtendente: boolean): "aberta" | "aguardando" | "fechada" => {
    if (status === "finalizada") return "fechada";
    if (aguardandoAtendente) return "aguardando";
    if (status === "humano" || status === "aguardando_atendente" || status === "ativa") return "aberta";
    return "fechada";
  };

  return {
    id: apiSessao.sessao_id,
    nome: apiSessao.cliente || "Cliente",
    telefone: apiSessao.telefone || "",
    ultimaInteracao: apiSessao.ultima_interacao || apiSessao.data_inicio || new Date().toISOString(),
    estado: mapEstado(apiSessao.status, apiSessao.aguardando_atendente || false),
    status: mapStatus(apiSessao.status),
    aguardandoAtendente: apiSessao.aguardando_atendente || false,
    createdAt: apiSessao.data_inicio || new Date().toISOString(),
    updatedAt: apiSessao.ultima_interacao || apiSessao.data_inicio || new Date().toISOString(),
    setorResponsavel: apiSessao.setor_responsavel,
    statusOriginal: apiSessao.status,
    estadoAtualOriginal: apiSessao.estado_atual,
    isGroup: apiSessao.is_group || false,
    iniciadaPorAtendente: apiSessao.iniciada_por_atendente || false,
  };
}

export function adaptSessoes(apiSessoes: ApiSessao[]): Sessao[] {
  if (!Array.isArray(apiSessoes)) return [];
  return apiSessoes.map(adaptSessao);
}