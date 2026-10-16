import { useEffect, useMemo, useRef, useState } from "react";
import { Zap, CornerDownLeft } from "lucide-react";
import { RespostaRapida } from "../../../types/respostaRapida.types";
import { respostasRapidasService } from "../../../services/respostasRapidas.service";
import { cn } from "../../../utils/cn";

interface Props {
  /** O que o atendente digitou depois da barra. "/pi" => "pi" */
  termo: string;
  onEscolher: (r: RespostaRapida) => void;
  onFechar: () => void;
}

/**
 * Lista que abre ao digitar "/" no começo da mensagem — mesmo gesto do
 * WhatsApp Business. Setas navegam, Enter/Tab insere, Esc fecha.
 */
export function RespostaRapidaPicker({ termo, onEscolher, onFechar }: Props) {
  const [itens, setItens] = useState<RespostaRapida[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [indice, setIndice] = useState(0);
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    respostasRapidasService.buscar(termo).then((r) => {
      if (!vivo) return;
      setItens(r);
      setIndice(0);
      setCarregando(false);
    });
    return () => {
      vivo = false;
    };
  }, [termo]);

  // A navegação por teclado fica aqui e não no textarea para o seletor ser
  // autocontido: quem usa só monta o componente.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!itens.length) {
        if (e.key === "Escape") onFechar();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndice((i) => (i + 1) % itens.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndice((i) => (i - 1 + itens.length) % itens.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        onEscolher(itens[indice]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onFechar();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [itens, indice, onEscolher, onFechar]);

  useEffect(() => {
    listaRef.current
      ?.querySelector(`[data-i="${indice}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [indice]);

  const porCategoria = useMemo(() => {
    const m = new Map<string, RespostaRapida[]>();
    itens.forEach((r) => {
      const c = r.categoria || "Geral";
      m.set(c, [...(m.get(c) || []), r]);
    });
    return m;
  }, [itens]);

  let n = -1;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
      <div className="mx-auto max-w-4xl rounded-xl border border-border bg-popover shadow-pop overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-muted">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
            <Zap className="w-3.5 h-3.5 text-accent" />
            Respostas rápidas
          </span>
          <span className="text-[11px] text-muted-foreground">
            ↑↓ navegar · Enter inserir · Esc sair
          </span>
        </div>

        <div ref={listaRef} className="max-h-72 overflow-y-auto scrollbar-custom">
          {carregando ? (
            <div className="px-3 py-6 text-center text-[13px] text-muted-foreground">
              Carregando...
            </div>
          ) : itens.length === 0 ? (
            <div className="px-3 py-6 text-center text-[13px] text-muted-foreground">
              Nenhuma resposta para “{termo}”.
              <br />
              <span className="text-[12px] opacity-75">
                Cadastre em Configurações → Respostas rápidas.
              </span>
            </div>
          ) : (
            Array.from(porCategoria.entries()).map(([categoria, lista]) => (
              <div key={categoria}>
                <div className="px-3 pt-2 pb-1 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                  {categoria}
                </div>
                {lista.map((r) => {
                  n += 1;
                  const i = n;
                  return (
                    <button
                      key={r.id}
                      data-i={i}
                      type="button"
                      onMouseEnter={() => setIndice(i)}
                      onClick={() => onEscolher(r)}
                      className={cn(
                        "w-full text-left px-3 py-2 flex items-start gap-3 transition-colors",
                        i === indice ? "bg-accent-soft" : "hover:bg-surface-muted"
                      )}
                    >
                      <span className="shrink-0 mt-0.5 font-mono text-[12px] font-semibold text-accent-foreground bg-accent/15 px-1.5 py-0.5 rounded">
                        /{r.atalho}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-foreground truncate">
                          {r.titulo}
                        </span>
                        <span className="block text-[12px] text-muted-foreground line-clamp-2">
                          {r.texto}
                        </span>
                      </span>
                      {i === indice && (
                        <CornerDownLeft className="w-3.5 h-3.5 shrink-0 mt-1 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
