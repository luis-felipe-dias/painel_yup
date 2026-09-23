import { useQuery, useQueryClient } from "@tanstack/react-query";
import { metricasService, SETORES_LABEL } from "../../services/metricas.service";
import { cn } from "../../utils/cn";
import {
  MessageSquare,
  Users,
  Clock,
  Headphones,
  RefreshCw,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  Loader2,
  UserCheck
} from "lucide-react";

export default function Metricas() {
  const queryClient = useQueryClient();

  const { data: gerais, isLoading: carregandoGerais } = useQuery({
    queryKey: ["metricas", "gerais"],
    queryFn: () => metricasService.buscarEstatisticasGerais(),
    refetchInterval: 60000
  });

  const { data: atendentesData, isLoading: carregandoAtendentes } = useQuery({
    queryKey: ["metricas", "atendentes"],
    queryFn: () => metricasService.buscarMetricasAtendentes(),
    refetchInterval: 60000
  });

  const { data: setores = [], isLoading: carregandoSetores } = useQuery({
    queryKey: ["metricas", "setores"],
    queryFn: () => metricasService.buscarCargaPorSetor(),
    refetchInterval: 60000
  });

  const { data: historicoEstoque = [], isLoading: carregandoEstoque } = useQuery({
    queryKey: ["metricas", "estoque-historico"],
    queryFn: () => metricasService.buscarHistoricoEstoque(30)
  });

  const isLoading = carregandoGerais || carregandoAtendentes || carregandoSetores || carregandoEstoque;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["metricas"] });
  };

  const atendentes = atendentesData?.atendentes || [];
  const maxSetor = Math.max(1, ...setores.map(s => s.total));
  const ultimoSnapshot = historicoEstoque[historicoEstoque.length - 1];
  const primeiroSnapshot = historicoEstoque[0];

  return (
    <div className="h-full flex flex-col bg-[#f5f5f7] dark:bg-[#1a1a1e]">
      <div className="p-4 md:p-6 border-b bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-[#e5e5ea] dark:border-[#38383a] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">
              Métricas
            </h1>
            <p className="text-sm text-[#86868b]">
              Atendimento e reposição de estoque, em tempo real.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] text-[#86868b] hover:text-[#007aff] transition-colors shrink-0"
            title="Atualizar"
          >
            <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Visão geral do dia */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<MessageSquare className="w-4 h-4" />}
            label="Mensagens hoje"
            value={gerais?.mensagens_hoje}
            color="#007aff"
          />
          <StatCard
            icon={<Headphones className="w-4 h-4" />}
            label="Em atendimento humano"
            value={gerais?.atendimento_humano_ativas}
            color="#5856d6"
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Fila pendente"
            value={gerais?.fila_humana_pendente}
            color="#ff3b30"
          />
          <StatCard
            icon={<Users className="w-4 h-4" />}
            label="Contatos totais"
            value={gerais?.total_contatos}
            color="#34c759"
          />
        </div>

        {/* Carga por atendente */}
        <Secao
          titulo="Carga por atendente"
          subtitulo={
            atendentesData && atendentesData.mediaAtendimentos7dias > 0
              ? `Média do time nos últimos 7 dias: ${atendentesData.mediaAtendimentos7dias} atendimentos`
              : "Quem está atendendo muito - ou pouco"
          }
        >
          {atendentes.length === 0 ? (
            <EstadoVazio texto="Nenhum atendente com atividade registrada ainda." />
          ) : (
            <div className="divide-y divide-[#e5e5ea] dark:divide-[#38383a]">
              {atendentes.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0",
                      a.atendendoAgora ? "bg-[#34c759]" : "bg-[#86868b]"
                    )}
                  >
                    {a.nome?.charAt(0).toUpperCase() || "?"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-[#1c1c1e] dark:text-[#f5f5f7] truncate">
                        {a.nome}
                      </span>
                      {a.atendendoAgora && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-[#34c759] bg-[#34c759]/10 px-1.5 py-0.5 rounded-full">
                          <UserCheck className="w-2.5 h-2.5" />
                          Agora
                        </span>
                      )}
                      {a.cargaVsMedia === "sobrecarregado" && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-[#ff3b30] bg-[#ff3b30]/10 px-1.5 py-0.5 rounded-full">
                          <TrendingUp className="w-2.5 h-2.5" />
                          Sobrecarregado
                        </span>
                      )}
                      {a.cargaVsMedia === "ocioso" && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-[#ff9500] bg-[#ff9500]/10 px-1.5 py-0.5 rounded-full">
                          <TrendingDown className="w-2.5 h-2.5" />
                          Ocioso
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#86868b] mt-0.5">
                      {a.atendimentosHoje} hoje · {a.atendimentos7dias} em 7 dias · {a.totalAtendimentos} no total
                      {a.taxaResposta !== null && <> · {a.taxaResposta}% de resposta</>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Secao>

        {/* Carga por setor */}
        <Secao titulo="Fila por setor" subtitulo="Sessões em atendimento humano agora, por setor">
          {setores.length === 0 ? (
            <EstadoVazio texto="Nenhuma sessão em atendimento humano no momento." />
          ) : (
            <div className="space-y-3">
              {setores.map((s) => (
                <div key={s.setor}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                      {SETORES_LABEL[s.setor] || s.setor}
                    </span>
                    <span className="text-[#86868b]">
                      {s.total} {s.total === 1 ? "sessão" : "sessões"}
                      {s.aguardando > 0 && (
                        <span className="text-[#ff3b30] font-medium"> · {s.aguardando} aguardando</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f5f5f7] dark:bg-[#2c2c2e] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#007aff]"
                      style={{ width: `${(s.total / maxSetor) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Secao>

        {/* Reposição de estoque - tendência */}
        <Secao
          titulo="Reposição de estoque"
          subtitulo="Evolução de produtos críticos e a repor, dia a dia"
        >
          {ultimoSnapshot ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <StatCard
                  compacto
                  icon={<AlertTriangle className="w-4 h-4" />}
                  label="Críticos"
                  value={ultimoSnapshot.criticos}
                  color="#dc2626"
                />
                <StatCard
                  compacto
                  icon={<Clock className="w-4 h-4" />}
                  label="Precisa repor"
                  value={ultimoSnapshot.precisaRepor}
                  color="#d97706"
                />
                <StatCard
                  compacto
                  icon={<Users className="w-4 h-4" />}
                  label="Ok"
                  value={ultimoSnapshot.estoqueOk}
                  color="#16a34a"
                />
              </div>

              {historicoEstoque.length > 1 ? (
                <>
                  <div className="flex items-end gap-1 h-24">
                    {historicoEstoque.map((dia) => {
                      const total = dia.total || 1;
                      return (
                        <div
                          key={dia.data}
                          className="flex-1 h-full flex flex-col justify-end gap-px rounded-sm overflow-hidden"
                          title={`${dia.data}: ${dia.criticos} crítico(s), ${dia.precisaRepor} a repor, ${dia.estoqueOk} ok`}
                        >
                          <div
                            className="bg-[#dc2626]"
                            style={{ height: `${(dia.criticos / total) * 100}%` }}
                          />
                          <div
                            className="bg-[#d97706]"
                            style={{ height: `${(dia.precisaRepor / total) * 100}%` }}
                          />
                          <div
                            className="bg-[#16a34a]"
                            style={{ height: `${(dia.estoqueOk / total) * 100}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#86868b] mt-2">
                    <span>{formatarDataCurta(primeiroSnapshot.data)}</span>
                    <span>{formatarDataCurta(ultimoSnapshot.data)}</span>
                  </div>
                  <ComparativoReposicao
                    primeiro={primeiroSnapshot}
                    ultimo={ultimoSnapshot}
                  />
                </>
              ) : (
                <p className="text-xs text-[#86868b] text-center py-2">
                  Histórico começou hoje - a partir de amanhã dá pra ver se a reposição está melhorando ou piorando.
                </p>
              )}
            </>
          ) : (
            <EstadoVazio texto="Abra a página Estoque uma vez para começar a registrar o histórico." />
          )}
        </Secao>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  compacto
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  color: string;
  compacto?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-[#1c1c1e] rounded-xl border border-[#e5e5ea] dark:border-[#38383a]",
        compacto ? "p-3" : "p-4"
      )}
    >
      <div className="flex items-center gap-1.5 text-[#86868b] mb-1.5" style={{ color }}>
        {icon}
        <span className="text-xs font-medium truncate">{label}</span>
      </div>
      <div className="text-xl md:text-2xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">
        {value === undefined || value === null ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#86868b]" />
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function Secao({
  titulo,
  subtitulo,
  children
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-xl border border-[#e5e5ea] dark:border-[#38383a] p-4 md:p-5">
      <h2 className="text-[15px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">{titulo}</h2>
      {subtitulo && <p className="text-xs text-[#86868b] mb-3">{subtitulo}</p>}
      <div className={subtitulo ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

function EstadoVazio({ texto }: { texto: string }) {
  return <p className="text-sm text-[#86868b] text-center py-4">{texto}</p>;
}

function ComparativoReposicao({
  primeiro,
  ultimo
}: {
  primeiro: { criticos: number; precisaRepor: number };
  ultimo: { criticos: number; precisaRepor: number };
}) {
  const problemasAntes = primeiro.criticos + primeiro.precisaRepor;
  const problemasAgora = ultimo.criticos + ultimo.precisaRepor;
  const diferenca = problemasAgora - problemasAntes;

  if (diferenca === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[#86868b] mt-3">
        <Minus className="w-3.5 h-3.5" />
        Sem mudança no período: {problemasAgora} produto(s) crítico(s) ou a repor.
      </div>
    );
  }

  const melhorou = diferenca < 0;
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs mt-3 font-medium",
        melhorou ? "text-[#16a34a]" : "text-[#dc2626]"
      )}
    >
      {melhorou ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
      {melhorou
        ? `Melhorando: ${Math.abs(diferenca)} produto(s) a menos em crítico/precisa repor desde o início do período.`
        : `Piorando: ${diferenca} produto(s) a mais em crítico/precisa repor desde o início do período.`}
    </div>
  );
}

function formatarDataCurta(data: string): string {
  try {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}`;
  } catch {
    return data;
  }
}
