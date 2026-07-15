import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal, ModalContent } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Mensagem } from "../../../types/mensagens.types";
import { sessoesService } from "../../../services/sessoes.service";
import { mensagensService } from "../../../services/mensagens.service";
import { useToast } from "../../../hooks/useToast";
import { useDebounce } from "../../../hooks/useDebounce";
import { useMessageSelection } from "../../../contexts/MessageSelectionContext";
import { Search, Check, Users, X, Send, Loader2 } from "lucide-react";
import { cn } from "../../../utils/cn";

interface EncaminharPopoverProps {
  children: React.ReactNode;
  mensagem?: Mensagem;
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
  const [progresso, setProgresso] = useState<{ atual: number; total: number }>({ atual: 0, total: 0 });
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  // Usar o contexto de seleção
  const { mensagensSelecionadas, limparSelecao, removerMensagem, adicionarMensagem } = useMessageSelection();

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

  // Quando abrir, se tiver uma mensagem individual, adicionar à seleção
  useEffect(() => {
    if (mensagem && open && mensagensSelecionadas.length === 0) {
      adicionarMensagem(mensagem);
    }
  }, [mensagem, open]);

  const sessoesFiltradas = Array.isArray(sessoes) 
    ? sessoes.filter(s => s.id !== sessaoOrigemId)
    : [];

  const handleEncaminharEmFila = async () => {
    if (!sessaoSelecionada || mensagensSelecionadas.length === 0) return;

    setIsEncaminhando(true);
    setProgresso({ atual: 0, total: mensagensSelecionadas.length });

    let sucessos = 0;
    let erros = 0;

    try {
      for (let i = 0; i < mensagensSelecionadas.length; i++) {
        const msg = mensagensSelecionadas[i];
        setProgresso({ atual: i + 1, total: mensagensSelecionadas.length });
        
        try {
          await mensagensService.encaminharMensagem(sessaoSelecionada, msg);
          sucessos++;
          if (i < mensagensSelecionadas.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (err) {
          erros++;
          console.error(`❌ Erro ao encaminhar mensagem ${i + 1}:`, err);
        }
      }

      if (sucessos > 0 && erros === 0) {
        showToast(`${sucessos} mensagen${sucessos > 1 ? 's' : ''} encaminhada${sucessos > 1 ? 's' : ''} com sucesso!`, 'success');
      } else if (sucessos > 0 && erros > 0) {
        showToast(`${sucessos} mensagens enviadas, ${erros} falhas`, 'warning');
      } else {
        showToast('Erro ao encaminhar mensagens', 'error');
      }

      limparSelecao();
      setSessaoSelecionada(null);
      setSearchTerm("");
      setOpen(false);
      
      queryClient.invalidateQueries({ queryKey: ["mensagens"] });
      queryClient.invalidateQueries({ queryKey: ["sessoes"] });

    } catch (error) {
      showToast('Erro ao encaminhar mensagens', 'error');
    } finally {
      setIsEncaminhando(false);
      setProgresso({ atual: 0, total: 0 });
    }
  };

  const getRemetenteNome = (msg: Mensagem) => {
    const remetentes = {
      cliente: 'Cliente',
      pepper: 'Pepper (IA)',
      atendente: 'Atendente'
    };
    return remetentes[msg.remetente] || msg.remetente;
  };

  const getTipoMensagem = (msg: Mensagem) => {
    const tipos = {
      texto: '📝 Texto',
      imagem: '🖼️ Imagem',
      video: '🎬 Vídeo',
      audio: '🎵 Áudio',
      documento: '📄 Documento',
      botao: '🔘 Botão'
    };
    return tipos[msg.tipo] || msg.tipo;
  };

  return (
    <>
      <div onClick={(e) => {
        e.stopPropagation();
        setOpen(true);
      }}>
        {children}
      </div>

      <Modal open={open} onOpenChange={(isOpen) => !isOpen && setOpen(false)}>
        <ModalContent className="max-w-2xl p-0 overflow-hidden">
          <div className="flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="font-medium text-base">
                  Encaminhar Mensagens
                </span>
                {mensagensSelecionadas.length > 0 && (
                  <span className="text-sm bg-[#007aff]/10 text-[#007aff] px-2 py-0.5 rounded-full">
                    {mensagensSelecionadas.length} selecionada{mensagensSelecionadas.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {mensagensSelecionadas.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={limparSelecao}
                    className="text-[#ff3b30] hover:bg-[#ff3b30]/10"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Limpar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {mensagensSelecionadas.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-[#86868b]">
                      Mensagens selecionadas
                    </h4>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {mensagensSelecionadas.map((msg) => (
                      <div key={msg.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-[#86868b]">
                            <span>{getRemetenteNome(msg)}</span>
                            <span>•</span>
                            <span>{getTipoMensagem(msg)}</span>
                          </div>
                          <div className="text-sm truncate">{msg.conteudo}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[#ff3b30] hover:bg-[#ff3b30]/10"
                          onClick={() => removerMensagem(msg.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">
                  Buscar sessão para encaminhar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                  <Input
                    placeholder="Digite o nome ou telefone..."
                    className="pl-9 h-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[200px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-[#86868b]" />
                    </div>
                  ) : sessoesFiltradas.length === 0 ? (
                    <div className="text-center py-8 text-[#86868b]">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhuma sessão encontrada</p>
                    </div>
                  ) : (
                    sessoesFiltradas.map((sessao) => (
                      <button
                        key={sessao.id}
                        onClick={() => setSessaoSelecionada(sessao.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 transition-colors flex items-center justify-between border-b last:border-0",
                          "hover:bg-accent/50",
                          sessaoSelecionada === sessao.id && "bg-accent"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-xs shrink-0",
                            sessao.aguardandoAtendente ? "bg-[#ff3b30]" :
                            sessao.estado === "aberta" ? "bg-[#007aff]" :
                            "bg-[#c6c6c8]"
                          )}>
                            {sessao.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate flex items-center gap-2">
                              {sessao.nome}
                              {sessao.aguardandoAtendente && (
                                <span className="text-[10px] bg-[#ff3b30]/10 text-[#ff3b30] px-1.5 py-0.5 rounded-full font-normal">
                                  Aguardando
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#86868b] truncate">
                              {sessao.telefone}
                            </div>
                          </div>
                        </div>
                        {sessaoSelecionada === sessao.id && (
                          <Check className="w-4 h-4 text-[#007aff] shrink-0 ml-2" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {isEncaminhando && progresso.total > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-[#86868b] mb-1">
                    <span>Encaminhando mensagens...</span>
                    <span>{progresso.atual} de {progresso.total}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#007aff] transition-all duration-300"
                      style={{ width: `${(progresso.atual / progresso.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
              <div className="text-sm text-[#86868b]">
                {sessaoSelecionada ? '1 sessão selecionada' : 'Selecione uma sessão destino'}
                {mensagensSelecionadas.length > 0 && ` • ${mensagensSelecionadas.length} mensagens`}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isEncaminhando}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleEncaminharEmFila}
                  disabled={!sessaoSelecionada || mensagensSelecionadas.length === 0 || isEncaminhando}
                  className="gap-2 bg-[#007aff] hover:bg-[#0066d9]"
                >
                  {isEncaminhando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Encaminhar {mensagensSelecionadas.length > 0 ? `(${mensagensSelecionadas.length})` : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}