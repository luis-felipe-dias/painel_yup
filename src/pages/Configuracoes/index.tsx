import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';
import RespostasRapidas from '../RespostasRapidas';
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
  EyeOff,
  Calendar,
  Zap,
  RotateCcw
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
  { id: 'estoque', nome: 'Estoque' },
  { id: 'compras', nome: 'Compras ADM' },
  { id: 'estoque_minimo', nome: 'Estoque Mínimo' },
  { id: 'configuracoes', nome: 'Configurações' },
  { id: 'metricas', nome: 'Métricas' },
];

// Configuração de época (será salva no localStorage)
const EPOCAS = [
  { id: 'dia_a_dia', nome: 'Dia a Dia' },
  { id: 'volta_as_aulas', nome: 'Volta às Aulas' },
];

type Aba = 'usuarios' | 'atendentes' | 'respostas' | 'geral';

// As 4 abas numa lista: no celular viram uma fileira que rola na
// horizontal (antes eram 4 `flex-1` lado a lado, ilegíveis a 360px).
const ABAS: { id: Aba; nome: string; Icone: typeof Users }[] = [
  { id: 'usuarios', nome: 'Usuários', Icone: Users },
  { id: 'atendentes', nome: 'Atendentes', Icone: Key },
  { id: 'respostas', nome: 'Respostas rápidas', Icone: Zap },
  { id: 'geral', nome: 'Geral', Icone: Calendar },
];

// Classe única dos <select> nativos — alvo de toque de 44px no celular.
const SELECT_CLASSE =
  'w-full h-toque md:h-9 rounded-md border border-border bg-surface-muted px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

// Cartão padrão de conteúdo. Sem vidro de propósito: backdrop-filter é
// caro e só se justifica em superfície fixa (aqui, a barra de abas).
const CARTAO_CLASSE = 'bg-surface border border-border rounded-lg shadow-card';

