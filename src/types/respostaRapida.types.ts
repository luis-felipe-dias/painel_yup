export interface RespostaRapida {
  id: string;
  /** Atalho sem a barra. "obrigado" responde ao digitar /obrigado */
  atalho: string;
  titulo: string;
  texto: string;
  /** Agrupa na lista: Saudação, Serviços, Pagamento, Encerramento... */
  categoria?: string;
  ativo: boolean;
  criadoPor?: string;
  atualizadoEm?: string;
}

/**
 * Variáveis que o painel sabe preencher sozinho no momento do envio.
 * O que não estiver aqui vai como texto literal - de propósito: é melhor
 * o atendente ver {algo_errado} na caixa antes de enviar do que o cliente
 * receber um campo vazio.
 */
export const VARIAVEIS_DISPONIVEIS = [
  { chave: "{primeiro_nome}", descricao: "Primeiro nome do cliente" },
  { chave: "{nome}", descricao: "Nome completo do cliente" },
  { chave: "{telefone}", descricao: "Telefone do cliente" },
  { chave: "{atendente}", descricao: "Quem está atendendo" },
  { chave: "{saudacao}", descricao: "Bom dia / Boa tarde / Boa noite" },
] as const;

export interface ContextoVariaveis {
  nome?: string;
  telefone?: string;
  atendente?: string;
}

export function saudacaoPorHorario(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Troca as variáveis do texto pelos valores do contexto. */
export function aplicarVariaveis(texto: string, ctx: ContextoVariaveis): string {
  const nome = (ctx.nome || "").trim();
  const primeiro = nome.split(/\s+/)[0] || "";

  return texto
    .replace(/\{primeiro_nome\}/g, primeiro)
    .replace(/\{nome\}/g, nome)
    .replace(/\{telefone\}/g, ctx.telefone || "")
    .replace(/\{atendente\}/g, ctx.atendente || "")
    .replace(/\{saudacao\}/g, saudacaoPorHorario());
}
