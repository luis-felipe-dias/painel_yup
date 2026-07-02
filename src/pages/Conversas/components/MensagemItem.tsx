import React, { memo, useState, useRef, useEffect } from 'react';
import { Message } from '../../../types/chat.types';
import { format } from 'date-fns';
import { cn } from '../../../utils/cn';
import { 
  Image as ImageIcon,
  Video, 
  Music, 
  FileText, 
  Download, 
  Share2,
  Bot,
  User,
  Check,
  AlertCircle
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { EncaminharPopover } from "./EncaminharPopover";

interface MensagemItemProps {
  mensagem: Message;
  sessaoId: string;
}

// Memoizado com comparação profunda de props
const MensagemItemComponent = memo(({ mensagem, sessaoId }: MensagemItemProps) => {
  const [imageError, setImageError] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const isCliente = mensagem.remetente === "cliente";
  const isPepper = mensagem.remetente === "pepper";
  const isAtendente = mensagem.remetente === "atendente";
  const isFromMe = isAtendente || isPepper;

  const getAvatar = () => {
    if (isCliente) return <User className="w-4 h-4 text-[#272D4F] dark:text-[#DDE3F1]" />;
    if (isPepper) return <Bot className="w-4 h-4 text-[#FEFDEB]" />;
    if (isAtendente) return <User className="w-4 h-4 text-[#FEFDEB]" />;
    return null;
  };

  const getAvatarBg = () => {
    if (isCliente) return "bg-[#DDE3F1] dark:bg-[#2A3360]";
    if (isPepper) return "bg-[#EA70B0]";
    if (isAtendente) return "bg-[#ACBD6F]";
    return "bg-[#DDE3F1] dark:bg-[#2A3360]";
  };

  const handleMediaError = (e: any) => {
    e.preventDefault?.();
    setMediaError(true);
    return false;
  };

  const handleMediaLoad = () => {
    setIsLoaded(true);
  };

  const renderContent = () => {
    if (mediaError && mensagem.tipo !== 'texto' && mensagem.tipo !== 'botao') {
      return (
        <div className="flex items-center gap-3 p-3 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg max-w-[300px]">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-yellow-700 dark:text-yellow-400">
              Mídia indisponível
            </div>
            {mensagem.metadata?.nomeArquivo && (
              <div className="text-xs text-yellow-600 dark:text-yellow-500">
                {mensagem.metadata.nomeArquivo}
              </div>
            )}
          </div>
          {mensagem.metadata?.url && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => window.open(mensagem.metadata?.url, "_blank")}
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
      );
    }

    switch (mensagem.tipo) {
      case "texto":
        return (
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {mensagem.conteudo}
          </div>
        );
      case "imagem":
        return (
          <div className="space-y-1">
            {mensagem.metadata?.url && !imageError ? (
              <img
                ref={imgRef}
                src={mensagem.metadata.url}
                alt={mensagem.metadata?.legenda || "Imagem"}
                className={cn(
                  "max-w-[300px] max-h-[400px] rounded-lg cursor-pointer hover:opacity-95 transition-opacity object-cover",
                  !isLoaded && "min-h-[100px] bg-gray-100 dark:bg-gray-800"
                )}
                onClick={() => window.open(mensagem.metadata?.url, "_blank")}
                onError={handleMediaError}
                onLoad={handleMediaLoad}
                loading="lazy"
              />
            ) : (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-white/50 dark:bg-[#1B213B]/50 max-w-[300px]">
                <ImageIcon className="w-6 h-6 text-[#4A5080] dark:text-[#A5B0D0]" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate text-[#272D4F] dark:text-[#DDE3F1]">
                    {mensagem.metadata?.nomeArquivo || "Imagem indisponível"}
                  </div>
                </div>
                {mensagem.metadata?.url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(mensagem.metadata?.url, "_blank")}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            {mensagem.metadata?.legenda && (
              <div className="text-sm text-[#4A5080] dark:text-[#A5B0D0] mt-1">
                {mensagem.metadata.legenda}
              </div>
            )}
          </div>
        );
      case "video":
        return (
          <div className="max-w-[300px]">
            {mensagem.metadata?.url ? (
              <video
                ref={videoRef}
                src={mensagem.metadata.url}
                controls
                className={cn(
                  "rounded-lg w-full",
                  !isLoaded && "min-h-[150px] bg-gray-100 dark:bg-gray-800"
                )}
                controlsList="nodownload"
                onError={handleMediaError}
                onLoadedMetadata={handleMediaLoad}
                preload="metadata"
                playsInline
              >
                <p>Seu navegador não suporta vídeos.</p>
              </video>
            ) : (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-white/50 dark:bg-[#1B213B]/50">
                <Video className="w-6 h-6 text-[#4A5080] dark:text-[#A5B0D0]" />
                <span className="text-sm text-[#4A5080] dark:text-[#A5B0D0]">Vídeo indisponível</span>
              </div>
            )}
            {mensagem.metadata?.legenda && (
              <div className="text-sm text-[#4A5080] dark:text-[#A5B0D0] mt-1">
                {mensagem.metadata.legenda}
              </div>
            )}
          </div>
        );
      case "audio":
        return (
          <div className="max-w-[300px]">
            {mensagem.metadata?.url ? (
              <audio
                ref={audioRef}
                src={mensagem.metadata.url}
                controls
                className="w-full"
                onError={handleMediaError}
                onLoadedMetadata={handleMediaLoad}
                preload="metadata"
              >
                <p>Seu navegador não suporta áudio.</p>
              </audio>
            ) : (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-white/50 dark:bg-[#1B213B]/50">
                <Music className="w-6 h-6 text-[#4A5080] dark:text-[#A5B0D0]" />
                <span className="text-sm text-[#4A5080] dark:text-[#A5B0D0]">Áudio indisponível</span>
              </div>
            )}
          </div>
        );
      case "documento":
        return (
          <div 
            className="flex items-center gap-3 p-3 border rounded-lg bg-white/50 dark:bg-[#1B213B]/50 hover:bg-white/80 dark:hover:bg-[#1B213B]/80 transition-colors cursor-pointer max-w-[300px]"
            onClick={() => mensagem.metadata?.url && window.open(mensagem.metadata.url, "_blank")}
          >
            <FileText className="w-8 h-8 text-[#4A5080] dark:text-[#A5B0D0]" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate text-[#272D4F] dark:text-[#DDE3F1]">
                {mensagem.metadata?.nomeArquivo || "Documento"}
              </div>
              {mensagem.metadata?.tamanho && (
                <div className="text-xs text-[#4A5080] dark:text-[#A5B0D0]">
                  {(mensagem.metadata.tamanho / 1024).toFixed(0)} KB
                </div>
              )}
            </div>
            {mensagem.metadata?.url && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(mensagem.metadata?.url, "_blank");
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      case "botao":
        return (
          <div className="space-y-2">
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {mensagem.conteudo}
            </div>
            {mensagem.metadata?.botoes && mensagem.metadata.botoes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {mensagem.metadata.botoes.map((botao: any, index: number) => (
                  <Button
                    key={botao.id || index}
                    variant="outline"
                    size="sm"
                    className="text-sm border-[#EA70B0] text-[#EA70B0] hover:bg-[#EA70B0]/10"
                  >
                    {botao.texto || botao.label || "Botão"}
                  </Button>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="whitespace-pre-wrap break-words text-sm">
            {mensagem.conteudo}
          </div>
        );
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "HH:mm");
    } catch {
      return "00:00";
    }
  };

  return (
    <div
      className={cn(
        "flex gap-2 animate-fade-in",
        isFromMe ? "justify-end" : "justify-start"
      )}
    >
      {!isFromMe && (
        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 overflow-hidden", getAvatarBg())}>
          {getAvatar()}
        </div>
      )}

      <div className={cn(
        "relative group max-w-[65%]",
        isFromMe ? "mr-0" : "ml-0"
      )}>
        <div className={cn(
          "rounded-lg px-3.5 py-2 shadow-sm",
          isFromMe 
            ? "bg-[#ACBD6F] dark:bg-[#EA70B0] text-[#FEFDEB] dark:text-[#FEFDEB]" 
            : "bg-[#DDE3F1] dark:bg-[#1B213B] text-[#272D4F] dark:text-[#DDE3F1]",
          isPepper && "bg-[#EA70B0] dark:bg-[#EA70B0] text-[#FEFDEB] dark:text-[#FEFDEB]"
        )}>
          {renderContent()}
          
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className={cn(
              "text-[10px]",
              isFromMe ? "text-[#FEFDEB]/70" : "text-[#4A5080]/70 dark:text-[#A5B0D0]/70"
            )}>
              {formatTime(mensagem.dataHora)}
            </span>
            
            {isFromMe && (
              <span className="text-[10px]">
                <Check className={cn(
                  "w-3 h-3",
                  isFromMe ? "text-[#FEFDEB]" : "text-[#ACBD6F]"
                )} />
              </span>
            )}
          </div>
        </div>

        <div className="absolute -top-2 -right-8 opacity-0 group-hover:opacity-100 transition-opacity">
          <EncaminharPopover
            mensagem={mensagem}
            sessaoOrigemId={sessaoId}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-white dark:bg-[#1B213B] shadow-md hover:bg-[#DDE3F1] dark:hover:bg-[#2A3360] border border-[#DDE3F1] dark:border-[#2A3360]"
            >
              <Share2 className="w-3.5 h-3.5 text-[#4A5080] dark:text-[#A5B0D0]" />
            </Button>
          </EncaminharPopover>
        </div>
      </div>

      {isFromMe && (
        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 overflow-hidden", getAvatarBg())}>
          {getAvatar()}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparação personalizada - SÓ re-renderiza se o conteúdo da mensagem mudou
  return prevProps.mensagem.id === nextProps.mensagem.id && 
         prevProps.mensagem.conteudo === nextProps.mensagem.conteudo &&
         prevProps.mensagem.tipo === nextProps.mensagem.tipo &&
         prevProps.mensagem.dataHora === nextProps.mensagem.dataHora &&
         prevProps.mensagem.remetente === nextProps.mensagem.remetente;
});

MensagemItemComponent.displayName = 'MensagemItem';

export const MensagemItem = MensagemItemComponent;