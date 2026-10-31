import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { contatosService } from "../../services/contatos.service";
import { Contato } from "../../types/contatos.types";
import { ContatoEditModal } from "./components/ContatoEditModal";
import { NovaConversaModal } from "../Conversas/components/NovaConversaModal";
import { useDebounce } from "../../hooks/useDebounce";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../utils/cn";
import {
  Search,
  Users,
  User,
  AlertTriangle,
  Pencil,
  Loader2,
  BadgeCheck,
  MessageSquarePlus
} from "lucide-react";

type Filtro = "todos" | "grupos" | "problematicos";

export default function Contatos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [contatoEditando, setContatoEditando] = useState<Contato | null>(null);
  const [contatoParaConversar, setContatoParaConversar] = useState<Contato | null>(null);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const { data: contatos = [], isLoading } = useQuery({
    queryKey: ["contatos", filtro, debouncedSearch],
    queryFn: () => {
      if (filtro === "problematicos") return contatosService.listarProblematicos();
      return contatosService.listar({
        busca: debouncedSearch || undefined,
        apenasGrupos: filtro === "grupos"
      });
    }
  });

  const handleSaved = () => {
    setContatoEditando(null);
    queryClient.invalidateQueries({ queryKey: ["contatos"] });
  };

  return (
    // Um único container de rolagem: assim a barra de busca pode ficar
    // `sticky` de verdade. overflow-x-hidden porque a 360px nome e
    // telefone longos não podem empurrar a página pro lado.
    <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-custom bg-background text-foreground">
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-3">
        <h1 className="text-lg md:text-2xl font-semibold text-foreground">Contatos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Clientes e grupos que já falaram com a Yup pelo WhatsApp.
        </p>
      </div>

      {/* Único lugar com vidro nesta tela: barra fixa no topo. Em item de
          lista o backdrop-filter recalcularia a cada rolagem. */}
      <div className="glass-thin sticky top-0 z-10 rounded-none border-x-0 border-t-0 px-4 md:px-6 py-2 md:py-3">
        <div className="flex flex-col md:flex-row gap-2 md:gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              placeholder="Buscar por nome ou telefone..."
              aria-label="Buscar contato por nome ou telefone"
              autoComplete="off"
              className="w-full h-toque md:h-10 pl-9 pr-3 rounded-md border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={filtro === "problematicos"}
            />
          </div>

          {/* No celular os 3 filtros não cabem lado a lado: rolagem
              horizontal só da fileira de chips, nunca da página. */}
          <div className="flex gap-2 overflow-x-auto scrollbar-custom -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
            <FiltroButton
              ativo={filtro === "todos"}
              onClick={() => setFiltro("todos")}
              icon={<User className="w-3.5 h-3.5" />}
              label="Todos"
            />
            <FiltroButton
              ativo={filtro === "grupos"}
              onClick={() => setFiltro("grupos")}
              icon={<Users className="w-3.5 h-3.5" />}
              label="Grupos"
            />
            <FiltroButton
              ativo={filtro === "problematicos"}
              onClick={() => setFiltro("problematicos")}
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              label="Nome a corrigir"
            />
          </div>
        </div>

        {filtro === "problematicos" && (
          <p className="text-xs text-muted-foreground mt-2">
            A busca fica desligada neste filtro: ele já lista todos os nomes pendentes.
          </p>
        )}
      </div>

      <div className="p-4 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Carregando contatos...
          </div>
        ) : contatos.length === 0 ? (
          <ContatosVazio filtro={filtro} buscando={!!debouncedSearch} />
        ) : (
          // Cartão por contato em vez de tabela: a 360px cada contato é um
          // bloco com a informação em cima e as ações embaixo.
          <div className="space-y-2">
            {contatos.map((contato) => (
              <ContatoCard
                key={contato.id}
                contato={contato}
                onConversar={() => setContatoParaConversar(contato)}
                onEditar={() => setContatoEditando(contato)}
              />
            ))}
          </div>
        )}
      </div>

      <ContatoEditModal
        contato={contatoEditando}
        onClose={() => setContatoEditando(null)}
        onSaved={handleSaved}
      />

      <NovaConversaModal
        open={!!contatoParaConversar}
        onOpenChange={(open) => !open && setContatoParaConversar(null)}
        atendenteNome={usuario?.nome}
        contatoFixo={
          contatoParaConversar
            ? { telefone: contatoParaConversar.telefone, nome: contatoParaConversar.nome }
            : undefined
        }
        onConversaIniciada={() => {
          setContatoParaConversar(null);
          navigate("/conversas");
        }}
      />
    </div>
  );
}

