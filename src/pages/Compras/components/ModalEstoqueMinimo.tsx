import React, { useState, useEffect } from 'react';
import { Modal, ModalContent } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader2, Save, X } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface ModalEstoqueMinimoProps {
  open: boolean;
  onClose: () => void;
  onSave: (minimo: number, voltaAsAulas: number, geral: number) => Promise<void>;
  produto: {
    codigo: string;
    descricao: string;
    estoqueMinimo?: number;
    estoqueMinimoVoltaAsAulas?: number;
    estoqueMinimoGeral?: number;
  } | null;
}

export function ModalEstoqueMinimo({ 
  open, 
  onClose, 
  onSave, 
  produto 
}: ModalEstoqueMinimoProps) {
  const [estoqueMinimo, setEstoqueMinimo] = useState<number>(0);
  const [estoqueMinimoVTA, setEstoqueMinimoVTA] = useState<number>(0);
  const [estoqueMinimoGeral, setEstoqueMinimoGeral] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CORREÇÃO: Carregar os valores atuais do produto quando o modal abrir
  useEffect(() => {
    if (produto && open) {
      console.log('📊 Carregando valores atuais do produto:', {
        codigo: produto.codigo,
        estoqueMinimo: produto.estoqueMinimo || 0,
        estoqueMinimoVTA: produto.estoqueMinimoVoltaAsAulas || 0,
        estoqueMinimoGeral: produto.estoqueMinimoGeral || 0
      });
      
      setEstoqueMinimo(produto.estoqueMinimo || 0);
      setEstoqueMinimoVTA(produto.estoqueMinimoVoltaAsAulas || 0);
      setEstoqueMinimoGeral(produto.estoqueMinimoGeral || 0);
      setError(null);
    }
  }, [produto, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (estoqueMinimo < 0 || estoqueMinimoVTA < 0 || estoqueMinimoGeral < 0) {
      setError('Os valores devem ser iguais ou maiores que zero.');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(estoqueMinimo, estoqueMinimoVTA, estoqueMinimoGeral);
      onClose();
    } catch (err) {
      setError('Erro ao salvar os estoques mínimos. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <ModalContent className="max-w-md p-0 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
              Definir Estoque Mínimo
            </h2>
            <button
              onClick={onClose}
              className="text-[#86868b] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {produto && (
            <div className="mb-4 p-3 bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-lg">
              <p className="text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                {produto.descricao}
              </p>
              <p className="text-xs text-[#86868b]">Código: {produto.codigo}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">
                Estoque Mínimo
                <span className="text-xs text-[#86868b] ml-2">(atual: {estoqueMinimo})</span>
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(Number(e.target.value))}
                className="bg-[#f5f5f7] dark:bg-[#2c2c2e] border-0"
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">
                Estoque Mínimo Volta às Aulas
                <span className="text-xs text-[#86868b] ml-2">(atual: {estoqueMinimoVTA})</span>
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={estoqueMinimoVTA}
                onChange={(e) => setEstoqueMinimoVTA(Number(e.target.value))}
                className="bg-[#f5f5f7] dark:bg-[#2c2c2e] border-0"
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">
                Estoque Mínimo Geral
                <span className="text-xs text-[#86868b] ml-2">(atual: {estoqueMinimoGeral})</span>
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={estoqueMinimoGeral}
                onChange={(e) => setEstoqueMinimoGeral(Number(e.target.value))}
                className="bg-[#f5f5f7] dark:bg-[#2c2c2e] border-0"
                disabled={isLoading}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#007aff] hover:bg-[#0066d9]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </ModalContent>
    </Modal>
  );
}