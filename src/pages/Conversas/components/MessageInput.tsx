import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { Send, Paperclip, Smile, Mic } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { cn } from '../../../utils/cn';

interface MessageInputProps {
  onSend: (text: string) => Promise<void>;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Fechar seletor ao clicar fora
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
    const emoji = emojiData.emoji;
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  return (
    <div className="p-3 bg-[#f0f2f5] dark:bg-[#1f2c33] border-t border-[#e9edef] dark:border-[#2a3942] shrink-0">
      <form onSubmit={handleSubmit} className="flex items-end gap-2 max-w-4xl mx-auto relative">
        {/* Botões da esquerda */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-[#e9edef] dark:hover:bg-[#2a3942] text-[#54656f] dark:text-[#aebac1]"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          
          {/* Botão Emoji */}
          <Button
            ref={emojiButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleEmojiPicker}
            className={cn(
              "rounded-full hover:bg-[#e9edef] dark:hover:bg-[#2a3942] text-[#54656f] dark:text-[#aebac1] transition-all",
              showEmojiPicker && "bg-[#e9edef] dark:bg-[#2a3942] text-[#007aff]"
            )}
          >
            <Smile className="w-5 h-5" />
          </Button>
        </div>

        {/* Input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem..."
            rows={1}
            className="w-full py-2 px-4 pr-12 bg-white dark:bg-[#2a3942] rounded-lg resize-none outline-none text-[#111b21] dark:text-[#e9edef] placeholder:text-[#667781] dark:placeholder:text-[#8696a0] text-sm min-h-[42px] max-h-[100px] border-0 focus:ring-0"
            disabled={isSending}
            style={{ height: '42px' }}
          />
          {message.trim() && (
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || isSending}
              className="absolute right-1 bottom-1 rounded-full bg-[#00a884] hover:bg-[#008f72] text-white w-8 h-8"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>

        {/* Botão Microfone (aparece quando não tem texto) */}
        {!message.trim() && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-[#e9edef] dark:hover:bg-[#2a3942] text-[#54656f] dark:text-[#aebac1]"
          >
            <Mic className="w-5 h-5" />
          </Button>
        )}

        {/* Seletor de Emojis */}
        {showEmojiPicker && (
          <div 
            ref={pickerRef}
            className="absolute bottom-full left-0 mb-2 z-50"
          >
            <div className="bg-white dark:bg-[#1f2c33] rounded-lg shadow-xl border border-[#e9edef] dark:border-[#2a3942] overflow-hidden">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                width={320}
                height={400}
                skinTonesDisabled={true}
                searchDisabled={false}
                previewConfig={{
                  showPreview: false
                }}
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
}