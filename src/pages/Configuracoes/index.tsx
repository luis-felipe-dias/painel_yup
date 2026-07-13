import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';
import { 
  Users, 
  Shield, 
  Key, 
  Trash2, 
  Edit2,
  Loader2,
  Plus,
  X,
  UserCog,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

const SETORES_DISPONIVEIS = [
  { id: 'atendimento', nome: 'Atendimento' },
  { id: 'financeiro', nome: 'Financeiro' },
  { id: 'comercial', nome: 'Comercial' },
  { id: 'ouvidoria', nome: 'Ouvidoria' },
  { id: 'qualidade', nome: 'Qualidade' },
  { id: 'tecnico', nome: 'Técnico' },
  { id: 'rh', nome: 'RH' },
];

const PAGINAS_DISPONIVEIS = [
  { id: 'dashboard', nome: 'Dashboard' },
  { id: 'conversas', nome: 'Conversas' },
  { id: 'configuracoes', nome: 'Configurações' },
  { id: 'metricas', nome: 'Métricas' },
];

export default function Configuracoes() {
  const { usuario } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'usuarios' | 'atendentes'>('usuarios');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [atendentes, setAtendentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovoUsuario, setShowNovoUsuario] = useState(false);
  const [showNovoAtendente, setShowNovoAtendente] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState<string | null>(null);
  const [showSenha, setShowSenha] = useState(false);
  const [criando, setCriando] = useState(false);

  const [novoUsuario, setNovoUsuario] = useState({
    nome: '',
    login: '',
    senha: '',
    tipo: 'atendente' as 'admin' | 'atendente' | 'supervisor',
    permissoes: {
      paginas: [] as string[],
      setores: [] as string[]
    }
  });

  const [novoAtendente, setNovoAtendente] = useState({
    nome: '',
    codigo: '',
    senha: ''
  });

  const [usuarioEdit, setUsuarioEdit] = useState<any>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [usuariosData, atendentesData] = await Promise.all([
        authService.listarUsuarios(),
        authService.listarAtendentes()
      ]);
      setUsuarios(usuariosData || []);
      setAtendentes(atendentesData || []);
      console.log('✅ Dados carregados:', { usuarios: usuariosData?.length, atendentes: atendentesData?.length });
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCriarUsuario = async () => {
    console.log('🔄 Iniciando criação de usuário...');
    
    // Validação de campos
    if (!novoUsuario.nome || !novoUsuario.login || !novoUsuario.senha) {
      showToast('Preencha todos os campos', 'warning');
      return;
    }

    // Validação de senha
    const senhaRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!senhaRegex.test(novoUsuario.senha)) {
      showToast('Senha deve ter 8+ caracteres, com maiúscula, minúscula, número e especial', 'error');
      return;
    }

    setCriando(true);
    setLoading(true);
    
    try {
      console.log('📤 Enviando dados para criar usuário:', novoUsuario);
      
      const success = await authService.criarUsuario({
        nome: novoUsuario.nome,
        login: novoUsuario.login,
        senha: novoUsuario.senha,
        tipo: novoUsuario.tipo,
        permissoes: novoUsuario.permissoes
      });
      
      if (success) {
        showToast('Usuário criado com sucesso!', 'success');
        setShowNovoUsuario(false);
        setNovoUsuario({
          nome: '',
          login: '',
          senha: '',
          tipo: 'atendente',
          permissoes: { paginas: [], setores: [] }
        });
        await carregarDados();
      } else {
        showToast('Erro ao criar usuário. Verifique o console.', 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao criar usuário:', error);
      showToast('Erro ao criar usuário', 'error');
    } finally {
      setCriando(false);
      setLoading(false);
    }
  };

  const handleCriarAtendente = async () => {
    console.log('🔄 Iniciando criação de atendente...');
    
    if (!novoAtendente.nome || !novoAtendente.codigo || !novoAtendente.senha) {
      showToast('Preencha todos os campos', 'warning');
      return;
    }

    if (!/^\d{4}$/.test(novoAtendente.codigo)) {
      showToast('Código deve ter 4 dígitos numéricos', 'error');
      return;
    }

    setCriando(true);
    setLoading(true);
    
    try {
      console.log('📤 Enviando dados para criar atendente:', novoAtendente);
      
      const success = await authService.criarAtendente(novoAtendente);
      if (success) {
        showToast('Atendente criado com sucesso!', 'success');
        setShowNovoAtendente(false);
        setNovoAtendente({ nome: '', codigo: '', senha: '' });
        await carregarDados();
      } else {
        showToast('Erro ao criar atendente. Verifique o console.', 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao criar atendente:', error);
      showToast('Erro ao criar atendente', 'error');
    } finally {
      setCriando(false);
      setLoading(false);
    }
  };

  const handleEditarUsuario = (user: any) => {
    setEditandoUsuario(user._id);
    setUsuarioEdit({
      ...user,
      permissoes: user.permissoes || { paginas: [], setores: [] }
    });
  };

  const handleSalvarUsuario = async () => {
    if (!usuarioEdit) return;
    
    setLoading(true);
    try {
      console.log('📤 Atualizando usuário:', usuarioEdit);
      
      const success = await authService.atualizarUsuario(usuarioEdit._id, {
        nome: usuarioEdit.nome,
        tipo: usuarioEdit.tipo,
        permissoes: usuarioEdit.permissoes,
        ativo: usuarioEdit.ativo
      });
      
      if (success) {
        showToast('Usuário atualizado com sucesso!', 'success');
        setEditandoUsuario(null);
        setUsuarioEdit(null);
        await carregarDados();
      } else {
        showToast('Erro ao atualizar usuário', 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar usuário:', error);
      showToast('Erro ao atualizar usuário', 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePaginaEdit = (pagina: string) => {
    if (!usuarioEdit) return;
    setUsuarioEdit({
      ...usuarioEdit,
      permissoes: {
        ...usuarioEdit.permissoes,
        paginas: usuarioEdit.permissoes.paginas.includes(pagina)
          ? usuarioEdit.permissoes.paginas.filter((p: string) => p !== pagina)
          : [...usuarioEdit.permissoes.paginas, pagina]
      }
    });
  };

  const toggleSetorEdit = (setor: string) => {
    if (!usuarioEdit) return;
    setUsuarioEdit({
      ...usuarioEdit,
      permissoes: {
        ...usuarioEdit.permissoes,
        setores: usuarioEdit.permissoes.setores.includes(setor)
          ? usuarioEdit.permissoes.setores.filter((s: string) => s !== setor)
          : [...usuarioEdit.permissoes.setores, setor]
      }
    });
  };

  const togglePagina = (pagina: string) => {
    setNovoUsuario(prev => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        paginas: prev.permissoes.paginas.includes(pagina)
          ? prev.permissoes.paginas.filter(p => p !== pagina)
          : [...prev.permissoes.paginas, pagina]
      }
    }));
  };

  const toggleSetor = (setor: string) => {
    setNovoUsuario(prev => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        setores: prev.permissoes.setores.includes(setor)
          ? prev.permissoes.setores.filter(s => s !== setor)
          : [...prev.permissoes.setores, setor]
      }
    }));
  };

  if (usuario?.tipo !== 'admin') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-[#ff3b30] opacity-50" />
          <h2 className="text-xl font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
            Acesso Restrito
          </h2>
          <p className="text-[#86868b]">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#f5f5f7] dark:bg-[#1a1a1e]">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7] mb-2">
          Configurações
        </h1>
        <p className="text-[#86868b] mb-6">Gerencie usuários e atendentes do sistema</p>

        <div className="flex gap-2 mb-6 bg-white/80 dark:bg-[#1c1c1e]/80 rounded-lg p-1 border border-[#e5e5ea] dark:border-[#38383a]">
          <button
            onClick={() => setActiveTab('usuarios')}
            className={cn(
              "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === 'usuarios'
                ? "bg-[#007aff] text-white"
                : "text-[#86868b] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]"
            )}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Usuários
          </button>
          <button
            onClick={() => setActiveTab('atendentes')}
            className={cn(
              "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === 'atendentes'
                ? "bg-[#007aff] text-white"
                : "text-[#86868b] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]"
            )}
          >
            <Key className="w-4 h-4 inline mr-2" />
            Atendentes
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#007aff]" />
          </div>
        ) : (
          <>
            {activeTab === 'usuarios' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
                    Usuários do Sistema ({usuarios.length})
                  </h2>
                  <Button 
                    onClick={() => setShowNovoUsuario(!showNovoUsuario)} 
                    className="gap-2"
                    disabled={criando}
                  >
                    <Plus className="w-4 h-4" />
                    Novo Usuário
                  </Button>
                </div>

                {showNovoUsuario && (
                  <div className="bg-white/80 dark:bg-[#1c1c1e]/80 rounded-lg p-6 mb-6 border border-[#e5e5ea] dark:border-[#38383a]">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold">Criar Novo Usuário</h3>
                      <button onClick={() => setShowNovoUsuario(false)} className="text-[#86868b] hover:text-[#1c1c1e]">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Nome</label>
                        <Input
                          value={novoUsuario.nome}
                          onChange={(e) => setNovoUsuario(prev => ({ ...prev, nome: e.target.value }))}
                          placeholder="Nome completo"
                          disabled={criando}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Login</label>
                        <Input
                          value={novoUsuario.login}
                          onChange={(e) => setNovoUsuario(prev => ({ ...prev, login: e.target.value }))}
                          placeholder="Usuário para login"
                          disabled={criando}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Senha</label>
                        <div className="relative">
                          <Input
                            type={showSenha ? 'text' : 'password'}
                            value={novoUsuario.senha}
                            onChange={(e) => setNovoUsuario(prev => ({ ...prev, senha: e.target.value }))}
                            placeholder="Mínimo 8 caracteres"
                            className="pr-10"
                            disabled={criando}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSenha(!showSenha)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b]"
                          >
                            {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Tipo</label>
                        <select
                          value={novoUsuario.tipo}
                          onChange={(e) => setNovoUsuario(prev => ({ ...prev, tipo: e.target.value as any }))}
                          className="w-full rounded-md border-0 bg-[#f5f5f7] dark:bg-[#2c2c2e] px-3 py-2 text-sm"
                          disabled={criando}
                        >
                          <option value="admin">Admin</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="atendente">Atendente</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-2">Páginas Permitidas</label>
                      <div className="flex flex-wrap gap-2">
                        {PAGINAS_DISPONIVEIS.map(pagina => (
                          <button
                            key={pagina.id}
                            onClick={() => togglePagina(pagina.id)}
                            className={cn(
                              "px-3 py-1 rounded-full text-sm transition-all",
                              novoUsuario.permissoes.paginas.includes(pagina.id)
                                ? "bg-[#007aff] text-white"
                                : "bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b]"
                            )}
                            disabled={criando}
                          >
                            {pagina.nome}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-2">Setores Permitidos</label>
                      <div className="flex flex-wrap gap-2">
                        {SETORES_DISPONIVEIS.map(setor => (
                          <button
                            key={setor.id}
                            onClick={() => toggleSetor(setor.id)}
                            className={cn(
                              "px-3 py-1 rounded-full text-sm transition-all",
                              novoUsuario.permissoes.setores.includes(setor.id)
                                ? "bg-[#007aff] text-white"
                                : "bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b]"
                            )}
                            disabled={criando}
                          >
                            {setor.nome}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" onClick={() => setShowNovoUsuario(false)} disabled={criando}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCriarUsuario} disabled={criando || loading}>
                        {criando ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          'Criar Usuário'
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {usuarios.map((user) => (
                    <div key={user._id} className="bg-white/80 dark:bg-[#1c1c1e]/80 rounded-lg p-4 border border-[#e5e5ea] dark:border-[#38383a]">
                      {editandoUsuario === user._id && usuarioEdit ? (
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-medium">Editando: {user.nome}</h4>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => { setEditandoUsuario(null); setUsuarioEdit(null); }}>
                                Cancelar
                              </Button>
                              <Button size="sm" onClick={handleSalvarUsuario} disabled={loading}>
                                <Save className="w-4 h-4 mr-1" />
                                Salvar
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Nome</label>
                              <Input
                                value={usuarioEdit.nome}
                                onChange={(e) => setUsuarioEdit({ ...usuarioEdit, nome: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Tipo</label>
                              <select
                                value={usuarioEdit.tipo}
                                onChange={(e) => setUsuarioEdit({ ...usuarioEdit, tipo: e.target.value })}
                                className="w-full rounded-md border-0 bg-[#f5f5f7] dark:bg-[#2c2c2e] px-3 py-2 text-sm"
                              >
                                <option value="admin">Admin</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="atendente">Atendente</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Status</label>
                              <select
                                value={usuarioEdit.ativo ? 'true' : 'false'}
                                onChange={(e) => setUsuarioEdit({ ...usuarioEdit, ativo: e.target.value === 'true' })}
                                className="w-full rounded-md border-0 bg-[#f5f5f7] dark:bg-[#2c2c2e] px-3 py-2 text-sm"
                              >
                                <option value="true">Ativo</option>
                                <option value="false">Inativo</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Login</label>
                              <Input value={user.login} disabled className="bg-[#f5f5f7] dark:bg-[#2c2c2e]" />
                            </div>
                          </div>
                          <div className="mt-4">
                            <label className="block text-sm font-medium mb-2">Páginas Permitidas</label>
                            <div className="flex flex-wrap gap-2">
                              {PAGINAS_DISPONIVEIS.map(pagina => (
                                <button
                                  key={pagina.id}
                                  onClick={() => togglePaginaEdit(pagina.id)}
                                  className={cn(
                                    "px-3 py-1 rounded-full text-sm transition-all",
                                    usuarioEdit.permissoes?.paginas?.includes(pagina.id)
                                      ? "bg-[#007aff] text-white"
                                      : "bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b]"
                                  )}
                                >
                                  {pagina.nome}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="mt-4">
                            <label className="block text-sm font-medium mb-2">Setores Permitidos</label>
                            <div className="flex flex-wrap gap-2">
                              {SETORES_DISPONIVEIS.map(setor => (
                                <button
                                  key={setor.id}
                                  onClick={() => toggleSetorEdit(setor.id)}
                                  className={cn(
                                    "px-3 py-1 rounded-full text-sm transition-all",
                                    usuarioEdit.permissoes?.setores?.includes(setor.id)
                                      ? "bg-[#007aff] text-white"
                                      : "bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b]"
                                  )}
                                >
                                  {setor.nome}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#007aff]/10 flex items-center justify-center">
                              <UserCog className="w-5 h-5 text-[#007aff]" />
                            </div>
                            <div>
                              <div className="font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                                {user.nome}
                              </div>
                              <div className="text-sm text-[#86868b]">
                                @{user.login} • {user.tipo}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              user.ativo ? "bg-[#34c759]/10 text-[#34c759]" : "bg-[#ff3b30]/10 text-[#ff3b30]"
                            )}>
                              {user.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditarUsuario(user)}>
                              <Edit2 className="w-4 h-4 text-[#86868b]" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#ff3b30]">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'atendentes' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
                    Atendentes (Código de Acesso)
                  </h2>
                  <Button onClick={() => setShowNovoAtendente(!showNovoAtendente)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Novo Atendente
                  </Button>
                </div>

                {showNovoAtendente && (
                  <div className="bg-white/80 dark:bg-[#1c1c1e]/80 rounded-lg p-6 mb-6 border border-[#e5e5ea] dark:border-[#38383a]">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold">Criar Novo Atendente</h3>
                      <button onClick={() => setShowNovoAtendente(false)} className="text-[#86868b] hover:text-[#1c1c1e]">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Nome do Atendente</label>
                        <Input
                          value={novoAtendente.nome}
                          onChange={(e) => setNovoAtendente(prev => ({ ...prev, nome: e.target.value }))}
                          placeholder="Nome completo"
                          disabled={criando}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Código (4 dígitos)</label>
                        <Input
                          value={novoAtendente.codigo}
                          onChange={(e) => setNovoAtendente(prev => ({ ...prev, codigo: e.target.value }))}
                          placeholder="Ex: 1234"
                          maxLength={4}
                          disabled={criando}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Senha (4 dígitos)</label>
                        <Input
                          type="password"
                          value={novoAtendente.senha}
                          onChange={(e) => setNovoAtendente(prev => ({ ...prev, senha: e.target.value }))}
                          placeholder="****"
                          maxLength={4}
                          disabled={criando}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" onClick={() => setShowNovoAtendente(false)} disabled={criando}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCriarAtendente} disabled={criando || loading}>
                        {criando ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          'Criar Atendente'
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {atendentes.map((atendente) => (
                    <div key={atendente._id} className="bg-white/80 dark:bg-[#1c1c1e]/80 rounded-lg p-4 border border-[#e5e5ea] dark:border-[#38383a] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#34c759]/10 flex items-center justify-center">
                          <Key className="w-5 h-5 text-[#34c759]" />
                        </div>
                        <div>
                          <div className="font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                            {atendente.nome}
                          </div>
                          <div className="text-sm text-[#86868b]">
                            Código: {atendente.codigo} • {atendente.totalAtendimentos || 0} atendimentos
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#86868b]">
                          {atendente.totalRespostas || 0} respostas
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit2 className="w-4 h-4 text-[#86868b]" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#ff3b30]">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}