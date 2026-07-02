import { api } from "./api/client";
import { Mensagem, EnviarMensagemDTO, EncaminharMensagemDTO, EnviarMidiaDTO } from "../types/mensagens.types";
import { adaptMensagens } from "../utils/adapters/mensagem.adapter";

export const mensagensService = {
  async listar(sessaoId: string): Promise<Mensagem[]> {
    try {
      const response = await api.get(`/human/sessoes/${sessaoId}/mensagens`);
      const adapted = adaptMensagens(response.data, sessaoId);
      return adapted;
    } catch (error) {
      console.error(`❌ Erro ao listar mensagens da sessão ${sessaoId}:`, error);
      return [];
    }
  },

  async enviar(sessaoId: string, dados: EnviarMensagemDTO): Promise<Mensagem | null> {
    try {
      const payload = { mensagem: dados.conteudo };
      const response = await api.post(`/human/sessoes/${sessaoId}/enviar`, payload);
      
      if (response.data) {
        const msgData = {
          sender: "atendente",
          message: dados.conteudo,
          timestamp: new Date().toISOString(),
          type: "texto",
          respondida: true
        };
        return adaptMensagens([msgData], sessaoId)[0];
      }
      return null;
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem:`, error);
      throw error;
    }
  },

  async enviarMidia(sessaoId: string, dados: EnviarMidiaDTO): Promise<Mensagem | null> {
    try {
      const payload = {
        tipo_midia: dados.tipo,
        midia_url: dados.url,
        legenda: dados.legenda || "",
        nome_arquivo: dados.nomeArquivo || "arquivo",
        atendente_nome: dados.atendenteNome || "Atendente"
      };
      
      const response = await api.post(`/human/sessoes/${sessaoId}/enviar-midia`, payload);
      return response.data ? adaptMensagens([response.data], sessaoId)[0] : null;
    } catch (error) {
      console.error(`❌ Erro ao enviar mídia:`, error);
      throw error;
    }
  },

  // ENCAMINHAR - Lógica correta
  async encaminharMensagem(sessaoDestinoId: string, mensagem: Mensagem): Promise<Mensagem | null> {
    try {
      console.log(`🔄 Encaminhando mensagem para ${sessaoDestinoId}`);
      console.log(`📝 Tipo: ${mensagem.tipo}, Conteúdo: ${mensagem.conteudo.substring(0, 50)}...`);
      
      // Verificar se é texto ou mídia
      const tiposMidia = ['imagem', 'video', 'audio', 'documento'];
      
      if (tiposMidia.includes(mensagem.tipo)) {
        // Enviar como mídia
        const midiaData: EnviarMidiaDTO = {
          tipo: mensagem.tipo as 'imagem' | 'video' | 'audio' | 'documento',
          url: mensagem.metadata?.url || '',
          legenda: mensagem.metadata?.legenda || mensagem.conteudo || '',
          nomeArquivo: mensagem.metadata?.nomeArquivo || 'arquivo',
          atendenteNome: 'Atendente'
        };
        
        console.log(`📎 Encaminhando mídia: ${midiaData.tipo}`);
        return await this.enviarMidia(sessaoDestinoId, midiaData);
      } else {
        // Enviar como texto
        const textoData: EnviarMensagemDTO = {
          tipo: 'texto',
          conteudo: mensagem.conteudo
        };
        
        console.log(`📝 Encaminhando texto`);
        return await this.enviar(sessaoDestinoId, textoData);
      }
    } catch (error) {
      console.error(`❌ Erro ao encaminhar mensagem:`, error);
      throw error;
    }
  },

  // Encaminhar mensagem com contexto (incluindo remetente original)
  async encaminharComContexto(sessaoDestinoId: string, mensagem: Mensagem, remetenteOriginal: string): Promise<Mensagem | null> {
    try {
      // Adicionar contexto ao conteúdo
      const contexto = `📨 *Mensagem encaminhada de ${remetenteOriginal}:*\n\n`;
      const mensagemComContexto = {
        ...mensagem,
        conteudo: `${contexto}${mensagem.conteudo}`
      };
      
      return await this.encaminharMensagem(sessaoDestinoId, mensagemComContexto);
    } catch (error) {
      console.error(`❌ Erro ao encaminhar mensagem com contexto:`, error);
      throw error;
    }
  },
};