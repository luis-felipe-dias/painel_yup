import { useState, useEffect } from "react";
import { Modal, ModalContent } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { useToast } from "../../../hooks/useToast";
import { contatosService } from "../../../services/contatos.service";
import { Contato } from "../../../types/contatos.types";
import { Pencil, Loader2 } from "lucide-react";

interface ContatoEditModalProps {
  contato: Contato | null;
  onClose: () => void;
  onSaved: (contato: Contato) => void;
}

export function ContatoEditModal({ contato, onClose, onSaved }: ContatoEditModalProps) {
  const [nome, setNome] = useState("");
  const [tags, setTags] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const { showToast } = useToast();

  const isGroup = contato?.isGroup ?? false;

  useEffect(() => {
    if (contato) {
      setNome(contato.nome === contato.telefone ? "" : contato.nome);
      setTags((contato.tags || []).filter(t => t !== "grupo").join(", "));
      setObservacoes(contato.observacoes || "");
    }
  }, [contato]);

  const handleSalvar = async () => {
    if (!contato) return;
    if (!nome.trim()) {
      showToast("Digite o nome correto do cliente", "error");
      return;
    }

    setSalvando(true);
    try {
      const tagsArray = tags
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);

      const atualizado = await contatosService.atualizar(contato.id, {
        nome: nome.trim(),
        tags: tagsArray,
        observacoes: observacoes.trim()
      });

      if (atualizado) {
        showToast("Contato atualizado", "success");
        onSaved(atualizado);
      }
    } catch (error) {
      showToast("Erro ao salvar contato", "error");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal open={!!contato} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <ModalContent className="max-w-md">
        <div className="flex items-center gap-2 mb-4">
          <Pencil className="w-5 h-5 text-[#007aff]" />
          <h3 className="text-base font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
            {isGroup ? "Corrigir grupo" : "Corrigir contato"}
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#86868b] mb-1">
              {isGroup ? "Identificador do grupo" : "Telefone"}
            </label>
            <Input value={contato?.telefone || ""} disabled />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#86868b] mb-1">
              {isGroup ? "Nome correto do grupo" : "Nome correto do cliente"}
            </label>
            <Input
              placeholder={isGroup ? "Ex: Grupo Vendas Manhuaçu" : "Ex: Maria Silva"}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={salvando}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#86868b] mb-1">
              Tags (separadas por vírgula)
            </label>
            <Input
              placeholder="Ex: atacado, escola"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#86868b] mb-1">
              Observações
            </label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[70px] resize-none"
              placeholder="Anotações internas sobre o cliente..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              disabled={salvando}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={salvando}
            className="gap-2 bg-[#007aff] hover:bg-[#0066d9]"
          >
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
