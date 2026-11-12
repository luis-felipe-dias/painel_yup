import { api } from './api/client';

const ESTOQUE_API_URL = 'https://api.nowlords.com.br/estoque';

export interface LiveUpdatesHandle {
  parar: () => void;
}

/**
 * Poll leve no /produtos/atualizados-desde: em vez de rebuscar o catálogo
 * inteiro a cada refresh, só pega o que mudou desde o último poll (webhook
 * do Olist + jobs automáticos alimentam isso no backend). Cada serviço
 * injeta o cursor (timestamp) e como mesclar o resultado no seu cache —
 * assim a tela se atualiza sozinha, sem F5 e sem perder filtro ou scroll.
 *
 * ────────────────────────────────────────────────────────────────────
 * TRÊS DEFEITOS QUE ESTA VERSÃO CORRIGE
 *
 * 1. setInterval NÃO É CONFIÁVEL EM ABA DE FUNDO.
 *    O navegador estrangula o timer para no máximo 1x/min quando a aba
 *    sai da frente, e o suspende de vez quando o aparelho dorme. O painel
 *    que fica aberto a manhã inteira numa aba atrás voltava mostrando
 *    dados de horas antes, sem nenhum aviso. Agora, ao voltar à frente, a
 *    tela se recupera imediatamente em vez de esperar o próximo ciclo.
 *
 * 2. UMA REQUISIÇÃO PRESA MATAVA O POLL PARA SEMPRE.
 *    `emAndamento` virava true e, se aquela promessa nunca se resolvesse,
 *    nunca voltava a false — todo ciclo seguinte saía pela porta dos
 *    fundos em silêncio. O cão de guarda abaixo destrava.
 *
 * 3. FALHA ERA INVISÍVEL.
 *    O catch escrevia um console.warn e pronto. Se o backend estivesse
 *    fora do ar, a tela seguia mostrando número velho com cara de número
 *    novo. Agora o estado é publicado em `onEstado` para a tela avisar.
 * ────────────────────────────────────────────────────────────────────
 */
export type EstadoLive = {
  /** false depois de 3 ciclos seguidos sem conseguir falar com o servidor. */
  saudavel: boolean;
  ultimoSucesso: number | null;
  falhasSeguidas: number;
};

export function iniciarLiveUpdates(params: {
  getUltimoTimestamp: () => string | null;
  onAtualizacao: (produtos: Record<string, any>, removidos: string[], servidorTimestamp: string) => void;
  /** Avisa quando o poll perde (ou recupera) contato com o servidor. */
  onEstado?: (estado: EstadoLive) => void;
  /** Recarga completa, usada quando a aba volta depois de muito tempo. */
  onRecargaCompleta?: () => void;
  intervalMs?: number;
}): LiveUpdatesHandle {
  const intervalMs = params.intervalMs ?? 12000;
  /* Acima disto, o buraco é grande demais para confiar no cursor: em vez
     de pedir "o que mudou", recarrega tudo. Três minutos cobrem o
     estrangulamento normal de aba de fundo sem recarregar à toa. */
  const RECARGA_APOS_MS = 3 * 60 * 1000;

  let ativo = true;
  let emAndamento = false;
  let comecouEm = 0;
  let ultimoSucesso: number | null = null;
  let falhasSeguidas = 0;

  const publicar = () =>
    params.onEstado?.({
      saudavel: falhasSeguidas < 3,
      ultimoSucesso,
      falhasSeguidas,
    });

  const poll = async (motivo: 'ciclo' | 'voltou' = 'ciclo') => {
    if (!ativo) return;

    // Cão de guarda: requisição presa há mais de 3 ciclos destrava.
    if (emAndamento) {
      if (Date.now() - comecouEm > intervalMs * 3) {
        console.warn('⚠️ Live updates: poll preso, destravando');
        emAndamento = false;
      } else {
        return;
      }
    }

    const desde = params.getUltimoTimestamp();
    if (!desde) return; // ainda não carregou o catálogo inicial

    emAndamento = true;
    comecouEm = Date.now();
    try {
      const response = await api.get(`${ESTOQUE_API_URL}/produtos/atualizados-desde`, {
        params: { desde },
      });
      const data = response.data;
      if (data?.sucesso) {
        ultimoSucesso = Date.now();
        falhasSeguidas = 0;
        params.onAtualizacao(data.produtos || {}, data.removidos || [], data.servidor_timestamp);
      } else {
        falhasSeguidas += 1;
      }
    } catch (error) {
      falhasSeguidas += 1;
      console.warn(
        `⚠️ Live updates: falha no poll (${falhasSeguidas} seguida(s), motivo=${motivo})`,
        error
      );
    } finally {
      emAndamento = false;
      publicar();
    }
  };

  const timer = setInterval(() => void poll('ciclo'), intervalMs);

  /* A aba voltou à frente. Se ficou muito tempo atrás, o timer estava
     estrangulado ou suspenso e o cursor pode ter ficado para trás demais:
     aí é recarga completa, não "o que mudou". */
  const aoVoltar = () => {
    if (!ativo || document.visibilityState !== 'visible') return;
    const parado = ultimoSucesso ? Date.now() - ultimoSucesso : Infinity;
    if (parado > RECARGA_APOS_MS && params.onRecargaCompleta) {
      console.log('🔄 Live updates: aba voltou após muito tempo, recarregando tudo');
      params.onRecargaCompleta();
    } else {
      void poll('voltou');
    }
  };

  document.addEventListener('visibilitychange', aoVoltar);
  window.addEventListener('online', aoVoltar);
  window.addEventListener('focus', aoVoltar);

  return {
    parar: () => {
      ativo = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('online', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
    },
  };
}
