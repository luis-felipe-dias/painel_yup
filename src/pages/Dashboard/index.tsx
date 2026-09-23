import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { metricasService } from "../../services/metricas.service";
import {
  MessageSquare,
  Headphones,
  Clock,
  Users,
  TrendingUp,
  ArrowRight,
  BarChart3,
  Package,
  Loader2,
  CheckCircle2
} from "lucide-react";

// Antes essa página era 100% estática - números "--" fixos no código,
// nunca puxava nada do backend. Agora reaproveita o mesmo serviço da
// página Métricas pra mostrar o retrato do dia, com atalhos pra quem
// quiser aprofundar (histórico completo fica em Métricas).
export default function Dashboard() {
  const navigate = useNavigate();

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

  const isLoading = carregandoGerais || carregandoAtendentes;
  const atendentes = atendentesData?.atendentes || [];
  const sobrecarregados = atendentes.filter(a => a.cargaVsMedia === "sobrecarregado");
  const filaPendente = gerais?.fila_humana_pendente || 0;

  return (
    <div className="h-full overflow-y-auto scrollbar-custom p-4 md:p-6 bg-[#f5f5f7] dark:bg-[#1a1a1e]">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">
            Dashboard
          </h1>
          <p className="text-sm text-[#86868b]">
            Retrato de hoje. Pra tendência e histórico, veja Métricas.
          </p>
        </div>

        {/* Cards principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<MessageSquare className="w-4 h-4" />}
            label="Mensagens hoje"
            value={gerais?.mensagens_hoje}
            sub={
              gerais
                ? `${gerais.mensagens_recebidas_hoje} recebidas · ${gerais.mensagens_enviadas_hoje} enviadas`
                : undefined
            }
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
            color={filaPendente > 0 ? "#ff3b30" : "#34c759"}
          />
          <StatCard
            icon={<Users className="w-4 h-4" />}
            label="Contatos totais"
            value={gerais?.total_contatos}
            color="#34c759"
          />
        </div>

        {/* Alertas do dia */}
        <div className="bg-white dark:bg-[#1c1c1e] rounded-xl border border-[#e5e5ea] dark:border-[#38383a] p-4 md:p-5">
          <h2 className="text-[15px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] mb-3">
            Precisa de atenção
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-[#86868b]">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {filaPendente > 0 && (
                <AlertaItem
                  icon={<Clock className="w-4 h-4" />}
                  cor="#ff3b30"
                  texto={`${filaPendente} ${filaPendente === 1 ? "cliente" : "clientes"} na fila esperando atendimento`}
                  acao={() => navigate("/conversas")}
                />
              )}
              {sobrecarregados.map(a => (
                <AlertaItem
                  key={a.id}
                  icon={<TrendingUp className="w-4 h-4" />}
                  cor="#ff9500"
                  texto={`${a.nome} está sobrecarregado: ${a.atendimentosHoje} atendimentos hoje`}
                  acao={() => navigate("/metricas")}
                />
              ))}
              {filaPendente === 0 && sobrecarregados.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-[#34c759] py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Tudo em dia - sem fila parada e sem atendente sobrecarregado.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Atalhos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AtalhoCard
            icon={<BarChart3 className="w-5 h-5" />}
            titulo="Métricas completas"
            descricao="Carga por atendente, fila por setor e tendência de reposição de estoque"
            onClick={() => navigate("/metricas")}
          />
          <AtalhoCard
            icon={<Package className="w-5 h-5" />}
            titulo="Estoque"
            descricao="Produtos críticos e que precisam de reposição agora"
            onClick={() => navigate("/estoque")}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-xl border border-[#e5e5ea] dark:border-[#38383a] p-4">
      <div className="flex items-center gap-1.5 mb-1.5" style={{ color }}>
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
      {sub && <p className="text-[11px] text-[#86868b] mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function AlertaItem({
  icon,
  cor,
  texto,
  acao
}: {
  icon: React.ReactNode;
  cor: string;
  texto: string;
  acao: () => void;
}) {
  return (
    <button
      onClick={acao}
      className="w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] transition-colors"
    >
      <span className="shrink-0" style={{ color: cor }}>{icon}</span>
      <span className="text-sm text-[#1c1c1e] dark:text-[#f5f5f7] flex-1">{texto}</span>
      <ArrowRight className="w-3.5 h-3.5 text-[#86868b] shrink-0" />
    </button>
  );
}

function AtalhoCard({
  icon,
  titulo,
  descricao,
  onClick
}: {
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 text-left bg-white dark:bg-[#1c1c1e] rounded-xl border border-[#e5e5ea] dark:border-[#38383a] p-4 hover:border-[#007aff]/40 transition-colors"
    >
      <div className="w-9 h-9 rounded-lg bg-[#007aff]/10 text-[#007aff] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm text-[#1c1c1e] dark:text-[#f5f5f7]">{titulo}</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#86868b]" />
        </div>
        <p className="text-xs text-[#86868b] mt-0.5">{descricao}</p>
      </div>
    </button>
  );
}
