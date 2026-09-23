import { useState } from "react";
import { Modal, ModalContent } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { useToast } from "../../../hooks/useToast";
import { sessoesService, SETORES } from "../../../services/sessoes.service";
import { ArrowRightLeft, Loader2, Check } from "lucide-react";
import { cn } from "../../../utils/cn";

interface TransferirSetorPopoverProps {
  children: React.ReactNode;
  sessaoId: string;
  setorAtual?: string;
  onTransferido: () => void;
}

export function TransferirSetorPopover({
  children,
  sessaoId,
  setorAtual,
  onTransferido
}: TransferirSetorPopoverProps) {
  const [open, setOpen] = useState(false);
  const [transferindo, setTransferindo] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleTransferir = async (setor: string) => {
    setTransferindo(setor);
    try {
      await sessoesService.transferirSetor(sessaoId, setor);
      showToast(`Atendimento transferido para ${SETORES[setor]}`, "success");
      setOpen(false);
      onTransferido();
    } catch (error: any) {
      const detalhe = error?.response?.data?.detail || "Erro ao transferir atendimento";
      showToast(detalhe, "error");
    } finally {
      setTransferindo(null);
    }
  };

  return (
    <>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {children}
      </div>

      <Modal open={open} onOpenChange={(isOpen) => !isOpen && setOpen(false)}>
        <ModalContent className="max-w-sm">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRightLeft className="w-5 h-5 text-[#007aff]" />
            <h3 className="text-base font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
              Transferir atendimento
            </h3>
          </div>
          <p className="text-sm text-[#86868b] mb-4">
            O cliente é avisado automaticamente e continua no atendimento humano - não volta
            pro bot nem precisa repetir nada.
          </p>

          <div className="space-y-1.5">
            {Object.entries(SETORES).map(([chave, label]) => {
              const ativo = setorAtual === chave;
              return (
                <button
                  key={chave}
                  onClick={() => !ativo && handleTransferir(chave)}
                  disabled={ativo || transferindo !== null}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left disabled:cursor-default",
                    ativo
                      ? "bg-[#007aff]/10 text-[#007aff]"
                      : "hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] text-[#1c1c1e] dark:text-[#f5f5f7]"
                  )}
                >
                  <span>{label}</span>
                  {ativo && <Check className="w-4 h-4" />}
                  {transferindo === chave && <Loader2 className="w-4 h-4 animate-spin" />}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={transferindo !== null}
            >
              Fechar
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}
