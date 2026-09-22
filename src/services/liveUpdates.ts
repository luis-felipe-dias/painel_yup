import { api } from './api/client';

const ESTOQUE_API_URL = 'https://api.nowlords.com.br/estoque';

export interface LiveUpdatesHandle {
  parar: () => void;
}

/**
 * Poll leve no /produtos/atualizados-desde: em vez de rebuscar o catálogo
 * inteiro a cada refresh, só pega o que mudou desde o último poll (webhook
 * do Tiny + jobs automáticos já alimentam isso no backend). Cada serviço
 * injeta como guarda o cursor (timestamp) e como mescla o resultado no seu
 * cache local - assim a tela se atualiza sozinha, sem precisar de F5 e sem
 * perder filtro/scroll/posição (só troca o que realmente mudou).
 */
export function iniciarLiveUpdates(params: {
  getUltimoTimestamp: () => string | null;
  onAtualizacao: (produtos: Record<string, any>, removidos: string[], servidorTimestamp: string) => void;
  intervalMs?: number;
}): LiveUpdatesHandle {
  const intervalMs = params.intervalMs ?? 12000;
  let ativo = true;
  let emAndamento = false;

  const poll = async () => {
    if (!ativo || emAndamento) return;
    const desde = params.getUltimoTimestamp();
    if (!desde) return; // ainda não carregou o catálogo inicial

    emAndamento = true;
    try {
      const response = await api.get(`${ESTOQUE_API_URL}/produtos/atualizados-desde`, {
        params: { desde }
      });
      const data = response.data;
      if (data?.sucesso) {
        params.onAtualizacao(data.produtos || {}, data.removidos || [], data.servidor_timestamp);
      }
    } catch (error) {
      console.warn('⚠️ Live updates: falha no poll (tenta de novo no próximo ciclo)', error);
    } finally {
      emAndamento = false;
    }
  };

  const timer = setInterval(poll, intervalMs);

  return {
    parar: () => {
      ativo = false;
      clearInterval(timer);
    }
  };
}
