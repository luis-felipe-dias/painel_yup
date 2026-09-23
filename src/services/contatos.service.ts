import { whatsappApi } from './api/client';
import { Contato, AtualizarContatoDTO, ListarContatosParams } from '../types/contatos.types';

// Endpoints ficam no whats-bot (prefixo /bot/yup), não no painel de estoque.
function adaptContato(c: any): Contato {
  return {
    id: c.id,
    nome: c.nome || 'Desconhecido',
    telefone: c.telefone || '',
    nomePersonalizado: c.nome_personalizado || false,
    isGroup: c.is_group || false,
    dataCriacao: c.data_criacao,
    ultimaInteracao: c.ultima_interacao,
    tags: c.tags || [],
    observacoes: c.observacoes
  };
}

export const contatosService = {
  async listar(params?: ListarContatosParams): Promise<Contato[]> {
    try {
      const response = await whatsappApi.get('/bot/yup/contatos', {
        params: {
          busca: params?.busca || undefined,
          limit: params?.limit || 200,
          apenas_grupos: params?.apenasGrupos || false
        }
      });
      const contatos = response.data?.contatos || [];
      return contatos.map(adaptContato);
    } catch (error) {
      console.error('❌ Erro ao listar contatos:', error);
      return [];
    }
  },

  async listarProblematicos(): Promise<Contato[]> {
    try {
      const response = await whatsappApi.get('/bot/yup/contatos/problematicos');
      const contatos = response.data?.contatos || [];
      return contatos.map((c: any) => adaptContato({ ...c, nome_personalizado: false, is_group: false }));
    } catch (error) {
      console.error('❌ Erro ao listar contatos problemáticos:', error);
      return [];
    }
  },

  async atualizar(id: string, dados: AtualizarContatoDTO): Promise<Contato | null> {
    const payload = {
      nome: dados.nome,
      tags: dados.tags,
      observacoes: dados.observacoes
    };
    const response = await whatsappApi.patch(`/bot/yup/contatos/${id}`, payload);
    if (!response.data?.sucesso) {
      throw new Error('Falha ao atualizar contato');
    }
    return adaptContato(response.data.contato);
  }
};
