import { whatsappApi, painelApi } from "./api/client";
import { authService } from "./auth.service";
import {
  MetricasAtendentes,
  SetorCarga,
  EstatisticasGerais,
  EstoqueSnapshotDia
} from "../types/metricas.types";

export const SETORES_LABEL: Record<string, string> = {
  atendimento: "Atendimento",
  financeiro: "Financeiro",
  comercial: "Comercial",
  ouvidoria: "Ouvidoria",
  tecnico: "Técnico",
  rh: "RH",
  qualidade: "Qualidade",
  grupo: "Grupos"
};

export const metricasService = {
  async buscarMetricasAtendentes(): Promise<MetricasAtendentes> {
    const data = await authService.getMetricas();
    if (!data?.sucesso) {
      return { mediaAtendimentos7dias: 0, atendentes: [] };
    }
    return {
      mediaAtendimentos7dias: data.mediaAtendimentos7dias || 0,
      atendentes: data.atendentes || []
    };
  },

  async buscarEstatisticasGerais(): Promise<EstatisticasGerais | null> {
    try {
      const response = await whatsappApi.get("/bot/yup/estatisticas");
      return response.data?.estatisticas || null;
    } catch (error) {
      console.error("❌ Erro ao buscar estatísticas gerais:", error);
      return null;
    }
  },

  async buscarCargaPorSetor(): Promise<SetorCarga[]> {
    try {
      const response = await whatsappApi.get("/bot/yup/estatisticas/setores");
      return response.data?.setores || [];
    } catch (error) {
      console.error("❌ Erro ao buscar carga por setor:", error);
      return [];
    }
  },

  async enviarSnapshotEstoque(dados: {
    criticos: number;
    precisaRepor: number;
    estoqueOk: number;
    total: number;
  }): Promise<void> {
    try {
      await painelApi.post("/estoque/snapshot", dados);
    } catch (error) {
      console.error("❌ Erro ao salvar snapshot de estoque:", error);
    }
  },

  async buscarHistoricoEstoque(dias: number = 30): Promise<EstoqueSnapshotDia[]> {
    try {
      const response = await painelApi.get("/estoque/historico", { params: { dias } });
      const historico = response.data?.historico || [];
      return historico.map((h: any) => ({
        data: h.data,
        criticos: h.criticos,
        precisaRepor: h.precisaRepor,
        estoqueOk: h.estoqueOk,
        total: h.total
      }));
    } catch (error) {
      console.error("❌ Erro ao buscar histórico de estoque:", error);
      return [];
    }
  }
};
