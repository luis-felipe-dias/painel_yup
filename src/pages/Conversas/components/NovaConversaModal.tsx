import { useState, useEffect } from "react";
import { Modal, ModalContent } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { useToast } from "../../../hooks/useToast";
import { sessoesService } from "../../../services/sessoes.service";
import { MessageSquarePlus, Loader2 } from "lucide-react";

interface NovaConversaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atendenteNome?: string;
  onConversaIniciada: (sessaoId: string) => void;
  // Quando vem de um contato já existente (ex: botão "Iniciar conversa"
  // na página Contatos), trava o telefone e mostra o nome dele em vez
  // do campo livre - evita digitar de novo um número que já se tem.
  contatoFixo?: { telefone: string; nome?: string };
}

export function NovaConversaModal({
  open,
  onOpenChange,
  atendenteNome,
  onConversaIniciada,
  contatoFixo
}: NovaConversaModalProps) {
  const [telefone, setTelefone] = useState(contatoFixo?.telefone || "");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (open) {
      setTelefone(contatoFixo?.telefone || "");
    }
  }, [open, contatoFixo?.telefone]);

  const handleClose = () => {
    if (enviando) return;
    setTelefone(contatoFixo?.telefone || "");
    setMensagem("");
    onOpenChange(false);
  };

  const handleEnviar = async () => {
    const telefoneDigitos = telefone.replace(/\D/g, "");
    if (telefoneDigitos.length < 10) {
      showToast("Digite um telefone válido (com DDD)", "error");
      return;
    }
    if (!mensagem.trim()) {
      showToast("Escreva a mensagem inicial", "error");
      return;
    }

    setEnviando(true);
    try {
      const { sessaoId } = await sessoesService.iniciarConversa(
        telefoneDigitos,
        mensagem.trim(),
        atendenteNome
      );
      showToast("Conversa iniciada! O bot fica em pausa por 30 minutos nessa sessão.", "success");
      setTelefone(contatoFixo?.telefone || "");
      setMensagem("");
      onOpenChange(false);
      onConversaIniciada(sessaoId);
    } catch (error: any) {
      const detalhe = error?.response?.data?.detail || error?.message || "Erro ao iniciar conversa";
      showToast(detalhe, "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <ModalContent className="max-w-md">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquarePlus className="w-5 h-5 text-[#007aff]" />
          <h3 className="text-base font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
            {contatoFixo ? `Falar com ${contatoFixo.nome || "contato"}` : "Iniciar nova conversa"}
          </h3>
        </div>
        <p className="text-sm text-[#86868b] mb-4">
          Manda a primeira mensagem pra um cliente. Enquanto ele responder dentro de 30
          minutos, o bot fica em pausa e a conversa continua com você.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#86868b] mb-1">
              Telefone (com DDD)
            </label>
            <Input
              placeholder="Ex: 33 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              disabled={enviando || !!contatoFixo}
              autoFocus={!contatoFixo}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#86868b] mb-1">
              Mensagem inicial
            </label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[90px] resize-none"
              placeholder="Olá! Aqui é a Yup Papelaria..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              disabled={enviando}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={handleClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            onClick={handleEnviar}
            disabled={enviando}
            className="gap-2 bg-[#007aff] hover:bg-[#0066d9]"
          >
            {enviando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="w-4 h-4" />
            )}
            Enviar
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
