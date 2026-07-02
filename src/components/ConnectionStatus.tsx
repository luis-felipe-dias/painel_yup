import { useEffect, useState } from 'react';
import { api } from '../services/api/client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function ConnectionStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [message, setMessage] = useState('Verificando conexão...');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await api.get('/human/sessoes', { params: { limit: 1 } });
        setStatus('connected');
        setMessage('Conectado à API');
      } catch (error) {
        setStatus('error');
        setMessage('Erro ao conectar com a API');
        console.error('Erro de conexão:', error);
      }
    };

    checkConnection();
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-[#DDE3F1] dark:bg-[#2A3360]">
      {status === 'checking' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-[#4A5080] dark:text-[#A5B0D0]" />
          <span className="text-[#4A5080] dark:text-[#A5B0D0]">{message}</span>
        </>
      )}
      {status === 'connected' && (
        <>
          <CheckCircle className="w-3 h-3 text-[#ACBD6F]" />
          <span className="text-[#272D4F] dark:text-[#DDE3F1]">{message}</span>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="w-3 h-3 text-[#F15040]" />
          <span className="text-[#F15040]">{message}</span>
        </>
      )}
    </div>
  );
}