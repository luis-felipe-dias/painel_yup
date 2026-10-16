import { Sessao } from "../../../types/sessoes.types";
import { getTempoEspera } from "../../../services/sessoes.service";
import { cn } from "../../../utils/cn";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, Tag, AlertCircle, CheckCircle, XCircle, User, Users } from "lucide-react";

interface SessaoCardProps {
  sessao: Sessao;
  isActive: boolean;
  onClick: () => void;
  atendenteNome?: string;
}

export function SessaoCard({ sessao, isActive, onClick, atendenteNome }: SessaoCardProps) {
  // Dois relógios com significados diferentes, lado a lado:
  // - Badge (canto direito): tempo desde que a SESSÃO foi aberta
  //   (aguardandoDesde quando está aguardando atendente - é quando o
  //   cliente solicitou o atendimento; senão createdAt, quando a sessão
  //   começou).
  // - "há cerca de X" (texto ao lado): tempo desde a ÚLTIMA MENSAGEM,
  //   de qualquer um dos lados (ultimaInteracao).
  const tempoEspera = sessao.aguardandoAtendente && sessao.aguardandoDesde
    ? Math.max(0, Math.floor((Date.now() - new Date(sessao.aguardandoDesde).getTime()) / 60000))
    : getTempoEspera(sessao);

  const estado: "aguardando" | "atendendo" | "finalizada" = sessao.aguardandoAtendente
    ? "aguardando"
    : sessao.estado === "aberta"
      ? "atendendo"
      : "finalizada";

  // Paleta da marca aplicada por FUNÇÃO, não por cor solta:
  // Chama da Imaginação = quem está esperando · Folha de Aventuras = quem
  // já está sendo atendido · Bruma = encerrado.
  const skin = {
    aguardando: {
      bar: "before:bg-aguardando",
      bg: "bg-aguardando/[0.06] hover:bg-aguardando/[0.12]",
      avatar: "bg-aguardando text-white",
      ink: "text-aguardando-ink",
      badge: "bg-aguardando text-white",
      Icone: AlertCircle,
    },
    atendendo: {
      bar: "before:bg-atendendo",
      bg: "bg-atendendo/[0.07] hover:bg-atendendo/[0.14]",
      avatar: "bg-atendendo text-white",
      ink: "text-atendendo-ink",
      badge: "bg-atendendo-ink text-white",
      Icone: CheckCircle,
    },
    finalizada: {
      bar: "before:bg-finalizada",
      bg: "hover:bg-surface-muted",
      avatar: "bg-finalizada text-white",
      ink: "text-finalizada-ink",
      badge: "bg-finalizada text-white",
      Icone: XCircle,
    },
  }[estado];

  const StatusIcone = skin.Icone;

  const rotuloStatus =
    estado === "aguardando" ? "Aguardando atendente"
      : estado === "atendendo" ? "Em atendimento"
        : "Finalizada";

  const getTempoEsperaLabel = () => {
    if (tempoEspera < 1) return "Agora";
    if (tempoEspera < 60) return `${tempoEspera}m`;
    const horas = Math.floor(tempoEspera / 60);
    return `${horas}h ${tempoEspera % 60}m`;
  };

  const getUltimaInteracao = () => {
    try {
      return formatDistanceToNow(new Date(sessao.ultimaInteracao), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "há pouco";
    }
  };

  const naoLidas = sessao.naoLidas ?? 0;

  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        // A barra de status virou pseudo-elemento: a borda esquerda sumia
        // quando o card ficava selecionado, porque a cor de seleção
        // sobrescrevia a borda. Assim a faixa fica sempre visível.
        "relative w-full text-left px-4 py-3 transition-colors duration-200",
        "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:content-['']",
        skin.bar,
        skin.bg,
        isActive && "bg-accent-soft hover:bg-accent-soft ring-1 ring-inset ring-accent/40"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center font-semibold text-base",
              skin.avatar
            )}
          >
            {sessao.isGroup ? <Users className="w-5 h-5" /> : sessao.nome.charAt(0).toUpperCase()}
          </div>

          {/* Contador de não lidas, no padrão que todo mundo já conhece de
              aplicativo de mensagem. Só aparece quando o backend manda o
              campo (ver /human/sessoes/abertas). */}
          {naoLidas > 0 && (
            <span className="tnum absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center border-2 border-surface">
              {naoLidas > 99 ? "99+" : naoLidas}
            </span>
          )}

          {naoLidas === 0 && estado === "aguardando" && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-aguardando animate-pulse border-2 border-surface" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Linha 1 — nome + relógios */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "font-semibold text-[15px] truncate",
                estado === "finalizada" ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {sessao.nome}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[12px] text-muted-foreground">{getUltimaInteracao()}</span>
              <span
                className={cn(
                  "tnum text-[11px] px-2 py-0.5 rounded-full font-semibold",
                  skin.badge
                )}
                title="Tempo desde que o cliente entrou na fila"
              >
                {getTempoEsperaLabel()}
              </span>
            </div>
          </div>

          {/* Linha 2 — telefone */}
          <div className="flex items-center gap-1 text-[12.5px] text-muted-foreground truncate mt-0.5">
            <Phone className="w-3 h-3 shrink-0" />
            <span className="truncate">{sessao.telefone}</span>
          </div>

          {/* Linha 3 — status, setor, atendente, marcadores */}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5">
            <span className={cn("flex items-center gap-1.5 text-[12.5px] font-medium", skin.ink)}>
              <StatusIcone className="w-3.5 h-3.5" />
              {rotuloStatus}
            </span>

            {sessao.setorResponsavel && (
              <span className="flex items-center gap-1 text-[12px] text-muted-foreground bg-surface-muted px-2 py-0.5 rounded-full">
                <Tag className="w-3 h-3" />
                {sessao.setorResponsavel}
              </span>
            )}

            {atendenteNome && (
              <span className="flex items-center gap-1 text-[12px] text-accent-foreground bg-accent-soft px-2 py-0.5 rounded-full">
                <User className="w-3 h-3" />
                {atendenteNome}
              </span>
            )}

            {sessao.isGroup && (
              <span className="text-[11px] font-medium text-foreground/70 bg-secondary px-2 py-0.5 rounded-full">
                Grupo
              </span>
            )}

            {sessao.status === "digitando" && (
              <span className="flex items-center gap-1 text-[12px] font-medium text-accent-foreground bg-accent-soft px-2 py-0.5 rounded-full">
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
