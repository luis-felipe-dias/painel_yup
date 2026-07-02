import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/Popover";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Mensagem } from "../../../types/mensagens.types";
import { sessoesService } from "../../../services/sessoes.service";
import { mensagensService } from "../../../services/mensagens.service";
import { useToast } from "../../../hooks/useToast";
import { useDebounce } from "../../../hooks/useDebounce";
import { Search, Check, Users, X, Send, Loader2 } from "lucide-react";
import { cn } from "../../../utils/cn";

interface EncaminharPopoverProps {
  children: React.ReactNode;
  mensagem: Mensagem;
  sessaoOrigemId: string;
}

export function EncaminharPopover({ 
  children, 
  mensagem, 
  sessaoOrigemId 
}: EncaminharPopoverProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sessaoSelecionada, setSessaoSelecionada] = useState<string | null>(null);
  const [isEncaminhando, setIsEncaminhando] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessoes = [], isLoading } = useQuery({
    queryKey: ["sessoes", "encaminhar", debouncedSearch],
    queryFn: () => sessoesService.buscar(debouncedSearch),
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setSessaoSelecionada(null);
    }
  }, [open]);

  const sessoesFiltradas = Array.isArray(sessoes) 
    ? sessoes.filter(s => s.id !== sessaoOrigemId)
    : [];

  const getRemetenteNome = () => {
    const remetentes = {
      cliente: 'Cliente',
      pepper: 'Pepper (IA)',
      atendente: 'Atendente'
    };
    return remetentes[mensagem.remetente] || mensagem.remetente;
  };

  const getTipoMensagem = () => {
    const tipos = {
      texto: 'Texto',
      imagem: 'Imagem',
      video: 'Vídeo',
      audio: 'Áudio',
      documento: 'Documento',
      botao: 'Botão'
    };
    return tipos[mensagem.tipo] || mensagem.tipo;
  };

  const handleEncaminhar = async () => {
    if (!sessaoSelecionada) return;

    setIsEncaminhando(true);
    try {
      const resultado = await mensagensService.encaminharMensagem(
        sessaoSelecionada,
        mensagem
      );
      
      if (resultado) {
        showToast("Mensagem encaminhada com sucesso!", "success");
        setOpen(false);
        setSessaoSelecionada(null);
        setSearchTerm("");
        
        queryClient.invalidateQueries({ queryKey: ["mensagens"] });
        queryClient.invalidateQueries({ queryKey: ["sessoes"] });
      } else {
        showToast("Erro ao encaminhar mensagem", "error");
      }
    } catch (error) {
      showToast("Erro ao encaminhar mensagem", "error");
      console.error("Erro ao encaminhar:", error);
    } finally {
      setIsEncaminhando(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 overflow-hidden rounded-xl shadow-xl border-0 pointer-events-auto"
        side="top"
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-col max-h-[420px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <span className="font-medium text-sm">Encaminhar para</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Preview da mensagem */}
          <div className="px-4 py-2 border-b bg-muted/10">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Remetente: {getRemetenteNome()}</span>
              <span>Tipo: {getTipoMensagem()}</span>
            </div>
            <div className="text-sm line-clamp-2 break-words">
              {mensagem.conteudo}
            </div>
          </div>

          {/* Busca */}
          <div className="px-4 py-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar sessões..."
                className="pl-9 h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Lista de sessões */}
          <div className="flex-1 overflow-y-auto scrollbar-custom max-h-52">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : sessoesFiltradas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma sessão encontrada</p>
              </div>
            ) : (
              sessoesFiltradas.map((sessao) => (
                <button
                  key={sessao.id}
                  onClick={() => setSessaoSelecionada(sessao.id)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between",
                    "hover:bg-accent/50",
                    sessaoSelecionada === sessao.id && "bg-accent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-xs shrink-0",
                      sessao.aguardandoAtendente ? "bg-[#F15040]" :
                      sessao.estado === "aberta" ? "bg-[#EA70B0]" :
                      "bg-gray-400"
                    )}>
                      {sessao.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-2">
                        {sessao.nome}
                        {sessao.aguardandoAtendente && (
                          <span className="text-[10px] bg-[#F15040]/10 text-[#F15040] px-1.5 py-0.5 rounded-full font-normal">
                            Aguardando
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {sessao.telefone}
                      </div>
                    </div>
                  </div>
                  {sessaoSelecionada === sessao.id && (
                    <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
            <div className="text-xs text-muted-foreground">
              {sessaoSelecionada ? '1 sessão selecionada' : 'Selecione uma sessão'}
            </div>
            <Button
              onClick={handleEncaminhar}
              disabled={!sessaoSelecionada || isEncaminhando}
              size="sm"
              className="gap-2"
            >
              {isEncaminhando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Encaminhando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Encaminhar
                </>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}