// src/types/peper.types.ts
//
// Os contratos das três telas da Peper. Espelham app/api/loja.py e
// app/api/palavras.py do bot — se um campo mudar lá, muda aqui.

// ---------------------------------------------------------------- Ficha

export interface CampoFicha {
  chave: string;
  rotulo: string;
  valor: string;
  /** Falso = a Peper diz "vou confirmar com a equipe" em vez de chutar. */
  preenchido: boolean;
  dica: string;
  padrao: string;
}

export interface RespostaFicha {
  sucesso: boolean;
  nome: string;
  campos: CampoFicha[];
  /** Rótulos que ainda estão vazios, já sem repetição. */
  faltando: string[];
  /** O texto exato que entra no prompt dela agora. */
  prompt: string;
}

// ---------------------------------------------------------------- Palavras

export type AcaoPalavra = "bloquear" | "avisar" | "trocar";

export interface RegraPalavra {
  id: string | null;
  termo: string;
  acao: AcaoPalavra;
  troca_por?: string | null;
  motivo?: string | null;
  ativo: boolean;
  /** Só nas regras de fábrica: já existe uma cadastrada com o mesmo termo. */
  sobrescrita?: boolean;
}

export interface RespostaPalavras {
  sucesso: boolean;
  acoes: AcaoPalavra[];
  padrao: RegraPalavra[];
  regras: RegraPalavra[];
  prompt: string;
}

export interface AchadoFiltro {
  termo: string;
  acao: AcaoPalavra;
  motivo: string;
}

export interface RespostaTeste {
  sucesso: boolean;
  texto: string;
  bloquear: boolean;
  achados: AchadoFiltro[];
}

// Ordem de gravidade, para ordenar e colorir. Bloquear primeiro porque é
// o que para o atendimento.
export const PESO_ACAO: Record<AcaoPalavra, number> = {
  bloquear: 0,
  trocar: 1,
  avisar: 2,
};

export const ROTULO_ACAO: Record<AcaoPalavra, string> = {
  bloquear: "Não envia",
  trocar: "Troca a palavra",
  avisar: "Só registra",
};

export const EXPLICA_ACAO: Record<AcaoPalavra, string> = {
  bloquear:
    "A resposta não vai para o cliente e a conversa passa para a equipe. Use para o que custa dinheiro: desconto que não existe, dado interno, urgência inventada.",
  trocar:
    'A palavra é substituída em silêncio e a resposta segue. Use para tom: "prezado cliente" virando "oi".',
  avisar:
    "A resposta vai normalmente e fica o registro no log. Use quando você desconfia mas não quer travar o atendimento.",
};

// ---------------------------------------------------------------- Curadoria

export type StatusCuradoria = "pendente" | "bloqueado_preco" | "aprovada" | "descartada";

export interface ItemCuradoria {
  id: string;
  pergunta: string;
  resposta: string;
  origem: string;
  motivo_bloqueio?: string | null;
  criado_em: string;
}

export interface RespostaCuradoria {
  sucesso: boolean;
  status: StatusCuradoria;
  total: number;
  itens: ItemCuradoria[];
}

export const ROTULO_STATUS: Record<StatusCuradoria, string> = {
  pendente: "Para revisar",
  bloqueado_preco: "Travadas por preço",
  aprovada: "Aprovadas",
  descartada: "Descartadas",
};
