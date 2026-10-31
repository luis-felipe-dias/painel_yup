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

// Apresentação: zero hex na mão - cor sai de token semântico e o tema
// escuro acompanha sozinho. Vidro (`glass`) só na barra de cabeçalho, que
// é superfície fixa; lista de atendentes, barras e cartões usam
// `bg-surface` porque backdrop-filter em elemento repetido é recalculado
// a cada rolagem do que está atrás.

// ── Tons dos cartões de número. Nome pela função, não pela cor.
// `brincadeira`/`chama` no tom DEFAULT: é o valor da marca que fica legível
// tanto sobre superfície clara quanto escura (a marca não troca com o tema).
type TomDestaque =
  | "acao"
  | "humano"
  | "positivo"
  | "negativo"
  | "atencao"
  | "neutro";

const TOM_ICONE: Record<TomDestaque, string> = {
  acao: "text-accent-foreground",
  humano: "text-brincadeira",
  positivo: "text-atendendo-ink",
  negativo: "text-destructive",
  atencao: "text-aguardando-ink",
  neutro: "text-muted-foreground"
};

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
    // Sem cor de fundo própria: o `ambiente` do RootLayout aparece por baixo.
    <div className="h-full flex flex-col">
      {/* Barra de título - única superfície de vidro da tela */}
      <div className="glass border-b border-border p-4 md:p-6 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-semibold text-foreground mb-1">
              Métricas
            </h1>
            <p className="text-sm text-muted-foreground">
              Atendimento e reposição de estoque, em tempo real.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="foco-anel h-toque w-toque md:h-9 md:w-9 flex items-center justify-center rounded-md hover:bg-surface-muted text-muted-foreground hover:text-accent-foreground transition-colors shrink-0"
            title="Atualizar"
            aria-label="Atualizar métricas"
          >
            <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-custom p-4 md:p-6 space-y-5 md:space-y-6">
        {/* Visão geral do dia - 2 colunas no celular, 4 só a partir do md */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<MessageSquare className="w-4 h-4" />}
            label="Mensagens hoje"
            value={gerais?.mensagens_hoje}
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
            tom="negativo"
          />
          <StatCard
            icon={<Users className="w-4 h-4" />}
            label="Contatos totais"
            value={gerais?.total_contatos}
            tom="positivo"
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
            <div className="divide-y divide-border">
              {atendentes.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0",
                      // Noite Serena no texto porque os fundos de status não
                      // trocam de tom com o tema - branco reprovaria na oliva.
                      a.atendendoAgora
                        ? "bg-atendendo text-noite"
                        : "bg-finalizada text-noite"
                    )}
                  >
                    {a.nome?.charAt(0).toUpperCase() || "?"}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Em 360px os selos quebram pra linha de baixo em vez de
                        empurrar o nome do atendente pra fora da tela. */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className="font-medium text-sm text-foreground truncate max-w-[55vw] md:max-w-none"
                        title={a.nome}
                      >
                        {a.nome}
                      </span>
                      {a.atendendoAgora && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-atendendo-ink bg-atendendo/15 px-1.5 py-0.5 rounded-sm">
                          <UserCheck className="w-2.5 h-2.5" />
                          Agora
                        </span>
                      )}
                      {a.cargaVsMedia === "sobrecarregado" && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-sm">
                          <TrendingUp className="w-2.5 h-2.5" />
                          Sobrecarregado
                        </span>
                      )}
                      {a.cargaVsMedia === "ocioso" && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-aguardando-ink bg-aguardando/15 px-1.5 py-0.5 rounded-sm">
                          <TrendingDown className="w-2.5 h-2.5" />
                          Ocioso
                        </span>
                      )}
                    </div>
                    <div className="tnum text-xs text-muted-foreground mt-0.5">
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
                  <div className="flex items-center justify-between gap-2 text-sm mb-1">
                    <span className="font-medium text-foreground truncate" title={SETORES_LABEL[s.setor] || s.setor}>
                      {SETORES_LABEL[s.setor] || s.setor}
                    </span>
                    <span className="tnum text-muted-foreground text-right shrink-0">
                      {s.total} {s.total === 1 ? "sessão" : "sessões"}
                      {s.aguardando > 0 && (
                        <span className="text-aguardando-ink font-medium"> · {s.aguardando} aguardando</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 rounded-sm bg-surface-muted overflow-hidden">
                    <div
                      className="h-full rounded-sm bg-atendendo"
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
              <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
                <StatCard
                  compacto
                  icon={<AlertTriangle className="w-4 h-4" />}
                  label="Críticos"
                  value={ultimoSnapshot.criticos}
                  tom="negativo"
                />
                <StatCard
                  compacto
                  icon={<Clock className="w-4 h-4" />}
                  label="Precisa repor"
                  value={ultimoSnapshot.precisaRepor}
                  tom="atencao"
                />
                <StatCard
                  compacto
                  icon={<Users className="w-4 h-4" />}
                  label="Ok"
                  value={ultimoSnapshot.estoqueOk}
                  tom="positivo"
                />
              </div>

              {historicoEstoque.length > 1 ? (
                <>
                  {/* Barras empilhadas em tokens de status: crítico =
                      destructive, a repor = aguardando, ok = atendendo. */}
                  <div className="flex items-end gap-px md:gap-1 h-20 md:h-24">
                    {historicoEstoque.map((dia) => {
                      const total = dia.total || 1;
                      return (
                        <div
                          key={dia.data}
                          className="flex-1 h-full flex flex-col justify-end gap-px rounded-sm overflow-hidden"
                          title={`${dia.data}: ${dia.criticos} crítico(s), ${dia.precisaRepor} a repor, ${dia.estoqueOk} ok`}
                        >
                          <div
                            className="bg-destructive"
                            style={{ height: `${(dia.criticos / total) * 100}%` }}
                          />
                          <div
                            className="bg-aguardando"
                            style={{ height: `${(dia.precisaRepor / total) * 100}%` }}
                          />
                          <div
                            className="bg-atendendo"
                            style={{ height: `${(dia.estoqueOk / total) * 100}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="tnum flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <span>{formatarDataCurta(primeiroSnapshot.data)}</span>
                    <span>{formatarDataCurta(ultimoSnapshot.data)}</span>
                  </div>
                  <ComparativoReposicao
                    primeiro={primeiroSnapshot}
                    ultimo={ultimoSnapshot}
                  />
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
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
  tom,
  compacto
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  tom: TomDestaque;
  compacto?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-surface border border-border shadow-card rounded-lg",
        compacto ? "p-3" : "p-3 md:p-4"
      )}
    >
      <div className={cn("flex items-center gap-1.5 mb-1.5", TOM_ICONE[tom])}>
        <span className="shrink-0">{icon}</span>
        <span
          className={cn(
            "text-xs font-medium",
            // No compacto o rótulo quebra em duas linhas em vez de cortar,
            // porque em 360px três cartões lado a lado ficam estreitos.
            compacto ? "leading-tight" : "truncate"
          )}
          title={label}
        >
          {label}
        </span>
      </div>
      {/* tnum para o número não "dançar" no refetch de 60s */}
      <div className="tnum text-xl md:text-2xl font-bold text-foreground">
        {value === undefined || value === null ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
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
    <div className="bg-surface border border-border shadow-card rounded-xl p-4 md:p-5">
      <h2 className="text-[15px] font-semibold text-foreground">{titulo}</h2>
      {subtitulo && <p className="text-xs text-muted-foreground mb-3">{subtitulo}</p>}
      <div className={subtitulo ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

function EstadoVazio({ texto }: { texto: string }) {
  return <p className="text-sm text-muted-foreground text-center py-4">{texto}</p>;
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
      <div className="tnum flex items-center gap-1.5 text-xs text-muted-foreground mt-3">
        <Minus className="w-3.5 h-3.5 shrink-0" />
        Sem mudança no período: {problemasAgora} produto(s) crítico(s) ou a repor.
      </div>
    );
  }

  const melhorou = diferenca < 0;
  return (
    <div
      className={cn(
        "tnum flex items-center gap-1.5 text-xs mt-3 font-medium",
        melhorou ? "text-atendendo-ink" : "text-destructive"
      )}
    >
      {melhorou ? (
        <TrendingDown className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
      )}
      {melhorou
        ? `Melhorando: ${Math.abs(diferenca)} produto(s) a menos em crítico/precisa repor desde o início do período.`
        : `Piorando: ${diferenca} produto(s) a mais em crítico/precisa repor desde o início do período.`}
    </div>
  );
}

function formatarDataCurta(data: string): string {
  try {
    const [, mes, dia] = data.split("-");
    return `${dia}/${mes}`;
  } catch {
    return data;
  }
}
