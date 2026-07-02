import { Sessao } from "../../../types/sessoes.types";
import { getPrioridadeSessao, getTempoEspera } from "../../../services/sessoes.service";
import { cn } from "../../../utils/cn";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Phone, Tag, AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface SessaoCardProps {
  sessao: Sessao;
  isActive: boolean;
  onClick: () => void;
}

export function SessaoCard({ sessao, isActive, onClick }: SessaoCardProps) {
  const prioridade = getPrioridadeSessao(sessao);
  const tempoEspera = getTempoEspera(sessao);
  
  // Cores baseadas na prioridade
  const getCardColors = () => {
    if (sessao.aguardandoAtendente) {
      return {
        border: "border-l-4 border-[#F15040]",
        bg: "bg-red-50/80 dark:bg-red-950/30 hover:bg-red-100/80 dark:hover:bg-red-950/50",
        status: "text-red-600 dark:text-red-400",
        statusBg: "bg-red-100 dark:bg-red-900/30",
        badge: "bg-[#F15040] text-white animate-pulse"
      };
    }
    if (sessao.estado === "aberta") {
      return {
        border: "border-l-4 border-[#EA70B0]",
        bg: "bg-pink-50/50 dark:bg-pink-950/20 hover:bg-pink-100/50 dark:hover:bg-pink-950/40",
        status: "text-pink-600 dark:text-pink-400",
        statusBg: "bg-pink-100 dark:bg-pink-900/20",
        badge: "bg-[#EA70B0] text-white"
      };
    }
    return {
      border: "border-l-4 border-gray-300 dark:border-gray-600",
      bg: "bg-gray-50/30 dark:bg-gray-900/20 hover:bg-gray-100/30 dark:hover:bg-gray-900/30",
      status: "text-gray-500 dark:text-gray-400",
      statusBg: "bg-gray-100 dark:bg-gray-800/30",
      badge: "bg-gray-400 text-white"
    };
  };

  const colors = getCardColors();

  const getStatusIndicator = () => {
    if (sessao.aguardandoAtendente) {
      return (
        <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Aguardando atendente</span>
        </div>
      );
    }
    if (sessao.estado === "aberta") {
      return (
        <div className="flex items-center gap-1.5 text-xs font-medium text-pink-600 dark:text-pink-400">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Em atendimento</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        <XCircle className="w-3.5 h-3.5" />
        <span>Finalizada</span>
      </div>
    );
  };

  const getTempoEsperaLabel = () => {
    if (tempoEspera < 1) return "Há poucos minutos";
    if (tempoEspera < 60) return `Há ${tempoEspera} min`;
    const horas = Math.floor(tempoEspera / 60);
    return `Há ${horas}h ${tempoEspera % 60}min`;
  };

  const getUltimaInteracao = () => {
    try {
      const data = new Date(sessao.ultimaInteracao);
      const agora = new Date();
      const diff = agora.getTime() - data.getTime();
      
      if (diff < 60000) return "Agora mesmo";
      if (diff < 3600000) {
        const minutos = Math.floor(diff / 60000);
        return `${minutos}min atrás`;
      }
      return formatDistanceToNow(data, { addSuffix: true, locale: ptBR });
    } catch {
      return "há pouco";
    }
  };

  const getDataInicio = () => {
    try {
      return format(new Date(sessao.createdAt || sessao.ultimaInteracao), "dd/MM/yyyy HH:mm");
    } catch {
      return "";
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 transition-all duration-200 cursor-pointer",
        colors.border,
        colors.bg,
        isActive && "bg-accent/70 ring-1 ring-[#EA70B0]"
      )}
      type="button"
    >
      <div className="flex items-start gap-3">
        {/* Avatar com indicador de prioridade */}
        <div className="relative shrink-0">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg",
            sessao.aguardandoAtendente ? "bg-[#F15040]" :
            sessao.estado === "aberta" ? "bg-[#EA70B0]" :
            "bg-gray-400"
          )}>
            {sessao.nome.charAt(0).toUpperCase()}
          </div>
          {sessao.aguardandoAtendente && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F15040] animate-pulse border-2 border-white dark:border-gray-800" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Nome e Tempo */}
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              "font-medium truncate",
              sessao.aguardandoAtendente ? "text-red-700 dark:text-red-300" :
              sessao.estado === "aberta" ? "text-pink-700 dark:text-pink-300" :
              "text-gray-600 dark:text-gray-400"
            )}>
              {sessao.nome}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">
                {getUltimaInteracao()}
              </span>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                colors.badge
              )}>
                {getTempoEsperaLabel()}
              </span>
            </div>
          </div>

          {/* Telefone */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground truncate">
            <Phone className="w-3 h-3 shrink-0" />
            <span className="truncate">{sessao.telefone}</span>
          </div>

          {/* Data de início */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-0.5">
            <Clock className="w-3 h-3" />
            <span>Início: {getDataInicio()}</span>
          </div>

          {/* Status e Tags */}
          <div className="flex items-center flex-wrap gap-2 mt-1.5">
            {getStatusIndicator()}
            
            {sessao.setorResponsavel && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                <Tag className="w-3 h-3" />
                {sessao.setorResponsavel}
              </span>
            )}

            {sessao.status === "digitando" && (
              <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">
                <span className="animate-pulse">•••</span>
                Digitando
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}