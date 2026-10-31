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
//
// Apresentação: zero hex na mão. Cor sai sempre de token semântico, então
// o tema escuro acompanha sozinho. Vidro (backdrop-filter) NÃO é usado
// aqui: não existe barra fixa nesta tela e vidro em card que se repete
// custa recálculo a cada rolagem.

// ── Tons de ícone dos cartões/alertas. Nome pela função, não pela cor.
type TomDestaque = "acao" | "humano" | "positivo" | "negativo" | "atencao";

// `brincadeira` e `chama` entram no tom DEFAULT (não no `.ink`): é o único
// valor da paleta que fica legível tanto sobre `bg-surface` claro quanto
// sobre o escuro, já que a marca não troca de tom com o tema.
const TOM_ICONE: Record<TomDestaque, string> = {
  acao: "text-accent-foreground",
  humano: "text-brincadeira",
  positivo: "text-atendendo-ink",
  negativo: "text-destructive",
  atencao: "text-chama"
};

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
    // Sem cor de fundo própria: o gradiente `ambiente` do RootLayout
    // aparece por baixo e os cartões `bg-surface` é que recortam o conteúdo.
    <div className="h-full overflow-y-auto scrollbar-custom p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5 md:space-y-6">
        <div>
          <h1 className="text-lg md:text-2xl font-semibold text-foreground mb-1">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Retrato de hoje. Pra tendência e histórico, veja Métricas.
          </p>
        </div>

        {/* Cards principais - 2 colunas no celular, 4 só a partir do md.
            Quatro colunas em 360px deixaria o número ilegível. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<MessageSquare className="w-4 h-4" />}
            label="Mensagens hoje"
            value={gerais?.mensagens_hoje}
            sub={
              gerais
                ? `${gerais.mensagens_recebidas_hoje} recebidas · ${gerais.mensagens_enviadas_hoje} enviadas`
                : undefined
            }
            tom="acao"
          />
          <StatCard
            icon={<Headphones className="w-4 h-4" />}
            label="Em atendimento humano"
            value={gerais?.atendimento_humano_ativas}
            tom="humano"
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Fila pendente"
            value={gerais?.fila_humana_pendente}
            tom={filaPendente > 0 ? "negativo" : "positivo"}
          />
          <StatCard
            icon={<Users className="w-4 h-4" />}
            label="Contatos totais"
            value={gerais?.total_contatos}
            tom="positivo"
          />
        </div>

        {/* Alertas do dia - único painel de destaque da tela */}
        <div className="bg-surface border border-border shadow-card rounded-xl p-4 md:p-5">
          <h2 className="text-[15px] font-semibold text-foreground mb-3">
            Precisa de atenção
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-1.5 md:space-y-2">
              {filaPendente > 0 && (
                <AlertaItem
                  icon={<Clock className="w-4 h-4" />}
                  tom="negativo"
                  texto={`${filaPendente} ${filaPendente === 1 ? "cliente" : "clientes"} na fila esperando atendimento`}
                  acao={() => navigate("/conversas")}
                />
              )}
              {sobrecarregados.map(a => (
                <AlertaItem
                  key={a.id}
                  icon={<TrendingUp className="w-4 h-4" />}
                  tom="atencao"
                  texto={`${a.nome} está sobrecarregado: ${a.atendimentosHoje} atendimentos hoje`}
                  acao={() => navigate("/metricas")}
                />
              ))}
              {filaPendente === 0 && sobrecarregados.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-atendendo-ink py-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
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
  tom
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  sub?: string;
  tom: TomDestaque;
}) {
  return (
    <div className="bg-surface border border-border shadow-card rounded-lg p-3 md:p-4">
      <div className={`flex items-center gap-1.5 mb-1.5 ${TOM_ICONE[tom]}`}>
        <span className="shrink-0">{icon}</span>
        <span className="text-xs font-medium truncate" title={label}>
          {label}
        </span>
      </div>
      {/* tnum: contador que atualiza a cada minuto não pode "dançar" */}
      <div className="tnum text-xl md:text-2xl font-bold text-foreground">
        {value === undefined || value === null ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          value
        )}
      </div>
      {sub && (
        <p className="tnum text-[11px] text-muted-foreground mt-0.5 truncate" title={sub}>
          {sub}
        </p>
      )}
    </div>
  );
}

function AlertaItem({
  icon,
  tom,
  texto,
  acao
}: {
  icon: React.ReactNode;
  tom: TomDestaque;
  texto: string;
  acao: () => void;
}) {
  return (
    // min-h-toque: 44px de alvo no celular, mas o texto pode quebrar em
    // duas linhas em 360px sem estourar o botão.
    <button
      onClick={acao}
      className="foco-anel w-full flex items-center gap-2.5 text-left px-3 min-h-toque md:min-h-9 py-2 rounded-md hover:bg-surface-muted transition-colors"
    >
      <span className={`shrink-0 ${TOM_ICONE[tom]}`}>{icon}</span>
      <span className="tnum text-sm text-foreground flex-1">{texto}</span>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
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
      className="foco-anel flex items-start gap-3 text-left bg-surface border border-border shadow-card rounded-lg p-4 min-h-toque hover:border-accent/40 transition-colors"
    >
      <div className="w-9 h-9 rounded-md bg-accent-soft text-accent-foreground flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm text-foreground truncate">{titulo}</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>
      </div>
    </button>
  );
}
