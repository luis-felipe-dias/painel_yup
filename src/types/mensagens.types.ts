export interface Mensagem {
  id: string;
  sessaoId: string;
  tipo: "texto" | "imagem" | "video" | "audio" | "documento" | "botao";
  conteudo: string;
  remetente: "cliente" | "pepper" | "atendente";
  dataHora: string;
  metadata?: {
    nomeArquivo?: string;
    tamanho?: number;
    url?: string;
    legenda?: string;
    mimeType?: string;
    botoes?: Array<{ id: string; texto: string; acao: string }>;
  };
  respondida?: boolean;
  senderOriginal?: string;
  index?: number;
}

export interface EnviarMensagemDTO {
  tipo: "texto" | "botao";
  conteudo: string;
  metadata?: any;
}

export interface EnviarMidiaDTO {
  tipo: "imagem" | "video" | "audio" | "documento";
  url: string;
  legenda?: string;
  nomeArquivo?: string;
  atendenteNome?: string;
}

export interface EncaminharMensagemDTO {
  mensagemId: string;
  sessaoDestinoId: string;
}