const formatarData = (iso?: string) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit"
    });
  } catch {
    return "—";
  }
};

/**
 * Cartão de um contato. Fora da função da página de propósito: declarado
 * dentro, o React remontaria a lista inteira a cada tecla digitada na busca.
 *
 * Mobile: identidade e metadados ocupam a linha toda (`basis-full`) e as
 * ações caem para baixo, alinhadas à direita, com alvo de 44px. A partir do
 * md tudo volta pra uma linha só e os botões encolhem pra 32px.
 */
function ContatoCard({
  contato,
  onConversar,
  onEditar
}: {
  contato: Contato;
  onConversar: () => void;
  onEditar: () => void;
}) {
  const tags = contato.tags.filter((t) => t !== "grupo");

  return (
    <div className="bg-surface border border-border rounded-lg shadow-card p-3 flex flex-wrap items-center gap-2 transition-colors hover:bg-surface-muted">
      <div className="flex items-center gap-3 basis-full md:basis-auto md:flex-1 min-w-0">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0",
            contato.isGroup ? "bg-brincadeira" : "bg-primary"
          )}
        >
          {contato.isGroup ? (
            <Users className="w-5 h-5" />
          ) : (
            contato.nome.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm text-foreground truncate">
              {contato.nome}
            </span>
            {contato.nomePersonalizado && (
              <BadgeCheck
                className="w-3.5 h-3.5 text-atendendo-ink shrink-0"
                strokeWidth={2.5}
                aria-label="Nome já corrigido à mão"
              />
            )}
            {contato.isGroup && (
              <span className="shrink-0 text-[10px] font-medium text-brincadeira-ink bg-brincadeira/12 px-1.5 py-0.5 rounded-full">
                Grupo
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            <span className="tnum">{contato.telefone}</span>
            {tags.length > 0 && <span> • {tags.join(", ")}</span>}
          </div>
          {/* A data vinha numa coluna própria escondida no celular; aqui ela
              entra nos metadados e aparece em qualquer largura. */}
          <div className="text-xs text-muted-foreground">
            Última conversa: <span className="tnum">{formatarData(contato.ultimaInteracao)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto shrink-0">
        {!contato.isGroup && contato.telefone && (
          <button
            type="button"
            onClick={onConversar}
            className="foco-anel h-toque w-toque md:h-8 md:w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-atendendo/15 hover:text-atendendo-ink transition-colors"
            title="Iniciar conversa"
            aria-label={`Iniciar conversa com ${contato.nome}`}
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onEditar}
          className="foco-anel h-toque w-toque md:h-8 md:w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent/12 hover:text-accent-foreground transition-colors"
          title={contato.isGroup ? "Corrigir nome do grupo" : "Corrigir nome/tags"}
          aria-label={contato.isGroup ? `Corrigir nome do grupo ${contato.nome}` : `Corrigir nome e tags de ${contato.nome}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/** Estado vazio que diz o que fazer, não só que está vazio. */
function ContatosVazio({ filtro, buscando }: { filtro: Filtro; buscando: boolean }) {
  const { titulo, dica } =
    filtro === "problematicos"
      ? {
          titulo: "Nenhum nome pendente de correção",
          dica: "Todos os contatos já estão com nome legível. Quando o WhatsApp trouxer só o número, ele aparece aqui."
        }
      : buscando
      ? {
          titulo: "Nada encontrado para essa busca",
          dica: "Tente só o começo do nome, ou o telefone com DDD e sem pontuação."
        }
      : filtro === "grupos"
      ? {
          titulo: "Nenhum grupo ainda",
          dica: "Um grupo entra nesta lista na primeira mensagem recebida nele."
        }
      : {
          titulo: "Nenhum contato ainda",
          dica: "O contato é criado sozinho quando alguém escreve para o WhatsApp da Yup."
        };

  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-4 animate-fade-in">
      <Users className="w-10 h-10 mb-3 text-muted-foreground opacity-40" />
      <p className="font-medium text-foreground">{titulo}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">{dica}</p>
    </div>
  );
}

function FiltroButton({
  ativo,
  onClick,
  icon,
  label
}: {
  ativo: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "foco-anel shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 h-toque md:h-10 rounded-md text-sm font-medium transition-colors",
        ativo
          ? "bg-primary text-primary-foreground"
          : "bg-surface border border-border text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
