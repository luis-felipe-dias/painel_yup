import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Usuario, AuthContextType } from '../types/auth.types';
import { authService } from '../services/auth.service';
import { useToast } from '../hooks/useToast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('usuario');
    if (savedUser) {
      try {
        setUsuario(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('usuario');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (login: string, senha: string): Promise<boolean> => {
    try {
      const response = await authService.login(login, senha);
      if (response.success && response.usuario) {
        setUsuario(response.usuario);
        localStorage.setItem('usuario', JSON.stringify(response.usuario));
        if (response.token) {
          localStorage.setItem('token', response.token);
        }
        showToast('Login realizado com sucesso!', 'success');
        return true;
      } else {
        showToast(response.message || 'Erro ao fazer login', 'error');
        return false;
      }
    } catch (error) {
      showToast('Erro ao fazer login', 'error');
      return false;
    }
  }, [showToast]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setUsuario(null);
      localStorage.removeItem('usuario');
      localStorage.removeItem('token');
      showToast('Logout realizado', 'info');
    }
  }, [showToast]);

  const hasPermission = useCallback((pagina: string): boolean => {
    if (!usuario) return false;
    if (usuario.tipo === 'admin') return true;
    return usuario.permissoes?.paginas?.includes(pagina) || false;
  }, [usuario]);

  const hasSessaoPermission = useCallback((setor: string): boolean => {
    if (!usuario) return false;
    if (usuario.tipo === 'admin') return true;
    if (!usuario.permissoes?.setores) return false;
    return usuario.permissoes.setores.includes(setor) || usuario.permissoes.setores.includes('*');
  }, [usuario]);

  const value = {
    usuario,
    loading,
    login,
    logout,
    isAuthenticated: !!usuario,
    hasPermission,
    hasSessaoPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};