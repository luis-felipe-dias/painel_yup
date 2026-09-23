import { whatsappApi } from './api/client';
import { Mensagem, EnviarMensagemDTO, EnviarMidiaDTO } from '../types/mensagens.types';
import { adaptMensagens } from '../utils/adapters/mensagem.adapter';

export const mensagensService = {
  async listar(sessaoId: string): Promise<Mensagem[]> {
    try {
      const response = await whatsappApi.get(`/human/sessoes/${sessaoId}/mensagens`);
      return adaptMensagens(response.data, sessaoId);
    } catch (error) {
      console.error(`❌ Erro ao listar mensagens da sessão ${sessaoId}:`, error);
      return [];
    }
  },

  async enviar(sessaoId: string, dados: EnviarMensagemDTO): Promise<Mensagem | null> {
    try {
      const payload = { mensagem: dados.conteudo };
      const response = await whatsappApi.post(`/human/sessoes/${sessaoId}/enviar`, payload);

      // Segunda camada de proteção (backend já responde com erro HTTP quando
      // falha) contra tratar {success: false} como se a mensagem tivesse ido.
      if (response.data?.success === false) {
        throw new Error(response.data?.error || response.data?.message || 'Falha ao enviar mensagem');
      }

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
      
      const response = await whatsappApi.post(`/human/sessoes/${sessaoId}/enviar-midia`, payload);
      // Backend agora responde com erro HTTP quando falha, mas mantemos essa
      // checagem como segunda camada de proteção contra "sucesso silencioso".
      if (!response.data || response.data.success === false) {
        throw new Error(response.data?.message || 'Falha ao enviar mídia');
      }
      const msgData = {
        sender: "atendente",
        message: dados.legenda || `Mídia enviada: ${dados.tipo}`,
        timestamp: new Date().toISOString(),
        type: dados.tipo,
        respondida: true,
        file_url: dados.url,
        file_name: dados.nomeArquivo
      };
      return adaptMensagens([msgData], sessaoId)[0];
    } catch (error) {
      console.error(`❌ Erro ao enviar mídia:`, error);
      throw error;
    }
  },

  async encaminharMensagem(sessaoDestinoId: string, mensagem: Mensagem): Promise<Mensagem | null> {
    try {
      // Marca a mensagem como encaminhada (igual ao "Encaminhada" do WhatsApp),
      // sem citar de qual cliente ela veio - a sessão de origem é outra pessoa,
      // e expor o nome dela para o destinatário seria um vazamento de dado.
      const PREFIXO_ENCAMINHADA = '↪️ _Mensagem encaminhada_\n\n';
      const tiposMidia = ['imagem', 'video', 'audio', 'documento'];

      if (tiposMidia.includes(mensagem.tipo)) {
        const url = mensagem.metadata?.url;
        if (!url) {
          // Sem isso, o painel tentava reenviar com midia_url: "" e a Z-API
          // recusava - o erro chegava genérico, sem dizer por quê.
          throw new Error('Esta mídia não pode mais ser encaminhada (o link original expirou ou não foi salvo).');
        }
        const midiaData: EnviarMidiaDTO = {
          tipo: mensagem.tipo as 'imagem' | 'video' | 'audio' | 'documento',
          url,
          legenda: `${PREFIXO_ENCAMINHADA}${mensagem.metadata?.legenda || mensagem.conteudo || ''}`.trim(),
          nomeArquivo: mensagem.metadata?.nomeArquivo || 'arquivo',
          atendenteNome: 'Atendente'
        };
        return await this.enviarMidia(sessaoDestinoId, midiaData);
      } else {
        const textoData: EnviarMensagemDTO = {
          tipo: 'texto',
          conteudo: `${PREFIXO_ENCAMINHADA}${mensagem.conteudo}`
        };
        return await this.enviar(sessaoDestinoId, textoData);
      }
    } catch (error) {
      console.error(`❌ Erro ao encaminhar mensagem:`, error);
      throw error;
    }
  },

  async encaminharComContexto(sessaoDestinoId: string, mensagem: Mensagem, remetenteOriginal: string): Promise<Mensagem | null> {
    try {
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
  }
};