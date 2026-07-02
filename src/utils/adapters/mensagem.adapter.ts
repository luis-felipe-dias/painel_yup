import { Message } from "../../types/chat.types";

// Interface da resposta da API
interface ApiMensagem {
  sender: "cliente" | "pepper" | "atendente";
  message: string;
  timestamp: string;
  type: "texto" | "imagem" | "video" | "audio" | "documento" | "botao";
  respondida: boolean;
  file_url?: string;
  file_name?: string;
  mime_type?: string;
  [key: string]: any;
}

// Mapeia os dados da API para o formato do frontend
export function adaptMensagem(apiMensagem: ApiMensagem, sessaoId: string, index: number): Message {
  // ID ESTÁVEL: sessaoId + index (posição na lista)
  // Isso garante que a mesma mensagem sempre tenha o mesmo ID
  const stableId = `${sessaoId}-${index}`;
  
  const mapRemetente = (sender: string): "cliente" | "pepper" | "atendente" => {
    if (sender === "cliente") return "cliente";
    if (sender === "pepper") return "pepper";
    if (sender === "atendente") return "atendente";
    return "cliente";
  };

  const mapTipo = (type: string): "texto" | "imagem" | "video" | "audio" | "documento" | "botao" => {
    const tipos = ["texto", "imagem", "video", "audio", "documento", "botao"];
    return tipos.includes(type) ? type as any : "texto";
  };

  const buildMetadata = (apiMsg: ApiMensagem) => {
    const metadata: any = {};

    if (apiMsg.file_url) {
      metadata.url = apiMsg.file_url;
    }
    if (apiMsg.file_name) {
      metadata.nomeArquivo = apiMsg.file_name;
    }
    if (apiMsg.mime_type) {
      metadata.mimeType = apiMsg.mime_type;
    }

    if (apiMsg.type === "imagem" && apiMsg.message) {
      metadata.legenda = apiMsg.message;
    }

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  };

  return {
    id: stableId, // ID ESTÁVEL baseado no índice
    sessaoId: sessaoId,
    tipo: mapTipo(apiMensagem.type),
    conteudo: apiMensagem.message || "",
    remetente: mapRemetente(apiMensagem.sender),
    dataHora: apiMensagem.timestamp || new Date().toISOString(),
    metadata: buildMetadata(apiMensagem),
    respondida: apiMensagem.respondida || false,
    senderOriginal: apiMensagem.sender,
    // Guardar o índice original para referência
    index: index,
  };
}

// Adapta uma lista de mensagens
export function adaptMensagens(apiResponse: any, sessaoId: string): Message[] {
  if (!apiResponse) return [];
  
  // Se a resposta tem a propriedade 'mensagens' (array)
  if (apiResponse.mensagens && Array.isArray(apiResponse.mensagens)) {
    return apiResponse.mensagens.map((msg: any, index: number) => 
      adaptMensagem(msg, sessaoId, index)
    );
  }
  
  if (Array.isArray(apiResponse)) {
    return apiResponse.map((msg: any, index: number) => 
      adaptMensagem(msg, sessaoId, index)
    );
  }
  
  if (apiResponse.data && Array.isArray(apiResponse.data)) {
    return apiResponse.data.map((msg: any, index: number) => 
      adaptMensagem(msg, sessaoId, index)
    );
  }
  
  for (const key of Object.keys(apiResponse)) {
    if (Array.isArray(apiResponse[key])) {
      return apiResponse[key].map((msg: any, index: number) => 
        adaptMensagem(msg, sessaoId, index)
      );
    }
  }
  
  return [];
}