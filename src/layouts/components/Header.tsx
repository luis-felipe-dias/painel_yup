import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Moon, Sun, LogOut, ChevronRight, Inbox } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../utils/cn";

/**
 * Barra superior, em vidro.
 *
 * Três coisas foram REMOVIDAS de propósito:
 *  - A caixa "Pesquisar..." não pesquisava nada. Campo que não faz nada é
 *    pior que campo nenhum: o atendente digita, não acontece nada, e ele
 *    passa a desconfiar do painel inteiro. A busca que existe de verdade
 *    está dentro de Conversas, onde o dado está.
 *  - O sininho tinha uma bolinha vermelha FIXA no código. Alerta que está
 *    sempre aceso é ruído: em uma semana ninguém olha mais.
 *  - O título gigante repetia o item já marcado na lateral.
 *
 * No lugar entrou o número de conversas aguardando, que é a única coisa
 * que o atendente precisa ver de qualquer tela. Ele é lido do cache do
 * React Query que a tela de Conversas já preencheu — zero requisição a
 * mais.
 */

const TITULOS: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/conversas": "Conversas",
  "/contatos": "Contatos",
  "/grupos": "Grupos",
  "/estoque": "Estoque",
  "/compras": "Compras ADM",
  "/estoque-minimo": "Estoque Mínimo",
  "/metricas": "Métricas",
  "/configuracoes": "Configurações",
  "/respostas-rapidas": "Respostas rápidas",
};

function useAguardando(): number {
  const queryClient = useQueryClient();
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const ler = () => {
      const entradas = queryClient.getQueriesData<any[]>({ queryKey: ["sessoes"] });
      let maior = 0;
      for (const [, dados] of entradas) {
        if (!Array.isArray(dados)) continue;
        const n = dados.filter(
          (s: any) => s?.estado === "aguardando" || s?.aguardandoAtendimento
        ).length;
        if (n > maior) maior = n;
      }
      setTotal(maior);
    };

    ler();
    // Acompanha o cache em vez de buscar por conta própria.
    const inscricao = queryClient.getQueryCache().subscribe(ler);
    return () => inscricao();
  }, [queryClient]);

  return total;
}

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { usuario, logout } = useAuth();
  const aguardando = useAguardando();

  const titulo = TITULOS[location.pathname] ?? "Painel";
  const naRaiz = location.pathname === "/" || location.pathname === "/dashboard";

  const sair = () => {
    if (window.confirm("Sair do painel?")) logout();
  };

  const iniciais = (usuario?.nome || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <header className="glass sticky top-0 z-30 flex h-header shrink-0 items-center justify-between gap-3 rounded-none border-x-0 border-t-0 px-4 md:px-6">
      {/* Caminho: Início / Página. Tipografia pequena, hierarquia pelo peso
          e não pelo tamanho — é como a Apple separa nível no cabeçalho. */}
      <nav aria-label="Caminho" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        {!naRaiz && (
          <>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="foco-anel rounded-sm px-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              Início
            </button>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
          </>
        )}
        <span className="truncate font-semibold text-foreground">{titulo}</span>
      </nav>

      <div className="flex items-center gap-1.5">
        {/* Aguardando: só aparece quando há alguém esperando. Indicador que
            some quando está tudo certo é indicador em que se acredita. */}
        {aguardando > 0 && (
          <button
            type="button"
            onClick={() => navigate("/conversas")}
            title={`${aguardando} conversa(s) aguardando atendimento`}
            className="foco-anel glass-thin flex h-9 items-center gap-1.5 rounded-full pl-2.5 pr-3 text-[13px] font-semibold text-aguardando-ink transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aguardando opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-aguardando" />
            </span>
            <span className="tnum">{aguardando}</span>
            <span className="hidden sm:inline">aguardando</span>
          </button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
          className="foco-anel h-9 w-9 rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </Button>

        <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />

        <div className="flex items-center gap-2.5">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-[13px] font-semibold text-foreground">
              {usuario?.nome || "Usuário"}
            </div>
            <div className="text-[11px] capitalize text-muted-foreground">
              {usuario?.tipo || "visitante"}
            </div>
          </div>

          <div
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground"
          >
            {iniciais}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={sair}
            title="Sair"
            aria-label="Sair do painel"
            className="foco-anel h-9 w-9 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </Button>
        </div>
      </div>
    </header>
  );
}

/** Exportado para quem quiser o mesmo selo em outra tela. */
export function SeloAguardando({ total }: { total: number }) {
  if (total <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-aguardando/12 px-2.5 py-1",
        "text-[12px] font-semibold text-aguardando-ink"
      )}
    >
      <Inbox className="h-3.5 w-3.5" />
      <span className="tnum">{total}</span>
    </span>
  );
}
