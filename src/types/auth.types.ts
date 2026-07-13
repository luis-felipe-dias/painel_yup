export interface Usuario {
  _id?: string;
  nome: string;
  login: string;
  senha: string;
  tipo: 'admin' | 'atendente' | 'supervisor';
  permissoes: {
    paginas: string[];
    setores?: string[];
  };
  criadoEm: Date;
  ultimoAcesso?: Date;
  ativo: boolean;
}

export interface AtendenteResposta {
  _id?: string;
  nome: string;
  codigo: string;
  senha: string;
  sessaoAtual?: string;
  ultimaSessao?: string;
  totalAtendimentos: number;
  totalRespostas: number;
  criadoEm: Date;
  ativo: boolean;
}

export interface SessaoAtendimento {
  sessaoId: string;
  atendenteId: string;
  atendenteNome: string;
  abertaEm: Date;
  ultimaMensagem: Date;
  respostas: number;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  usuario?: Usuario;
  message?: string;
}

export interface AuthContextType {
  usuario: Usuario | null;
  loading: boolean;
  login: (login: string, senha: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (pagina: string) => boolean;
  hasSessaoPermission: (setor: string) => boolean;
}

// Novo tipo para resposta de verificação de atendente
export interface VerificarAtendenteResponse {
  success: boolean;
  atendente?: AtendenteResposta;
  message?: string;
}