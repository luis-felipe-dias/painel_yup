import React, { useState, useEffect, useRef } from 'react';
import { Modal, ModalContent } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader2, Key, User, CheckCircle, XCircle } from 'lucide-react';
import { authService } from '../../../services/auth.service';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../utils/cn';

interface AtendentePasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (atendenteId: string, atendenteNome: string) => void;
  sessaoNome: string;
}

export function AtendentePasswordModal({ 
  open, 
  onClose, 
  onSuccess, 
  sessaoNome 
}: AtendentePasswordModalProps) {
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [atendenteEncontrado, setAtendenteEncontrado] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!open) {
      setSenha('');
      setError(null);
      setAtendenteEncontrado(null);
      setIsLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleVerificarSenha = async () => {
    if (!senha || senha.length !== 4) {
      setError('Digite uma senha de 4 dígitos');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.verificarAtendentePorSenha(senha);
      
      if (response?.success && response?.atendente) {
        const atendente = response.atendente;
        setAtendenteEncontrado(atendente);
        showToast(`Atendente ${atendente.nome} identificado!`, 'success');
        
        setTimeout(() => {
          onSuccess(atendente._id || '', atendente.nome);
          onClose();
        }, 500);
      } else {
        setError(response?.message || 'Senha inválida. Tente novamente.');
        setSenha('');
        inputRef.current?.focus();
      }
    } catch (err) {
      setError('Erro ao verificar senha. Tente novamente.');
      console.error('Erro ao verificar senha:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerificarSenha();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setSenha(value);
    setError(null);
  };

  return (
    <Modal open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <ModalContent className="max-w-md p-0 overflow-hidden">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#007aff]/10 flex items-center justify-center">
              <Key className="w-8 h-8 text-[#007aff]" />
            </div>
            <h2 className="text-xl font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
              Acessar Conversa
            </h2>
            <p className="text-sm text-[#86868b] mt-1">
              Digite a senha do atendente para abrir a sessão de <strong>{sessaoNome}</strong>
            </p>
          </div>

          {atendenteEncontrado ? (
            <div className="bg-[#34c759]/10 border border-[#34c759]/20 rounded-lg p-4 mb-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-[#34c759]" />
              <div>
                <div className="font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                  {atendenteEncontrado.nome}
                </div>
                <div className="text-xs text-[#86868b]">
                  Código: {atendenteEncontrado.codigo} • {atendenteEncontrado.totalAtendimentos || 0} atendimentos
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">
                  Senha do Atendente (4 dígitos)
                </label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    type="password"
                    value={senha}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="____"
                    maxLength={4}
                    className={cn(
                      "text-center text-2xl tracking-[1.5rem] h-14 bg-[#f5f5f7] dark:bg-[#2c2c2e] border-0",
                      error && "border-2 border-[#ff3b30]"
                    )}
                    disabled={isLoading}
                    autoFocus
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <span className="text-xs text-[#86868b]">{senha.length}/4</span>
                  </div>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-[#ff3b30] flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    {error}
                  </p>
                )}
              </div>

              <div className="flex justify-center gap-2 mb-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-3 h-3 rounded-full transition-all",
                      senha.length >= i ? "bg-[#007aff]" : "bg-[#c6c6c8]"
                    )}
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleVerificarSenha}
              disabled={isLoading || senha.length !== 4}
              className="flex-1 bg-[#007aff] hover:bg-[#0066d9]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <User className="w-4 h-4 mr-2" />
                  Entrar
                </>
              )}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-[#86868b]">
              A senha é o código de 4 dígitos cadastrado para o atendente.
            </p>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}