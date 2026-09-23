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

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7] dark:bg-[#1a1a1e]">
      <div className="p-4 md:p-6 border-b bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-[#e5e5ea] dark:border-[#38383a] shrink-0">
        <h1 className="text-xl font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">
          Contatos
        </h1>
        <p className="text-sm text-[#86868b] mb-4">
          Clientes e grupos que já falaram com a Yup pelo WhatsApp.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              placeholder="Buscar por nome ou telefone..."
              className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={filtro === "problematicos"}
            />
          </div>

          <div className="flex gap-2">
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
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-[#86868b]">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Carregando contatos...
          </div>
        ) : contatos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#86868b]">
            <Users className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium">
              {filtro === "problematicos"
                ? "Nenhum contato com nome pendente de correção"
                : "Nenhum contato encontrado"}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1c1c1e] rounded-xl border border-[#e5e5ea] dark:border-[#38383a] overflow-hidden">
            <div className="divide-y divide-[#e5e5ea] dark:divide-[#38383a]">
              {contatos.map((contato) => (
                <div
                  key={contato.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] transition-colors"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0",
                      contato.isGroup ? "bg-[#5856d6]" : "bg-[#007aff]"
                    )}
                  >
                    {contato.isGroup ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      contato.nome.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-[#1c1c1e] dark:text-[#f5f5f7] truncate">
                        {contato.nome}
                      </span>
                      {contato.nomePersonalizado && (
                        <BadgeCheck
                          className="w-3.5 h-3.5 text-[#34c759] shrink-0"
                          strokeWidth={2.5}
                        />
                      )}
                      {contato.isGroup && (
                        <span className="shrink-0 text-[10px] font-medium text-[#5856d6] bg-[#5856d6]/10 px-1.5 py-0.5 rounded-full">
                          Grupo
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#86868b] truncate">
                      {contato.telefone}
                      {contato.tags.filter(t => t !== "grupo").length > 0 && (
                        <span> • {contato.tags.filter(t => t !== "grupo").join(", ")}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-[#86868b] shrink-0 hidden sm:block">
                    {formatarData(contato.ultimaInteracao)}
                  </div>

                  {!contato.isGroup && contato.telefone && (
                    <button
                      onClick={() => setContatoParaConversar(contato)}
                      className="shrink-0 p-2 rounded-lg hover:bg-[#34c759]/10 text-[#86868b] hover:text-[#34c759] transition-colors"
                      title="Iniciar conversa"
                    >
                      <MessageSquarePlus className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => setContatoEditando(contato)}
                    className="shrink-0 p-2 rounded-lg hover:bg-[#007aff]/10 text-[#86868b] hover:text-[#007aff] transition-colors"
                    title={contato.isGroup ? "Corrigir nome do grupo" : "Corrigir nome/tags"}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
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
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 h-10 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
        ativo
          ? "bg-[#007aff] text-white"
          : "bg-white dark:bg-[#1c1c1e] border border-input text-[#86868b] hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