export default function Configuracoes() {
  const { usuario } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Aba>('usuarios');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [atendentes, setAtendentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovoUsuario, setShowNovoUsuario] = useState(false);
  const [showNovoAtendente, setShowNovoAtendente] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState<string | null>(null);
  const [showSenha, setShowSenha] = useState(false);
  const [criando, setCriando] = useState(false);
  
  // Configurações gerais
  const [epocaSelecionada, setEpocaSelecionada] = useState<string>(
    localStorage.getItem('epoca_estoque') || 'dia_a_dia'
  );

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

  // Salvar época no localStorage
  const handleSalvarEpoca = (epoca: string) => {
    setEpocaSelecionada(epoca);
    localStorage.setItem('epoca_estoque', epoca);
    showToast(`Época alterada para: ${EPOCAS.find(e => e.id === epoca)?.nome}`, 'success');
  };

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
    if (!novoUsuario.nome || !novoUsuario.login || !novoUsuario.senha) {
      showToast('Preencha todos os campos', 'warning');
      return;
    }

    const senhaRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!senhaRegex.test(novoUsuario.senha)) {
      showToast('Senha deve ter 8+ caracteres, com maiúscula, minúscula, número e especial', 'error');
      return;
    }

    setCriando(true);
    setLoading(true);
    
    try {
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

  // A lixeira não tinha onClick nenhuma: clicava e nada acontecia.
  // Desativa em vez de apagar - o histórico de atendimento aponta pro id
  // do usuário, apagar deixaria as métricas sem nome.
  const handleToggleAtivoUsuario = async (user: any) => {
    const desativar = user.ativo !== false;
    if (user.login === 'adm' && desativar) {
      showToast('O usuário adm não pode ser desativado', 'warning');
      return;
    }
    if (!window.confirm(`${desativar ? 'Desativar' : 'Reativar'} o usuário ${user.nome}?`)) return;

    setLoading(true);
    const ok = await authService.atualizarUsuario(user._id, { ativo: !desativar });
    if (ok) {
      showToast(`Usuário ${desativar ? 'desativado' : 'reativado'}`, 'success');
      await carregarDados();
    } else {
      showToast('Não foi possível atualizar o usuário', 'error');
      setLoading(false);
    }
  };

  const handleToggleAtivoAtendente = async (atendente: any) => {
    const desativar = atendente.ativo !== false;
    if (!window.confirm(`${desativar ? 'Desativar' : 'Reativar'} o atendente ${atendente.nome}?`)) return;

    setLoading(true);
    const ok = await authService.atualizarAtendente(atendente._id, { ativo: !desativar });
    if (ok) {
      showToast(`Atendente ${desativar ? 'desativado' : 'reativado'}`, 'success');
      await carregarDados();
    } else {
      showToast('Não foi possível atualizar o atendente', 'error');
      setLoading(false);
    }
  };

  const handleRenomearAtendente = async (atendente: any) => {
    const nome = window.prompt('Nome do atendente:', atendente.nome);
    if (!nome || nome.trim() === atendente.nome) return;

    setLoading(true);
    const ok = await authService.atualizarAtendente(atendente._id, { nome: nome.trim() });
    if (ok) {
      showToast('Atendente atualizado', 'success');
      await carregarDados();
    } else {
      showToast('Não foi possível atualizar o atendente', 'error');
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
      <div className="h-full flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-xs">
          <Shield className="w-12 h-12 mx-auto mb-4 text-destructive opacity-60" />
          <h2 className="text-lg md:text-xl font-semibold text-foreground">
            Acesso Restrito
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    // Um container de rolagem só, pra barra de abas poder ficar `sticky`.
    // overflow-x-hidden: a 360px nada pode empurrar a página pro lado.
    <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-custom bg-background text-foreground">
      <div className="max-w-6xl mx-auto">
        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-3">
          <h1 className="text-lg md:text-2xl font-semibold text-foreground">
            Configurações
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie usuários, atendentes e preferências do sistema
          </p>
        </div>

        {/* Único vidro da tela: barra fixa no topo. */}
        <div className="glass-thin sticky top-0 z-10 rounded-none border-x-0 border-t-0 px-4 md:px-6 py-2">
          <div
            className="flex gap-1 overflow-x-auto scrollbar-custom -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible"
            role="tablist"
            aria-label="Seções das configurações"
          >
            {ABAS.map(({ id, nome, Icone }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'foco-anel shrink-0 whitespace-nowrap md:flex-1 inline-flex items-center justify-center gap-2 px-3 h-toque rounded-md text-sm font-medium transition-colors',
                  activeTab === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-muted'
                )}
              >
                <Icone className="w-4 h-4 shrink-0" />
                {nome}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent-foreground" />
            </div>
          ) : (
            <>
              {activeTab === 'usuarios' && (
                <div>
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                    <h2 className="text-base md:text-lg font-semibold text-foreground">
                      Usuários do Sistema ({usuarios.length})
                    </h2>
                    <Button 
                      onClick={() => setShowNovoUsuario(!showNovoUsuario)} 
                      className="gap-2 w-full sm:w-auto h-toque md:h-9"
                      disabled={criando}
                    >
                      <Plus className="w-4 h-4" />
                      Novo Usuário
                    </Button>
                  </div>

                  {showNovoUsuario && (
                    <div className={cn(CARTAO_CLASSE, 'p-4 md:p-6 mb-6 animate-fade-in')}>
                      <div className="flex justify-between items-center gap-2 mb-4">
                        <h3 className="font-semibold text-foreground">Criar Novo Usuário</h3>
                        <button
                          type="button"
                          onClick={() => setShowNovoUsuario(false)}
                          className="foco-anel h-toque w-toque md:h-8 md:w-8 -mr-2 md:mr-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors"
                          aria-label="Fechar formulário de novo usuário"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      {/* 1 coluna no celular: dois campos lado a lado a 360px
                          deixam o rótulo cortado. */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="novo-usuario-nome" className="block text-sm font-medium text-foreground mb-1">Nome</label>
                          <Input
                            id="novo-usuario-nome"
                            className="h-toque md:h-9"
                            value={novoUsuario.nome}
                            onChange={(e) => setNovoUsuario(prev => ({ ...prev, nome: e.target.value }))}
                            placeholder="Nome completo"
                            autoComplete="off"
                            disabled={criando}
                          />
                        </div>
                        <div>
                          <label htmlFor="novo-usuario-login" className="block text-sm font-medium text-foreground mb-1">Login</label>
                          <Input
                            id="novo-usuario-login"
                            className="h-toque md:h-9"
                            value={novoUsuario.login}
                            onChange={(e) => setNovoUsuario(prev => ({ ...prev, login: e.target.value }))}
                            placeholder="Usuário para login"
                            autoComplete="off"
                            disabled={criando}
                          />
                        </div>
                        <div>
                          <label htmlFor="novo-usuario-senha" className="block text-sm font-medium text-foreground mb-1">Senha</label>
                          <div className="relative">
                            <Input
                              id="novo-usuario-senha"
                              type={showSenha ? 'text' : 'password'}
                              value={novoUsuario.senha}
                              onChange={(e) => setNovoUsuario(prev => ({ ...prev, senha: e.target.value }))}
                              placeholder="Mínimo 8 caracteres"
                              className="pr-12 h-toque md:h-9"
                              autoComplete="off"
                              disabled={criando}
                            />
                            <button
                              type="button"
                              onClick={() => setShowSenha(!showSenha)}
                              className="foco-anel absolute right-0 top-1/2 -translate-y-1/2 h-toque w-toque md:h-9 md:w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={showSenha ? 'Esconder senha' : 'Mostrar senha'}
                            >
                              {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            8+ caracteres, com maiúscula, minúscula, número e caractere especial.
                          </p>
                        </div>
                        <div>
                          <label htmlFor="novo-usuario-tipo" className="block text-sm font-medium text-foreground mb-1">Tipo</label>
                          <select
                            id="novo-usuario-tipo"
                            value={novoUsuario.tipo}
                            onChange={(e) => setNovoUsuario(prev => ({ ...prev, tipo: e.target.value as any }))}
                            className={SELECT_CLASSE}
                            disabled={criando}
                          >
                            <option value="admin">Admin</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="atendente">Atendente</option>
                          </select>
                        </div>
                      </div>

                      <GradePermissoes
                        titulo="Páginas Permitidas"
                        itens={PAGINAS_DISPONIVEIS}
                        selecionados={novoUsuario.permissoes.paginas}
                        onToggle={togglePagina}
                        disabled={criando}
                      />

                      <GradePermissoes
                        titulo="Setores Permitidos"
                        itens={SETORES_DISPONIVEIS}
                        selecionados={novoUsuario.permissoes.setores}
                        onToggle={toggleSetor}
                        disabled={criando}
                      />

                      {/* Barra de ação: no celular os dois botões dividem a
                          largura toda; no desktop volta pro canto direito. */}
                      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setShowNovoUsuario(false)}
                          disabled={criando}
                          className="w-full sm:w-auto h-toque md:h-9"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCriarUsuario}
                          disabled={criando || loading}
                          className="w-full sm:w-auto h-toque md:h-9"
                        >
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
                    {usuarios.length === 0 && (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        Nenhum usuário cadastrado ainda. Use "Novo Usuário" para criar o primeiro acesso ao painel.
                      </p>
                    )}
                    {usuarios.map((user) => (
                      <div key={user._id} className={cn(CARTAO_CLASSE, 'p-3 md:p-4')}>
                        {editandoUsuario === user._id && usuarioEdit ? (
                          <div>
                            <h4 className="font-medium text-foreground mb-4">Editando: {user.nome}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label htmlFor={`edit-nome-${user._id}`} className="block text-sm font-medium text-foreground mb-1">Nome</label>
                                <Input
                                  id={`edit-nome-${user._id}`}
                                  className="h-toque md:h-9"
                                  value={usuarioEdit.nome}
                                  onChange={(e) => setUsuarioEdit({ ...usuarioEdit, nome: e.target.value })}
                                />
                              </div>
                              <div>
                                <label htmlFor={`edit-tipo-${user._id}`} className="block text-sm font-medium text-foreground mb-1">Tipo</label>
                                <select
                                  id={`edit-tipo-${user._id}`}
                                  value={usuarioEdit.tipo}
                                  onChange={(e) => setUsuarioEdit({ ...usuarioEdit, tipo: e.target.value })}
                                  className={SELECT_CLASSE}
                                >
                                  <option value="admin">Admin</option>
                                  <option value="supervisor">Supervisor</option>
                                  <option value="atendente">Atendente</option>
                                </select>
                              </div>
                              <div>
                                <label htmlFor={`edit-status-${user._id}`} className="block text-sm font-medium text-foreground mb-1">Status</label>
                                <select
                                  id={`edit-status-${user._id}`}
                                  value={usuarioEdit.ativo ? 'true' : 'false'}
                                  onChange={(e) => setUsuarioEdit({ ...usuarioEdit, ativo: e.target.value === 'true' })}
                                  className={SELECT_CLASSE}
                                >
                                  <option value="true">Ativo</option>
                                  <option value="false">Inativo</option>
                                </select>
                              </div>
                              <div>
                                <label htmlFor={`edit-login-${user._id}`} className="block text-sm font-medium text-foreground mb-1">Login</label>
                                <Input
                                  id={`edit-login-${user._id}`}
                                  value={user.login}
                                  disabled
                                  className="h-toque md:h-9 bg-surface-muted"
                                />
                              </div>
                            </div>

                            <GradePermissoes
                              titulo="Páginas Permitidas"
                              itens={PAGINAS_DISPONIVEIS}
                              selecionados={usuarioEdit.permissoes?.paginas || []}
                              onToggle={togglePaginaEdit}
                            />

                            <GradePermissoes
                              titulo="Setores Permitidos"
                              itens={SETORES_DISPONIVEIS}
                              selecionados={usuarioEdit.permissoes?.setores || []}
                              onToggle={toggleSetorEdit}
                            />

                            {/* Cancelar/Salvar no fim do formulário, não num
                                canto minúsculo lá em cima. */}
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
                              <Button
                                variant="outline"
                                onClick={() => { setEditandoUsuario(null); setUsuarioEdit(null); }}
                                className="w-full sm:w-auto h-toque md:h-9"
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={handleSalvarUsuario}
                                disabled={loading}
                                className="w-full sm:w-auto h-toque md:h-9"
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Salvar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // Empilhado no celular: identidade em cima, ações
                          // embaixo à direita.
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-3 basis-full md:basis-auto md:flex-1 min-w-0">
                              <div className="w-10 h-10 shrink-0 rounded-full bg-accent/12 flex items-center justify-center">
                                <UserCog className="w-5 h-5 text-accent-foreground" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-foreground truncate">
                                  {user.nome}
                                </div>
                                <div className="text-sm text-muted-foreground truncate">
                                  @{user.login} • {user.tipo}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-auto shrink-0">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                user.ativo
                                  ? "bg-atendendo/15 text-atendendo-ink"
                                  : "bg-destructive/12 text-destructive"
                              )}>
                                {user.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-toque w-toque md:h-8 md:w-8 text-muted-foreground"
                                title="Editar usuário"
                                aria-label={`Editar ${user.nome}`}
                                onClick={() => handleEditarUsuario(user)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-toque w-toque md:h-8 md:w-8 text-destructive"
                                title={user.ativo === false ? 'Reativar usuário' : 'Desativar usuário'}
                                aria-label={user.ativo === false ? `Reativar ${user.nome}` : `Desativar ${user.nome}`}
                                onClick={() => handleToggleAtivoUsuario(user)}
                              >
                                {user.ativo === false
                                  ? <RotateCcw className="w-4 h-4" />
                                  : <Trash2 className="w-4 h-4" />}
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
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                    <h2 className="text-base md:text-lg font-semibold text-foreground">
                      Atendentes (Código de Acesso)
                    </h2>
                    <Button
                      onClick={() => setShowNovoAtendente(!showNovoAtendente)}
                      className="gap-2 w-full sm:w-auto h-toque md:h-9"
                    >
                      <Plus className="w-4 h-4" />
                      Novo Atendente
                    </Button>
                  </div>

                  {showNovoAtendente && (
                    <div className={cn(CARTAO_CLASSE, 'p-4 md:p-6 mb-6 animate-fade-in')}>
                      <div className="flex justify-between items-center gap-2 mb-4">
                        <h3 className="font-semibold text-foreground">Criar Novo Atendente</h3>
                        <button
                          type="button"
                          onClick={() => setShowNovoAtendente(false)}
                          className="foco-anel h-toque w-toque md:h-8 md:w-8 -mr-2 md:mr-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors"
                          aria-label="Fechar formulário de novo atendente"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label htmlFor="novo-atendente-nome" className="block text-sm font-medium text-foreground mb-1">Nome do Atendente</label>
                          <Input
                            id="novo-atendente-nome"
                            className="h-toque md:h-9"
                            value={novoAtendente.nome}
                            onChange={(e) => setNovoAtendente(prev => ({ ...prev, nome: e.target.value }))}
                            placeholder="Nome completo"
                            autoComplete="off"
                            disabled={criando}
                          />
                        </div>
                        <div>
                          <label htmlFor="novo-atendente-codigo" className="block text-sm font-medium text-foreground mb-1">Código (4 dígitos)</label>
                          {/* inputMode numeric: abre o teclado de números no celular. */}
                          <Input
                            id="novo-atendente-codigo"
                            className="h-toque md:h-9 tnum"
                            value={novoAtendente.codigo}
                            onChange={(e) => setNovoAtendente(prev => ({ ...prev, codigo: e.target.value }))}
                            placeholder="Ex: 1234"
                            maxLength={4}
                            inputMode="numeric"
                            autoComplete="off"
                            disabled={criando}
                          />
                        </div>
                        <div>
                          <label htmlFor="novo-atendente-senha" className="block text-sm font-medium text-foreground mb-1">Senha (4 dígitos)</label>
                          <Input
                            id="novo-atendente-senha"
                            type="password"
                            className="h-toque md:h-9 tnum"
                            value={novoAtendente.senha}
                            onChange={(e) => setNovoAtendente(prev => ({ ...prev, senha: e.target.value }))}
                            placeholder="****"
                            maxLength={4}
                            inputMode="numeric"
                            autoComplete="off"
                            disabled={criando}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setShowNovoAtendente(false)}
                          disabled={criando}
                          className="w-full sm:w-auto h-toque md:h-9"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCriarAtendente}
                          disabled={criando || loading}
                          className="w-full sm:w-auto h-toque md:h-9"
                        >
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
                    {atendentes.length === 0 && (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        Nenhum atendente cadastrado. O atendente usa código de 4 dígitos para assumir conversas no painel.
                      </p>
                    )}
                    {atendentes.map((atendente) => (
                      <div key={atendente._id} className={cn(CARTAO_CLASSE, 'p-3 md:p-4 flex flex-wrap items-center gap-2')}>
                        <div className="flex items-center gap-3 basis-full md:basis-auto md:flex-1 min-w-0">
                          <div className="w-10 h-10 shrink-0 rounded-full bg-atendendo/15 flex items-center justify-center">
                            <Key className="w-5 h-5 text-atendendo-ink" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">
                              {atendente.nome}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              Código: <span className="tnum">{atendente.codigo}</span>
                              {' • '}
                              <span className="tnum">{atendente.totalAtendimentos || 0}</span> atendimentos
                            </div>
                            {/* Contagem de respostas vinha solta na direita e
                                sumia no celular; agora é metadado do nome. */}
                            <div className="text-xs text-muted-foreground">
                              <span className="tnum">{atendente.totalRespostas || 0}</span> respostas enviadas
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-auto shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-toque w-toque md:h-8 md:w-8 text-muted-foreground"
                            title="Renomear atendente"
                            aria-label={`Renomear ${atendente.nome}`}
                            onClick={() => handleRenomearAtendente(atendente)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-toque w-toque md:h-8 md:w-8 text-destructive"
                            title={atendente.ativo === false ? 'Reativar atendente' : 'Desativar atendente'}
                            aria-label={atendente.ativo === false ? `Reativar ${atendente.nome}` : `Desativar ${atendente.nome}`}
                            onClick={() => handleToggleAtivoAtendente(atendente)}
                          >
                            {atendente.ativo === false
                              ? <RotateCcw className="w-4 h-4" />
                              : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'respostas' && (
                // Padding menor no celular: a lista de respostas já tem o
                // seu próprio respiro interno.
                <div className={cn(CARTAO_CLASSE, 'p-3 md:p-6')}>
                  <RespostasRapidas embutido />
                </div>
              )}

              {activeTab === 'geral' && (
                <div className={cn(CARTAO_CLASSE, 'p-4 md:p-6')}>
                  <h2 className="text-base md:text-lg font-semibold text-foreground mb-4">
                    Preferências do Sistema
                  </h2>

                  <div className="space-y-6">
                    {/* Seletor de Época */}
                    <div>
                      <span className="block text-sm font-medium text-foreground mb-2">
                        Época para Reposição de Estoque
                      </span>
                      <p className="text-sm text-muted-foreground mb-3">
                        Selecione a época que define o estoque mínimo a ser considerado na página de reposição.
                      </p>
                      {/* Uma coluna no celular: os dois botões em linha
                          quebravam o texto no meio a 360px. */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                        {EPOCAS.map((epoca) => {
                          const ativa = epocaSelecionada === epoca.id;
                          return (
                            <button
                              key={epoca.id}
                              type="button"
                              onClick={() => handleSalvarEpoca(epoca.id)}
                              aria-pressed={ativa}
                              className={cn(
                                "foco-anel flex items-center gap-2 px-4 h-toque rounded-xl text-sm font-medium transition-colors border-2 text-left",
                                ativa
                                  ? "border-primary bg-accent/12 text-accent-foreground"
                                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                              )}
                            >
                              <span className={cn(
                                "w-2 h-2 shrink-0 rounded-full",
                                ativa ? "bg-primary" : "bg-muted-foreground"
                              )} />
                              {epoca.nome}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 text-sm text-atendendo-ink">
                        {epocaSelecionada === 'dia_a_dia' 
                          ? '✅ Usando estoque mínimo padrão para reposição'
                          : '✅ Usando estoque mínimo de volta às aulas para reposição'}
                      </div>
                    </div>

                    {/* Separador */}
                    <div className="border-t border-border pt-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            Configuração salva localmente
                          </p>
                          <p className="text-xs text-muted-foreground">
                            A preferência de época é salva no seu navegador.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEpocaSelecionada('dia_a_dia');
                            localStorage.setItem('epoca_estoque', 'dia_a_dia');
                            showToast('Configurações resetadas para o padrão', 'info');
                          }}
                          className="w-full sm:w-auto h-toque md:h-9 text-muted-foreground"
                        >
                          Resetar Padrão
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Grade de permissões (páginas ou setores). Fora da função da página de
 * propósito: declarada dentro, o React remontaria a grade inteira a cada
 * tecla digitada no formulário.
 *
 * Mobile: 2 colunas com alvo de 44px — como "pílula" em `flex-wrap`, os
 * chips ficavam de larguras diferentes e pequenos demais pro dedo.
 */
function GradePermissoes({
  titulo,
  itens,
  selecionados,
  onToggle,
  disabled = false,
}: {
  titulo: string;
  itens: { id: string; nome: string }[];
  selecionados: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="mt-4" disabled={disabled}>
      <legend className="block text-sm font-medium text-foreground mb-2">{titulo}</legend>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {itens.map((item) => {
          const ativo = selecionados.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              aria-pressed={ativo}
              className={cn(
                "foco-anel h-toque md:h-9 px-3 rounded-md text-sm text-left truncate transition-colors disabled:opacity-50",
                ativo
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-surface-muted text-muted-foreground hover:text-foreground"
              )}
              disabled={disabled}
            >
              {item.nome}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
