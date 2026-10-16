import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { Send, Paperclip, Smile, Mic, Zap } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { cn } from '../../../utils/cn';
import { RespostaRapidaPicker } from './RespostaRapidaPicker';
import { RespostaRapida, aplicarVariaveis } from '../../../types/respostaRapida.types';

interface MessageInputProps {
  onSend: (text: string) => Promise<void>;
  /** Dados do cliente, para preencher {primeiro_nome}, {telefone} etc. */
  clienteNome?: string;
  clienteTelefone?: string;
  atendenteNome?: string;
}

export function MessageInput({
  onSend,
  clienteNome,
  clienteTelefone,
  atendenteNome,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [atalhoAberto, setAtalhoAberto] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // A lista de atalhos só abre quando a barra é o PRIMEIRO caractere da
  // mensagem. Assim o atendente pode escrever "10/12" ou "R$ 5/un" sem a
  // lista pulando na frente.
  const termoAtalho =
    atalhoAberto && message.startsWith('/') ? message.slice(1) : null;

  useEffect(() => {
    if (message.startsWith('/')) {
      if (!message.includes(' ') && !message.includes('\n')) {
        setAtalhoAberto(true);
        return;
      }
    }
    setAtalhoAberto(false);
  }, [message]);

  // Fechar seletor de emoji ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSend(message.trim());
      setMessage('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.focus();
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Com a lista de atalhos aberta, Enter/setas pertencem a ela.
    if (termoAtalho !== null) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
  };

  const handleEmojiClick = (emojiData: any) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // O texto entra na caixa JÁ com as variáveis resolvidas e NÃO é enviado
  // sozinho: o atendente lê, ajusta e manda. É o que evita o /pix sair com
  // o nome errado.
  const aplicarResposta = (r: RespostaRapida) => {
    const texto = aplicarVariaveis(r.texto, {
      nome: clienteNome,
      telefone: clienteTelefone,
      atendente: atendenteNome,
    });
    setMessage(texto);
    setAtalhoAberto(false);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = texto.length;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    });
  };

  return (
    <div className="p-3 bg-surface-muted border-t border-border shrink-0">
      <form onSubmit={handleSubmit} className="flex items-end gap-2 max-w-4xl mx-auto relative">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Anexar arquivo"
            className="rounded-full hover:bg-surface text-muted-foreground"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Respostas rápidas (digite / )"
            onClick={() => {
              setMessage('/');
              setAtalhoAberto(true);
              inputRef.current?.focus();
            }}
            className={cn(
              'rounded-full hover:bg-surface text-muted-foreground transition-all',
              termoAtalho !== null && 'bg-accent-soft text-accent-foreground'
            )}
          >
            <Zap className="w-5 h-5" />
          </Button>

          <Button
            ref={emojiButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            title="Emoji"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={cn(
              'rounded-full hover:bg-surface text-muted-foreground transition-all',
              showEmojiPicker && 'bg-accent-soft text-accent-foreground'
            )}
          >
            <Smile className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem, ou / para resposta rápida..."
            rows={1}
            className="w-full py-2 px-4 pr-12 bg-surface rounded-lg resize-none outline-none text-foreground placeholder:text-muted-foreground text-sm min-h-[42px] max-h-[100px] border border-border focus:ring-2 focus:ring-ring focus:border-transparent"
            disabled={isSending}
            style={{ height: '42px' }}
          />
          {message.trim() && (
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || isSending}
              className="absolute right-1 bottom-1 rounded-full bg-primary hover:opacity-90 text-primary-foreground w-8 h-8"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>

        {!message.trim() && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Áudio"
            className="rounded-full hover:bg-surface text-muted-foreground"
          >
            <Mic className="w-5 h-5" />
          </Button>
        )}

        {termoAtalho !== null && (
          <RespostaRapidaPicker
            termo={termoAtalho}
            onEscolher={aplicarResposta}
            onFechar={() => setAtalhoAberto(false)}
          />
        )}

        {showEmojiPicker && (
          <div ref={pickerRef} className="absolute bottom-full left-0 mb-2 z-50">
            <div className="bg-popover rounded-lg shadow-pop border border-border overflow-hidden">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                width={320}
                height={400}
                skinTonesDisabled={true}
                searchDisabled={false}
                previewConfig={{ showPreview: false }}
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
