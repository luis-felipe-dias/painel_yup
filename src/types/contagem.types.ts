/**
 * Conferência de estoque — tipos do contrato com o backend-yup
 * (FastAPI, rotas /contagem/*).
 *
 * Os nomes são os mesmos do Python de propósito: quando o backend muda um
 * campo, o TypeScript quebra no lugar certo em vez de devolver `undefined`
 * silencioso na tela do conferente.
 */

/**
 * Depósitos que entram em conferência. Mesma grafia do espelho —
 * "Deposito" sem acento.
 *
 * FISCAL NÃO ENTRA, de propósito. Ele não é prateleira: é o saldo que
 * existe só para a nota de entrada da filial. Ninguém conta Fiscal, e
 * deixá-lo na lista só cria a chance de alguém escolher errado e
 * transformar a contagem inteira em divergência falsa.
 */
export const DEPOSITOS = [
  "Controle Geral",
  "Deposito Loja",
  "Casa Velha",
] as const;

export type Deposito = (typeof DEPOSITOS)[number];

export type FonteSaldo = "tempo_real" | "espelho" | "desconhecida";

export interface ProdutoResumo {
  codigo: string;
  descricao: string;
  sku: string;
  gtin?: string | null;
  preco?: number | null;
  unidade: string;
  categoria?: string | null;
  estoque: Record<string, number>;
  /** URL da foto guardada no espelho. Pode ser null: nem todo produto tem. */
  foto?: string | null;
  localizacao?: string | null;
  marca?: string | null;
  /** A marca escrita no nome, no padrão "NOME (REF) | MARCA". */
  marca_no_nome?: string | null;
  /** A (ativo), I (inativo), E (excluído) — vem do cadastro do Olist. */
  situacao?: string | null;
  dimensoes?: Dimensoes;
  ficha_em?: string | null;
}

export interface Dimensoes {
  peso_bruto?: number | null;
  peso_liquido?: number | null;
  largura?: number | null;
  altura?: number | null;
  comprimento?: number | null;
}

export interface Leitura {
  data_hora: string;
  codigo_lido: string;
  produto: string;
  descricao: string;
  qtd: number;
  secao: string;
}

export interface DivergenciaRegistrada {
  data_hora: string;
  codigo_produto: string;
  codigo_lido: string;
  descricao?: string;
  motivo: string;
  observacao: string;
  qtd_contada?: number | null;
  sessao?: string;
  operador?: string;
  deposito?: string;
}

export interface Sessao {
  id: string;
  operador_id: string;
  operador: string;
  deposito: string;
  secao: string;
  empresa: string;
  inicio: string;
  fim: string | null;
  status: "aberta" | "finalizada";
  leituras: Leitura[];
  saldos: Record<string, { ok: boolean; fonte: FonteSaldo; saldo: number; consultado_em?: string; aviso?: string }>;
  divergencias: DivergenciaRegistrada[];
  resumo?: ResumoSessao;
}

export interface ResumoSessao {
  produtos: number;
  com_diferenca: number;
  unidades_contadas: number;
  unidades_sobrando: number;
  unidades_faltando: number;
  reconferidos?: number;
}

/** Linha de apuração: contado × saldo × diferença, por produto. */
export interface ItemApurado {
  codigo: string;
  descricao: string;
  contado: number;
  saldo: number;
  diferenca: number;
  fonte_saldo: FonteSaldo;
  consultado_em?: string | null;
  /** Só vem na visão consolidada de Operações. */
  sessao?: string;
  operador?: string;
  deposito?: string;
  secao?: string;
  data?: string;
  status_sessao?: string;
}

/** Resposta de POST /contagem/sessoes/{id}/bipar */
export interface RespostaBipe {
  sucesso: boolean;
  erro?: "sessao_nao_encontrada" | "sessao_fechada" | "produto_nao_encontrado" | string;
  codigo?: string;
  sugestao?: string;
  produto?: ProdutoResumo;
  contado?: number;
  saldo?: number;
  diferenca?: number;
  fonte_saldo?: FonteSaldo;
  /** true = veio do Olist agora. false = espelho local (sem conexão). */
  online?: boolean;
  aviso?: string | null;
  /** O produto não existia no espelho e foi cadastrado a partir do Olist. */
  auto_cadastrado?: boolean;
  total_leituras?: number;
}

export interface RespostaAjuste {
  sucesso: boolean;
  erro?: string;
  contado?: number;
  saldo?: number;
  diferenca?: number;
}

export interface RespostaIniciar {
  sucesso: boolean;
  retomada: boolean;
  sessao: Sessao;
}

export interface RespostaDetalhe {
  sucesso: boolean;
  erro?: string;
  sessao?: Sessao;
  itens?: ItemApurado[];
}

export interface RespostaFinalizar {
  sucesso: boolean;
  erro?: string;
  resumo?: ResumoSessao;
  itens?: ItemApurado[];
}

export interface RespostaDivergencias {
  sucesso: boolean;
  total: number;
  itens: ItemApurado[];
  registradas: DivergenciaRegistrada[];
  resumo: {
    produtos_divergentes: number;
    unidades_sobrando: number;
    unidades_faltando: number;
    divergencias_registradas: number;
  };
}

/** Item que está na tela agora — o "apontador". */
export interface ItemNaTela {
  produto: ProdutoResumo;
  contado: number;
  saldo: number;
  diferenca: number;
  fonte: FonteSaldo;
  online: boolean;
  aviso?: string | null;
}

/** Uma linha do histórico que fica na tela durante a conferência. */
export interface LinhaHistorico {
  hora: string;
  codigo: string;
  descricao: string;
  qtd: number;
  contado: number;
  saldo: number;
  diferenca: number;
}

export interface RegistroCubagem {
  data_hora: string;
  codigo_produto: string;
  peso_bruto?: number | null;
  largura?: number | null;
  altura?: number | null;
  comprimento?: number | null;
  observacao: string;
  operador?: string;
}

export interface RegistroMarca {
  data_hora: string;
  codigo_produto: string;
  marca: string;
  marca_anterior: string;
  operador?: string;
}

export interface EnvioDrive {
  data_hora: string;
  parcial: boolean;
  http: number;
  sucesso: boolean;
  resposta: string;
}

export interface RespostaDrive {
  sucesso: boolean;
  erro?: string | null;
  detalhe?: string;
  http?: number;
  /** URL da subpasta criada no Drive — vem do próprio Apps Script. */
  pasta?: string | null;
  email?: boolean | null;
  /** Corpo cru do Apps Script — é onde aparece o motivo real da recusa. */
  resposta?: string;
  arquivos?: string[];
}

export type NomePlanilha = "contagem" | "leituras" | "divergencias" | "cubagem" | "marcas";
