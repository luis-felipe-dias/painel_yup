import { painelApi } from './api/client';
import { Usuario, LoginResponse, AtendenteResposta, VerificarAtendenteResponse } from '../types/auth.types';

const AUTH_ENDPOINT = '/auth';

export const authService = {
  async login(login: string, senha: string): Promise<LoginResponse> {
    try {
      console.log(`🔐 Tentando login: ${login}`);
      const response = await painelApi.post(`${AUTH_ENDPOINT}/login`, { login, senha });
      console.log('✅ Login realizado com sucesso');
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao fazer login:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro ao fazer login' 
      };
    }
  },

  async verificarAtendentePorSenha(senha: string): Promise<VerificarAtendenteResponse> {
    try {
      console.log(`🔐 Verificando atendente com senha: ${senha}`);
      const response = await painelApi.post(`${AUTH_ENDPOINT}/atendente/verificar-senha`, { senha });
      console.log('✅ Atendente verificado com sucesso');
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao verificar atendente:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro ao verificar atendente' 
      };
    }
  },

  async verificarAtendente(codigo: string): Promise<AtendenteResposta | null> {
    try {
      const response = await painelApi.post(`${AUTH_ENDPOINT}/atendente/verificar`, { codigo });
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao verificar atendente:', error);
      return null;
    }
  },

  async registrarAberturaSessao(sessaoId: string, atendenteId: string): Promise<boolean> {
    try {
      const response = await painelApi.post(`${AUTH_ENDPOINT}/atendente/sessao`, { sessaoId, atendenteId });
      return response.data?.success || false;
    } catch (error) {
      console.error('❌ Erro ao registrar abertura:', error);
      return false;
    }
  },

  async registrarResposta(sessaoId: string, atendenteId: string): Promise<boolean> {
    try {
      const response = await painelApi.post(`${AUTH_ENDPOINT}/atendente/resposta`, { sessaoId, atendenteId });
      return response.data?.success || false;
    } catch (error) {
      console.error('❌ Erro ao registrar resposta:', error);
      return false;
    }
  },

  async buscarAtendenteSessao(sessaoId: string): Promise<AtendenteResposta | null> {
    try {
      console.log(`🔍 Buscando atendente para sessão: ${sessaoId}`);
      const response = await painelApi.get(`${AUTH_ENDPOINT}/atendente/sessao/${sessaoId}`);
      return response.data;
    } catch (error: any) {
      // Se for 404, significa que não tem atendente, o que é normal
      if (error.response?.status === 404) {
        console.log(`ℹ️ Nenhum atendente encontrado para sessão ${sessaoId}`);
        return null;
      }
      console.error('❌ Erro ao buscar atendente da sessão:', error);
      return null;
    }
  },

  async criarUsuario(usuario: Omit<Usuario, '_id' | 'criadoEm' | 'ativo'>): Promise<boolean> {
    try {
      console.log('📤 Criando usuário:', usuario);
      
      const payload = {
        nome: usuario.nome,
        login: usuario.login,
        senha: usuario.senha,
        tipo: usuario.tipo,
        permissoes: usuario.permissoes || { paginas: [], setores: [] }
      };
      
      console.log('📦 Payload enviado:', payload);
      
      const response = await painelApi.post(`${AUTH_ENDPOINT}/usuarios`, payload);
      console.log('✅ Resposta do servidor:', response.data);
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao criar usuário:', error);
      if (error.response) {
        console.error('📝 Status:', error.response.status);
        console.error('📝 Dados do erro:', error.response.data);
      }
      return false;
    }
  },

  async criarAtendente(atendente: Omit<AtendenteResposta, '_id' | 'criadoEm' | 'totalAtendimentos' | 'totalRespostas' | 'ativo'>): Promise<boolean> {
    try {
      console.log('📤 Criando atendente:', atendente);
      
      const payload = {
        ...atendente,
        ativo: true,
        totalAtendimentos: 0,
        totalRespostas: 0,
        criadoEm: new Date().toISOString()
      };
      
      console.log('📦 Payload enviado:', payload);
      
      await painelApi.post(`${AUTH_ENDPOINT}/atendentes`, payload);
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao criar atendente:', error);
      if (error.response) {
        console.error('📝 Status:', error.response.status);
        console.error('📝 Dados do erro:', error.response.data);
      }
      return false;
    }
  },

  async listarUsuarios(): Promise<Usuario[]> {
    try {
      const response = await painelApi.get(`${AUTH_ENDPOINT}/usuarios`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Erro ao listar usuários:', error);
      return [];
    }
  },

  async listarAtendentes(): Promise<AtendenteResposta[]> {
    try {
      const response = await painelApi.get(`${AUTH_ENDPOINT}/atendentes`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Erro ao listar atendentes:', error);
      return [];
    }
  },

  async atualizarUsuario(id: string, dados: any): Promise<boolean> {
    try {
      console.log(`📤 [SERVICE] Atualizando usuário ${id}:`, dados);
      
      const response = await painelApi.put(`${AUTH_ENDPOINT}/usuarios/${id}`, dados);
      console.log('✅ [SERVICE] Resposta do servidor:', response.data);
      return true;
    } catch (error: any) {
      console.error('❌ [SERVICE] Erro ao atualizar usuário:', error);
      if (error.response) {
        console.error('📝 [SERVICE] Status:', error.response.status);
        console.error('📝 [SERVICE] Dados do erro:', error.response.data);
        console.error('📝 [SERVICE] URL:', error.config?.url);
      }
      return false;
    }
  },

  async getMetricas(): Promise<any> {
    try {
      const response = await painelApi.get(`${AUTH_ENDPOINT}/metricas`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar métricas:', error);
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await painelApi.post(`${AUTH_ENDPOINT}/logout`);
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
    }
  }
};