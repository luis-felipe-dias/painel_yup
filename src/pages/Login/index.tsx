import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Loader2, Lock, User } from 'lucide-react';
import { MarcaCompleta } from "../../components/Marca";

// Única tela sem sidebar nem header, então o fundo `ambiente` precisa ser
// aplicado aqui (nas outras vem do RootLayout). O cartão é a única
// superfície de vidro da tela - `glass-solid`, porque é modal de entrada.
// Lógica de autenticação intocada.
export default function Login() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: fazerLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !senha) return;

    setLoading(true);
    try {
      const success = await fazerLogin(login, senha);
      if (success) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ambiente min-h-screen flex items-center justify-center p-4">
      {/* No celular o cartão ocupa a largura menos a margem; no desktop para
          em max-w-sm pra não virar um formulário largo e vazio. */}
      <div className="glass-solid shadow-vidro-alto rounded-2xl w-[calc(100%-2rem)] max-w-sm p-6 md:p-8 animate-fade-in">
        <div className="text-center mb-7 md:mb-8">
          {/* Aqui sobra altura: entra a marca completa, sem caixa em
              volta. O neon só acende no tema escuro — a marca é uma
              lâmpada, e apagada sobre fundo escuro parecia defeito. */}
          <div className="mb-4 flex justify-center text-foreground">
            <MarcaCompleta neon className="h-20 w-20 md:h-24 md:w-24" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Central Yup
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Atendimento e operação</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-usuario"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Usuário
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="login-usuario"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Digite seu usuário"
                autoComplete="username"
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="pl-10 h-toque md:h-10 bg-surface-muted border-border"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-senha"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="login-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                className="pl-10 h-toque md:h-10 bg-surface-muted border-border"
                disabled={loading}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-toque md:h-10 text-sm font-medium"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Sistema protegido • Acesso restrito
          </p>
        </div>
      </div>
    </div>
  );
}
