export interface Message {
  id: string;
  sessaoId: string;
  tipo: 'texto' | 'imagem' | 'video' | 'audio' | 'documento' | 'botao';
  conteudo: string;
  remetente: 'cliente' | 'pepper' | 'atendente';
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
  index?: number; // Índice da mensagem na lista
  // Nome/telefone de quem escreveu DENTRO de um grupo (o "contato" da
  // sessão é o grupo inteiro; isso identifica a pessoa que falou)
  remetenteNome?: string;
  remetenteTelefone?: string;
  // Resposta a um Status/story do WhatsApp, ou a uma mensagem específica
  isStatusReply?: boolean;
  referencePreview?: string;
}