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
  
  const getCardColors = () => {
    if (sessao.aguardandoAtendente) {
      return {
        border: "border-l-[3px] border-[#ff3b30]",
        bg: "bg-[#ff3b30]/5 hover:bg-[#ff3b30]/10 dark:bg-[#ff453a]/5 dark:hover:bg-[#ff453a]/10",
        text: "text-[#ff3b30] dark:text-[#ff453a]",
        badge: "bg-[#ff3b30] text-white"
      };
    }
    if (sessao.estado === "aberta") {
      return {
        border: "border-l-[3px] border-[#007aff]",
        bg: "bg-[#007aff]/5 hover:bg-[#007aff]/10 dark:bg-[#0a84ff]/5 dark:hover:bg-[#0a84ff]/10",
        text: "text-[#007aff] dark:text-[#0a84ff]",
        badge: "bg-[#007aff] text-white"
      };
    }
    return {
      border: "border-l-[3px] border-[#c6c6c8]",
      bg: "hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e]",
      text: "text-[#86868b] dark:text-[#86868b]",
      badge: "bg-[#c6c6c8] text-white"
    };
  };

  const colors = getCardColors();

  const getStatusIndicator = () => {
    if (sessao.aguardandoAtendente) {
      return (
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#ff3b30] dark:text-[#ff453a]">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Aguardando atendente</span>
        </div>
      );
    }
    if (sessao.estado === "aberta") {
      return (
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#007aff] dark:text-[#0a84ff]">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Em atendimento</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#86868b]">
        <XCircle className="w-3.5 h-3.5" />
        <span>Finalizada</span>
      </div>
    );
  };

  const getTempoEsperaLabel = () => {
    if (tempoEspera < 1) return "Agora";
    if (tempoEspera < 60) return `${tempoEspera}m`;
    const horas = Math.floor(tempoEspera / 60);
    return `${horas}h ${tempoEspera % 60}m`;
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

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 transition-all duration-200",
        colors.border,
        colors.bg,
        isActive && "bg-[#007aff]/10 dark:bg-[#0a84ff]/10"
      )}
      type="button"
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg",
            sessao.aguardandoAtendente ? "bg-[#ff3b30]" :
            sessao.estado === "aberta" ? "bg-[#007aff]" :
            "bg-[#c6c6c8]"
          )}>
            {sessao.nome.charAt(0).toUpperCase()}
          </div>
          {sessao.aguardandoAtendente && (
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#ff3b30] animate-pulse border-2 border-white dark:border-[#1a1a1e]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              "font-semibold text-[15px] truncate",
              sessao.aguardandoAtendente ? "text-[#1c1c1e] dark:text-[#f5f5f7]" :
              sessao.estado === "aberta" ? "text-[#1c1c1e] dark:text-[#f5f5f7]" :
              "text-[#86868b] dark:text-[#86868b]"
            )}>
              {sessao.nome}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[13px] text-[#86868b]">
                {getUltimaInteracao()}
              </span>
              <span className={cn(
                "text-[11px] px-2 py-0.5 rounded-full font-medium",
                colors.badge
              )}>
                {getTempoEsperaLabel()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[13px] text-[#86868b] truncate">
            <Phone className="w-3 h-3 shrink-0" />
            <span className="truncate">{sessao.telefone}</span>
          </div>

          <div className="flex items-center flex-wrap gap-2 mt-1">
            {getStatusIndicator()}
            
            {sessao.setorResponsavel && (
              <span className="flex items-center gap-1 text-[13px] text-[#86868b] bg-[#f5f5f7] dark:bg-[#2c2c2e] px-2 py-0.5 rounded-full">
                <Tag className="w-3 h-3" />
                {sessao.setorResponsavel}
              </span>
            )}

            {sessao.status === "digitando" && (
              <span className="flex items-center gap-1 text-[13px] font-medium text-[#007aff] dark:text-[#0a84ff] bg-[#007aff]/10 dark:bg-[#0a84ff]/10 px-2 py-0.5 rounded-full">
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