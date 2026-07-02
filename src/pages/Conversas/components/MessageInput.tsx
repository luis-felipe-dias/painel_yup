import { useState, useRef } from "react";
import { Button } from "../../../components/ui/Button";
import { Send, Paperclip, Smile, Mic } from "lucide-react";

interface MessageInputProps {
  onSend: (text: string) => Promise<void>;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSend(message.trim());
      setMessage("");
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.focus();
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
  };

  return (
    <div className="p-3 bg-[#DDE3F1] dark:bg-[#1B213B] border-t border-[#C5CDE0] dark:border-[#2A3360] shrink-0">
      <form onSubmit={handleSubmit} className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-[#C5CDE0] dark:hover:bg-[#2A3360] text-[#4A5080] dark:text-[#A5B0D0]"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-[#C5CDE0] dark:hover:bg-[#2A3360] text-[#4A5080] dark:text-[#A5B0D0]"
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
            placeholder="Digite uma mensagem..."
            rows={1}
            className="w-full py-2 px-4 pr-12 bg-white dark:bg-[#2A3360] rounded-lg resize-none outline-none text-[#272D4F] dark:text-[#DDE3F1] placeholder:text-[#4A5080] dark:placeholder:text-[#A5B0D0] text-sm min-h-[42px] max-h-[100px] border-0 focus:ring-0"
            disabled={isSending}
            style={{ height: '42px' }}
          />
          {message.trim() && (
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || isSending}
              className="absolute right-1 bottom-1 rounded-full bg-[#EA70B0] hover:bg-[#D860A0] text-white w-8 h-8"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
            className="rounded-full hover:bg-[#C5CDE0] dark:hover:bg-[#2A3360] text-[#4A5080] dark:text-[#A5B0D0]"
          >
            <Mic className="w-5 h-5" />
          </Button>
        )}
      </form>
    </div>
  );
}