import { api } from './api/client';

export const mongoInitService = {
  // Inicializar o banco com usuário admin
  async inicializarAdmin(): Promise<boolean> {
    try {
      const adminLogin = import.meta.env.VITE_ADMIN_LOGIN || 'adm';
      const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '#Filial@2026';
      
      console.log('🔧 Inicializando usuário admin...');
      
      const response = await api.post('/auth/inicializar', {
        login: adminLogin,
        senha: adminPassword,
        nome: 'Administrador',
        tipo: 'admin'
      });
      
      if (response.data?.success) {
        console.log('✅ Usuário admin inicializado com sucesso!');
        console.log(`📌 Login: ${adminLogin}`);
        console.log(`🔑 Senha: ${adminPassword}`);
        return true;
      }
      
      return false;
    } catch (error: any) {
      // Se o erro for 409 (usuário já existe), é normal
      if (error?.response?.status === 409) {
        console.log('ℹ️ Usuário admin já existe no banco');
        return true;
      }
      
      console.error('❌ Erro ao inicializar admin:', error);
      return false;
    }
  },

  // Verificar conexão com MongoDB
  async verificarConexao(): Promise<boolean> {
    try {
      const response = await api.get('/auth/health');
      return response.data?.status === 'connected';
    } catch (error) {
      console.error('❌ Erro ao verificar conexão com MongoDB:', error);
      return false;
    }
  }
};