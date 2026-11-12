import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ClipboardList,
  Download,
  Keyboard,
  Loader2,
  Lock,
  Minus,
  Box,
  UploadCloud,
  ImageOff,
  Package,
  Plus,
  ScanLine,
  Tag,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { contagemService, type OperadorIdentificado } from "../../services/contagem.service";
import {
  DEPOSITOS,
  type ItemApurado,
  type ItemNaTela,
  type LinhaHistorico,
  type ProdutoResumo,
  type RespostaDivergencias,
  type RespostaDrive,
  type Sessao,
} from "../../types/contagem.types";

/* ════════════════════════════════════════════════════════════════════════
   CONFERÊNCIA DE ESTOQUE — uma página só

   Esta tela substitui o coletor (contagem.html, porta 8130). Três decisões
   que vale explicar, porque qualquer uma delas "arrumada" por engano
   estraga a conferência:

   1. O CAMPO DE BIPE FICA EMBAIXO, não em cima.
      No coletor antigo ele era o primeiro elemento. No celular, o teclado
      sobe e cobre exatamente a parte de baixo da tela — que é onde o
      resultado aparecia. A pessoa bipava e não via a diferença. Embaixo, o
      campo encosta no teclado e o resultado fica no espaço que sobra.

   2. O NÚMERO DOMINANTE É A DIFERENÇA, não a quantidade contada.
      Conferência existe para achar diferença. Contado e sistema são
      coadjuvantes e ficam pequenos, abaixo.

   3. SOM E VIBRAÇÃO SÃO O FEEDBACK PRINCIPAL.
      Quem confere está de cabeça baixa, na prateleira, com o celular na
      mão e o leitor na outra. Ler a tela a cada bipe é o que torna a
      conferência lenta. Três sons distintos resolvem sem olhar:
        confere  → bipe curto agudo
        diferença→ dois bipes médios
        sem cadastro → um bipe longo grave
   ══════════════════════════════════════════════════════════════════════ */

type Vista = "conferir" | "divergencias";

/* ───────────────────────────── som e vibração ───────────────────────── */

type Aviso = "ok" | "diferenca" | "erro";

function useFeedback() {
  const [ligado, setLigado] = useState(() => localStorage.getItem("contagem.som") !== "off");
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem("contagem.som", ligado ? "on" : "off");
  }, [ligado]);

  const tocar = useCallback(
    (aviso: Aviso) => {
      if (navigator.vibrate) {
        navigator.vibrate(aviso === "ok" ? 25 : aviso === "diferenca" ? [35, 60, 35] : 180);
      }
      if (!ligado) return;
      try {
        // O AudioContext só pode nascer depois de um gesto do usuário; o
        // primeiro bipe é esse gesto, então criar aqui (e não no mount)
        // é o que evita o "suspended" silencioso do Safari.
        if (!ctxRef.current) {
          const Motor = window.AudioContext || (window as any).webkitAudioContext;
          ctxRef.current = new Motor();
        }
        const ctx = ctxRef.current;
        if (ctx.state === "suspended") void ctx.resume();

        const notas: Record<Aviso, Array<[number, number, number]>> = {
          ok: [[1320, 0, 0.07]],
          diferenca: [
            [760, 0, 0.09],
            [760, 0.14, 0.09],
          ],
          erro: [[200, 0, 0.42]],
        };
        for (const [hz, atraso, dur] of notas[aviso]) {
          const osc = ctx.createOscillator();
          const gan = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = hz;
          gan.gain.setValueAtTime(0.0001, ctx.currentTime + atraso);
          gan.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + atraso + 0.01);
          gan.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + atraso + dur);
          osc.connect(gan).connect(ctx.destination);
          osc.start(ctx.currentTime + atraso);
          osc.stop(ctx.currentTime + atraso + dur + 0.02);
        }
      } catch {
        /* som é conforto, não requisito — vibração já avisou */
      }
    },
    [ligado]
  );

  return { tocar, ligado, alternar: () => setLigado((v) => !v) };
}

/** Mantém a tela acesa enquanto a conferência está aberta. */
function useTelaAcesa(ativo: boolean) {
  useEffect(() => {
    if (!ativo || !("wakeLock" in navigator)) return;
    let trava: any = null;
    let vivo = true;

    const pedir = async () => {
      try {
        trava = await (navigator as any).wakeLock.request("screen");
      } catch {
        /* negado ou sem suporte: a tela apaga, e isso é só incômodo */
      }
    };
    void pedir();

    // Voltar de segundo plano libera a trava: é preciso pedir de novo.
    const aoVoltar = () => {
      if (vivo && document.visibilityState === "visible" && !trava) void pedir();
    };
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", aoVoltar);
      void trava?.release?.();
    };
  }, [ativo]);
}

/* ───────────────────────────── peças visuais ────────────────────────── */

function corDaDiferenca(d: number) {
  if (d === 0) return { texto: "text-folha-ink", fundo: "bg-folha/15", borda: "border-folha/40" };
  if (d < 0) return { texto: "text-chama-ink", fundo: "bg-chama/12", borda: "border-chama/40" };
  return { texto: "text-brincadeira-ink", fundo: "bg-brincadeira/12", borda: "border-brincadeira/40" };
}

function Folha({
  aberta,
  titulo,
  onFechar,
  children,
}: {
  aberta: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberta, onFechar]);

  if (!aberta) return null;
  return (
    <>
      {/* ────────────────────────────────────────────────────────────
          UM CONTÊINER SÓ, CENTRALIZADO POR FLEX — sem transform.

          A versão anterior centralizava no desktop com
          `top-1/2 -translate-y-1/2`, e o pop-up aparecia cortado embaixo.
          A culpa era do `animate-fade-in`: a animação termina em
          `transform: translateY(0)` e, com o fill-mode do
          tailwindcss-animate, esse valor final SOBREPÕE o
          `-translate-y-1/2`. Resultado: o topo da folha ficava na metade
          da tela e o resto caía para fora — o botão de fechar a
          conferência não aparecia.

          Centralizar por flex não usa transform nenhum, então a animação
          não tem como quebrar o posicionamento. E `max-h` agora conta a
          altura REAL visível (dvh), que no celular exclui a barra de
          endereço.
          ──────────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
        onClick={onFechar}
      >
        <div className="absolute inset-0 bg-noite/45 backdrop-blur-sm" aria-hidden />

        <div
          role="dialog"
          aria-modal="true"
          aria-label={titulo}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "glass-solid relative flex max-h-[88dvh] w-full flex-col",
            "rounded-b-none rounded-t-2xl sm:max-w-lg sm:rounded-2xl",
            "animate-fade-in"
          )}
        >
          <div className="flex h-header shrink-0 items-center justify-between gap-2 border-b border-border/70 px-4">
            <h2 className="truncate text-[15px] font-bold text-foreground">{titulo}</h2>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="foco-anel grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-surface-muted"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
          {/* min-h-0 é o que faz o overflow funcionar dentro de um flex:
              sem ele o filho cresce e empurra o pai para fora da tela. */}
          <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto px-4 py-3 area-segura-baixo">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

function Pilula({ children, tom = "neutro" }: { children: ReactNode; tom?: "neutro" | "aviso" | "ok" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
        tom === "neutro" && "bg-surface-muted text-muted-foreground",
        tom === "aviso" && "bg-chama/15 text-chama-ink",
        tom === "ok" && "bg-folha/20 text-folha-ink"
      )}
    >
      {children}
    </span>
  );
}

function LinhaApurada({ item }: { item: ItemApurado }) {
  const cor = corDaDiferenca(item.diferenca);
  return (
    <div className="flex items-center gap-3 border-b border-border/50 py-2 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-foreground">
          {item.descricao || item.codigo}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {item.codigo} · contado {item.contado} · sistema {item.saldo}
          {item.fonte_saldo === "espelho" && " · espelho"}
        </div>
      </div>
      <div className={cn("shrink-0 tabular-nums text-[17px] font-bold", cor.texto)}>
        {item.diferenca > 0 ? `+${item.diferenca}` : item.diferenca}
      </div>
    </div>
  );
}

/* ═════════════════════════════════ página ════════════════════════════ */

export default function Contagem() {
  const [vista, setVista] = useState<Vista>("conferir");
  const [operador, setOperador] = useState<OperadorIdentificado | null>(null);
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [item, setItem] = useState<ItemNaTela | null>(null);
  const [apurados, setApurados] = useState<ItemApurado[]>([]);
  /* O histórico é a resposta de "eu já contei isso?" sem sair da tela.
     Vive no navegador: o servidor guarda as leituras cruas, mas elas não
     trazem saldo nem diferença, que é justamente o que serve para
     comparar. Na retomada ele é remontado a partir da sessão. */
  const [historico, setHistorico] = useState<LinhaHistorico[]>([]);
  const [fotoGrande, setFotoGrande] = useState<string | null>(null);
  const [folhaCubagem, setFolhaCubagem] = useState(false);
  const [folhaMarca, setFolhaMarca] = useState(false);
  const [marcasConhecidas, setMarcasConhecidas] = useState<string[]>([]);
  const [envioDrive, setEnvioDrive] = useState<RespostaDrive | null>(null);
  const [motivos, setMotivos] = useState<string[]>([]);
  const [recado, setRecado] = useState<{ texto: string; tom: "ok" | "erro" | "aviso" } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const [folhaSessao, setFolhaSessao] = useState(false);
  const [folhaDivergencia, setFolhaDivergencia] = useState(false);
  const [ultimoCodigoNaoAchado, setUltimoCodigoNaoAchado] = useState("");

  const { tocar, ligado: somLigado, alternar: alternarSom } = useFeedback();
  useTelaAcesa(!!sessao && sessao.status === "aberta");

  const campoRef = useRef<HTMLInputElement>(null);
  const [digitacaoManual, setDigitacaoManual] = useState(false);
  const [codigo, setCodigo] = useState("");

  const totalLeituras = sessao?.leituras?.length ?? 0;

  /* ── identificação ──────────────────────────────────────────────── */
  const [senha, setSenha] = useState("");
  const [deposito, setDeposito] = useState<string>(DEPOSITOS[0]);
  const [secao, setSecao] = useState("");

  useEffect(() => {
    void contagemService.motivos().then(setMotivos);
    void contagemService.marcasConhecidas().then(setMarcasConhecidas);
  }, []);

  const avisar = useCallback((texto: string, tom: "ok" | "erro" | "aviso" = "ok") => {
    setRecado({ texto, tom });
    window.setTimeout(() => setRecado((r) => (r?.texto === texto ? null : r)), 4000);
  }, []);

  const recarregarApuracao = useCallback(async (sessaoId: string) => {
    const r = await contagemService.detalhe(sessaoId);
    if (r.sucesso && r.sessao) {
      setSessao(r.sessao);
      setApurados(r.itens ?? []);
    }
  }, []);

  /**
   * Remonta o histórico de uma sessão retomada.
   *
   * O acumulado tem que ser recalculado leitura a leitura, na ordem:
   * mostrar o total final em todas as linhas faria a terceira leitura de
   * um produto parecer que já era 3 na primeira — e é exatamente aí que
   * alguém reconta achando que errou.
   */
  const remontarHistorico = useCallback((s: Sessao) => {
    const acumulado: Record<string, number> = {};
    const linhas: LinhaHistorico[] = s.leituras.map((l) => {
      acumulado[l.produto] = (acumulado[l.produto] ?? 0) + l.qtd;
      const saldo = s.saldos?.[l.produto]?.saldo ?? 0;
      return {
        hora: (l.data_hora || "").slice(11, 16),
        codigo: l.produto,
        descricao: l.descricao || "",
        qtd: l.qtd,
        contado: acumulado[l.produto],
        saldo,
        diferenca: acumulado[l.produto] - saldo,
      };
    });
    setHistorico(linhas.reverse());
  }, []);

  const entrar = async () => {
    if (senha.length < 3) return avisar("Digite a senha", "erro");
    setOcupado(true);
    try {
      const ident = await contagemService.identificar(senha);
      if (!ident.ok || !ident.operador) {
        tocar("erro");
        return avisar(ident.erro || "Senha não reconhecida", "erro");
      }
      setSenha("");
      setOperador(ident.operador);

      // Se a pessoa já tinha conferência aberta, ela continua de onde
      // parou. Começar outra significa contar o mesmo setor duas vezes
      // pela metade — e inventar divergência nas duas.
      const aberta = await contagemService.sessaoAberta(ident.operador.id);
      if (aberta) {
        setSessao(aberta);
        setDeposito(aberta.deposito);
        setSecao(aberta.secao || "");
        remontarHistorico(aberta);
        await recarregarApuracao(aberta.id);
        avisar(`Continuando a conferência de ${aberta.deposito}`, "aviso");
      } else {
        avisar(`Olá, ${ident.operador.nome.split(" ")[0]}`);
      }
    } finally {
      setOcupado(false);
    }
  };

  const iniciar = async () => {
    if (!operador) return;
    setOcupado(true);
    try {
      const r = await contagemService.iniciar({
        operador_id: operador.id,
        operador_nome: operador.nome,
        deposito,
        secao,
      });
      if (!r?.sucesso) return avisar("Não deu para abrir a conferência", "erro");
      setSessao(r.sessao);
      setApurados([]);
      setHistorico([]);
      setItem(null);
      window.setTimeout(() => campoRef.current?.focus(), 60);
    } finally {
      setOcupado(false);
    }
  };

  /* ── o bipe ─────────────────────────────────────────────────────── */
  const bipar = async (valor: string) => {
    const cod = valor.trim();
    if (!cod || !sessao) return;
    setCodigo("");
    setOcupado(true);
    try {
      const r = await contagemService.bipar(sessao.id, cod, 1, secao);
      if (!r.sucesso) {
        tocar("erro");
        if (r.erro === "produto_nao_encontrado") {
          setUltimoCodigoNaoAchado(cod);
          setFolhaDivergencia(true);
          avisar(`${cod} não está no cadastro`, "erro");
        } else if (r.erro === "sessao_fechada") {
          avisar("Esta conferência já foi fechada", "erro");
          setSessao(null);
        } else {
          avisar(r.erro || "Falhou o bipe", "erro");
        }
        return;
      }
      const dif = r.diferenca ?? 0;
      tocar(dif === 0 ? "ok" : "diferenca");
      setItem({
        produto: r.produto!,
        contado: r.contado ?? 0,
        saldo: r.saldo ?? 0,
        diferenca: dif,
        fonte: r.fonte_saldo ?? "desconhecida",
        online: r.online ?? false,
        aviso: r.aviso,
      });
      if (r.auto_cadastrado) {
        avisar("Produto novo: não estava na base e foi trazido do Olist agora", "aviso");
      }
      // Contador do topo sem uma ida ao servidor só para isso.
      setSessao((s) =>
        s
          ? {
              ...s,
              leituras: [
                ...s.leituras,
                {
                  data_hora: "agora",
                  codigo_lido: cod,
                  produto: r.produto!.codigo,
                  descricao: r.produto!.descricao,
                  qtd: 1,
                  secao,
                },
              ],
            }
          : s
      );
      setHistorico((h) =>
        [
          {
            hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            codigo: r.produto!.codigo,
            descricao: r.produto!.descricao,
            qtd: 1,
            contado: r.contado ?? 0,
            saldo: r.saldo ?? 0,
            diferenca: dif,
          },
          ...h,
        ].slice(0, 50)
      );
      if (r.aviso) avisar(r.aviso, "aviso");
    } catch {
      tocar("erro");
      avisar("Sem resposta do servidor. O bipe NÃO foi registrado.", "erro");
    } finally {
      setOcupado(false);
      campoRef.current?.focus();
    }
  };

  const ajustar = async (delta: number) => {
    if (!sessao || !item) return;
    tocar("ok");
    const r = await contagemService.ajustar(sessao.id, item.produto.codigo, delta);
    if (r.sucesso) {
      setItem({ ...item, contado: r.contado ?? 0, saldo: r.saldo ?? 0, diferenca: r.diferenca ?? 0 });
      setHistorico((h) =>
        [
          {
            hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            codigo: item.produto.codigo,
            descricao: item.produto.descricao,
            qtd: delta,
            contado: r.contado ?? 0,
            saldo: r.saldo ?? 0,
            diferenca: r.diferenca ?? 0,
          },
          ...h,
        ].slice(0, 50)
      );
    }
    campoRef.current?.focus();
  };

  const abrirResumo = async () => {
    if (sessao) await recarregarApuracao(sessao.id);
    setFolhaSessao(true);
  };

  const finalizar = async () => {
    if (!sessao) return;
    const comDif = apurados.filter((i) => i.diferenca !== 0).length;
    if (
      !window.confirm(
        `Fechar a conferência de ${sessao.deposito}?\n\n` +
          `${apurados.length} produtos, ${comDif} com diferença.\n` +
          `Os divergentes serão reconsultados no Olist agora.`
      )
    )
      return;
    setOcupado(true);
    try {
      const r = await contagemService.finalizar(sessao.id);
      if (!r.sucesso) return avisar(r.erro || "Não deu para fechar", "erro");
      setApurados(r.itens ?? []);
      avisar(
        `Fechada: ${r.resumo?.com_diferenca ?? 0} de ${r.resumo?.produtos ?? 0} com diferença. Enviando ao Drive…`,
        "ok"
      );

      // Envio automático: no coletor antigo era o Finalizar que mandava.
      // Botão separado significa planilha que nunca chega — ninguém
      // lembra de apertar mais um depois de fechar a contagem.
      const envio = await contagemService.enviarDrive(sessao.id, false);
      setEnvioDrive(envio);
      avisar(
        envio.sucesso
          ? "Conferência fechada e planilhas enviadas ao Drive"
          : `Conferência fechada, mas o Drive recusou: ${envio.detalhe || envio.erro || "motivo desconhecido"}`,
        envio.sucesso ? "ok" : "erro"
      );

      setItem(null);
      // Com falha no envio a folha FICA ABERTA, mostrando a resposta crua
      // do Apps Script e o botão de tentar de novo. Fechar aqui esconderia
      // o único lugar onde dá para descobrir o motivo.
      if (envio.sucesso) {
        setSessao(null);
        setFolhaSessao(false);
        setVista("divergencias");
      }
    } finally {
      setOcupado(false);
    }
  };

  const registrarCubagem = async (p: {
    peso_bruto?: number | null;
    comprimento?: number | null;
    altura?: number | null;
    largura?: number | null;
    observacao: string;
  }) => {
    if (!sessao || !item) return;
    const r = await contagemService.registrarCubagem(sessao.id, {
      codigo_produto: item.produto.codigo,
      ...p,
    });
    if (r.sucesso) {
      tocar("ok");
      avisar("Cubagem anotada — sai no CSV, não altera o Olist");
      setFolhaCubagem(false);
      campoRef.current?.focus();
    } else {
      avisar(r.erro || "Não deu para anotar", "erro");
    }
  };

  const registrarMarca = async (marca: string) => {
    if (!sessao || !item) return;
    const r = await contagemService.registrarMarca(sessao.id, {
      codigo_produto: item.produto.codigo,
      marca,
      marca_anterior: item.produto.marca || "",
    });
    if (r.sucesso) {
      tocar("ok");
      avisar("Marca anotada — sai no CSV, não altera o Olist");
      if (!marcasConhecidas.includes(marca)) setMarcasConhecidas((m) => [marca, ...m]);
      setFolhaMarca(false);
      campoRef.current?.focus();
    } else {
      avisar(r.erro || "Não deu para anotar", "erro");
    }
  };

  const enviarAoDrive = async (parcial: boolean) => {
    if (!sessao) return;
    setOcupado(true);
    setEnvioDrive(null);
    try {
      avisar("Enviando ao Drive…", "aviso");
      const r = await contagemService.enviarDrive(sessao.id, parcial);
      setEnvioDrive(r);
      avisar(
        r.sucesso ? "Planilhas enviadas ao Drive" : (r.detalhe || r.erro || "O Drive recusou"),
        r.sucesso ? "ok" : "erro"
      );
    } finally {
      setOcupado(false);
    }
  };

  const registrarDivergencia = async (motivo: string, observacao: string) => {
    if (!sessao) return;
    const r = await contagemService.registrarDivergencia(sessao.id, {
      codigo_produto: item?.produto.codigo || "",
      codigo_lido: ultimoCodigoNaoAchado,
      motivo,
      observacao,
      qtd_contada: item?.contado ?? null,
    });
    if (r.sucesso) {
      avisar("Divergência registrada");
      setFolhaDivergencia(false);
      setUltimoCodigoNaoAchado("");
      campoRef.current?.focus();
    } else {
      avisar("Não deu para registrar", "erro");
    }
  };

  /* ═══════════════════════════ render ══════════════════════════════ */

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ─────────── barra fixa do topo: uma linha, toque expande ────── */}
      <header className="glass-solid shrink-0 rounded-none border-x-0 border-t-0 md:min-h-header">
        <div className="mx-auto flex min-h-[48px] w-full max-w-3xl items-center gap-2 px-3 md:min-h-header">
        {vista === "divergencias" && sessao ? (
          <button
            type="button"
            onClick={() => setVista("conferir")}
            className="foco-anel grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-surface-muted"
            aria-label="Voltar para a conferência"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={sessao ? abrirResumo : undefined}
          disabled={!sessao}
          className={cn(
            "foco-anel min-w-0 flex-1 rounded-md px-2 py-1 text-left",
            sessao && "hover:bg-surface-muted"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13.5px] font-bold text-foreground">
              {sessao ? `${sessao.operador.split(" ")[0]} · ${sessao.deposito}` : "Conferência de estoque"}
            </span>
            {sessao && <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {sessao
              ? `${sessao.secao ? `Seção ${sessao.secao} · ` : ""}${totalLeituras} ${
                  totalLeituras === 1 ? "leitura" : "leituras"
                }`
              : operador
              ? operador.nome
              : "Entre com a sua senha para começar"}
          </div>
        </button>

        <button
          type="button"
          onClick={alternarSom}
          aria-label={somLigado ? "Desligar som" : "Ligar som"}
          className="foco-anel grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-surface-muted"
        >
          {somLigado ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
        </button>
        <button
          type="button"
          onClick={() => setVista((v) => (v === "conferir" ? "divergencias" : "conferir"))}
          aria-label="Divergências"
          className={cn(
            "foco-anel grid h-9 w-9 shrink-0 place-items-center rounded-md transition-colors",
            vista === "divergencias"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-surface-muted"
          )}
        >
          <ClipboardList className="h-[18px] w-[18px]" />
        </button>
        </div>
      </header>

      {/* ─────────── recado ─────────── */}
      {recado && (
        <div
          role="status"
          className={cn(
            "shrink-0 px-3 py-1.5 text-center text-[12px] font-semibold",
            recado.tom === "ok" && "bg-folha/20 text-folha-ink",
            recado.tom === "aviso" && "bg-abraco/50 text-chama-ink",
            recado.tom === "erro" && "bg-chama/15 text-chama-ink"
          )}
        >
          {recado.texto}
        </div>
      )}

      {/* ─────────── única zona que rola ─────────── */}
      <main className="scrollbar-custom min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl">
        {vista === "divergencias" ? (
          <PainelDivergencias />
        ) : !operador ? (
          <PortaoSenha
            senha={senha}
            setSenha={setSenha}
            onEntrar={entrar}
            ocupado={ocupado}
          />
        ) : !sessao ? (
          <AberturaSessao
            nome={operador.nome}
            deposito={deposito}
            setDeposito={setDeposito}
            secao={secao}
            setSecao={setSecao}
            onIniciar={iniciar}
            ocupado={ocupado}
            onTrocar={() => setOperador(null)}
          />
        ) : (
          <Apontador
            item={item}
            historico={historico}
            onPedirDivergencia={() => setFolhaDivergencia(true)}
            onVerFoto={setFotoGrande}
            onPedirCubagem={() => setFolhaCubagem(true)}
            onPedirMarca={() => setFolhaMarca(true)}
          />
        )}
        </div>
      </main>

      {/* ─────────── barra fixa de baixo: botões + campo de bipe ────── */}
      {sessao && vista === "conferir" && (
        <footer className="glass-solid shrink-0 rounded-none border-x-0 border-b-0 area-segura-baixo">
          <div className="mx-auto w-full max-w-3xl px-3 pt-2">
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => ajustar(-1)}
              disabled={!item || ocupado}
              className="foco-anel flex h-toque flex-1 items-center justify-center rounded-md bg-surface-muted text-foreground transition-colors enabled:active:bg-border disabled:opacity-40"
              aria-label="Menos um"
            >
              <Minus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => ajustar(1)}
              disabled={!item || ocupado}
              className="foco-anel flex h-toque flex-1 items-center justify-center rounded-md bg-surface-muted text-foreground transition-colors enabled:active:bg-border disabled:opacity-40"
              aria-label="Mais um"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setFolhaDivergencia(true)}
              className="foco-anel grid h-toque w-toque place-items-center rounded-md bg-chama/12 text-chama-ink transition-colors active:bg-chama/25"
              aria-label="Registrar divergência"
            >
              <AlertTriangle className="h-5 w-5" />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void bipar(codigo);
            }}
            className="flex items-center gap-2 pb-2"
          >
            <div className="relative min-w-0 flex-1">
              <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
              <input
                ref={campoRef}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                /* inputMode="none" impede o teclado de subir quando o
                   leitor de código de barras é o que digita. O botão ao
                   lado liga o teclado para digitar o código na mão. */
                inputMode={digitacaoManual ? "numeric" : "none"}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                placeholder="Bipe aqui"
                aria-label="Código bipado"
                className="foco-anel h-barra w-full rounded-md border border-input bg-background pl-10 pr-3 text-[17px] font-semibold tabular-nums text-foreground placeholder:font-normal placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setDigitacaoManual((v) => !v);
                window.setTimeout(() => campoRef.current?.focus(), 30);
              }}
              aria-label={digitacaoManual ? "Voltar ao leitor" : "Digitar na mão"}
              className={cn(
                "foco-anel grid h-barra w-toque shrink-0 place-items-center rounded-md transition-colors",
                digitacaoManual
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-muted text-muted-foreground"
              )}
            >
              <Keyboard className="h-5 w-5" />
            </button>
          </form>
          </div>
        </footer>
      )}

      {/* ─────────── folhas ─────────── */}
      <Folha aberta={folhaSessao} titulo="Esta conferência" onFechar={() => setFolhaSessao(false)}>
        {sessao && (
          <ResumoDaSessao
            sessao={sessao}
            apurados={apurados}
            secao={secao}
            setSecao={setSecao}
            onFinalizar={finalizar}
            onEnviarDrive={enviarAoDrive}
            envioDrive={envioDrive}
            ocupado={ocupado}
          />
        )}
      </Folha>

      <Folha
        aberta={folhaCubagem}
        titulo="Cubagem medida"
        onFechar={() => setFolhaCubagem(false)}
      >
        {item && <FormularioCubagem produto={item.produto} onEnviar={registrarCubagem} />}
      </Folha>

      <Folha aberta={folhaMarca} titulo="Marca correta" onFechar={() => setFolhaMarca(false)}>
        {item && (
          <FormularioMarca
            produto={item.produto}
            conhecidas={marcasConhecidas}
            onEnviar={registrarMarca}
          />
        )}
      </Folha>

      <Folha aberta={!!fotoGrande} titulo="Foto do produto" onFechar={() => setFotoGrande(null)}>
        {fotoGrande && (
          <img src={fotoGrande} alt="" className="mx-auto max-h-[60vh] w-auto rounded-md" />
        )}
      </Folha>

      <Folha
        aberta={folhaDivergencia}
        titulo={ultimoCodigoNaoAchado ? `Código ${ultimoCodigoNaoAchado}` : "Registrar divergência"}
        onFechar={() => {
          setFolhaDivergencia(false);
          setUltimoCodigoNaoAchado("");
        }}
      >
        <FormularioDivergencia
          motivos={motivos}
          sugestao={ultimoCodigoNaoAchado ? "Produto sem cadastro" : undefined}
          descricaoItem={item?.produto.descricao}
          onEnviar={registrarDivergencia}
        />
      </Folha>
    </div>
  );
}

/* ══════════════════════════ pedaços da página ════════════════════════ */

function PortaoSenha({
  senha,
  setSenha,
  onEntrar,
  ocupado,
}: {
  senha: string;
  setSenha: (v: string) => void;
  onEntrar: () => void;
  ocupado: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onEntrar();
      }}
      className="mx-auto flex max-w-sm flex-col items-center gap-4 px-5 py-10"
    >
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Lock className="h-6 w-6" />
      </div>
      <div className="text-center">
        <h1 className="text-[18px] font-bold text-foreground">Quem está conferindo?</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          A mesma senha que você usa para abrir as conversas. O nome entra sozinho no relatório.
        </p>
      </div>
      <input
        value={senha}
        onChange={(e) => setSenha(e.target.value.replace(/\D/g, "").slice(0, 8))}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        placeholder="••••"
        aria-label="Senha"
        autoFocus
        className="foco-anel h-16 w-40 rounded-lg border border-input bg-background text-center text-[28px] font-bold tracking-[0.35em] text-foreground"
      />
      <button
        type="submit"
        disabled={ocupado || senha.length < 3}
        className="foco-anel flex h-toque w-full items-center justify-center gap-2 rounded-md bg-primary text-[14px] font-bold text-primary-foreground disabled:opacity-40"
      >
        {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
        Entrar
      </button>
    </form>
  );
}

function AberturaSessao({
  nome,
  deposito,
  setDeposito,
  secao,
  setSecao,
  onIniciar,
  ocupado,
  onTrocar,
}: {
  nome: string;
  deposito: string;
  setDeposito: (v: string) => void;
  secao: string;
  setSecao: (v: string) => void;
  onIniciar: () => void;
  ocupado: boolean;
  onTrocar: () => void;
}) {
  return (
    <div className="mx-auto max-w-sm px-5 py-8">
      <h1 className="text-[18px] font-bold text-foreground">
        {nome.split(" ")[0]}, onde você vai contar?
      </h1>
      <p className="mt-1 text-[12.5px] text-muted-foreground">
        O saldo do sistema vem do depósito escolhido. Depósito errado faz toda leitura virar
        divergência falsa.
      </p>

      <div className="mt-5 space-y-1.5">
        {DEPOSITOS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDeposito(d)}
            className={cn(
              "foco-anel flex h-toque w-full items-center gap-3 rounded-md px-3 text-[14px] transition-colors",
              deposito === d
                ? "bg-primary font-bold text-primary-foreground"
                : "bg-surface-muted font-medium text-foreground hover:bg-border/60"
            )}
          >
            <Package className="h-[18px] w-[18px] shrink-0" />
            {d}
          </button>
        ))}
      </div>

      <label className="mt-5 block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Seção (opcional)
        </span>
        <input
          value={secao}
          onChange={(e) => setSecao(e.target.value)}
          placeholder="A3, gôndola 2, mezanino…"
          className="foco-anel mt-1 h-toque w-full rounded-md border border-input bg-background px-3 text-[14px] text-foreground"
        />
        <span className="mt-1 block text-[11px] text-muted-foreground">
          Serve para achar a prateleira depois, quando o relatório apontar a diferença.
        </span>
      </label>

      <button
        type="button"
        onClick={onIniciar}
        disabled={ocupado}
        className="foco-anel mt-5 flex h-toque w-full items-center justify-center gap-2 rounded-md bg-primary text-[14px] font-bold text-primary-foreground disabled:opacity-40"
      >
        {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
        Começar a conferir
      </button>
      <button
        type="button"
        onClick={onTrocar}
        className="foco-anel mt-2 h-toque w-full rounded-md text-[13px] font-medium text-muted-foreground hover:bg-surface-muted"
      >
        Não sou {nome.split(" ")[0]}
      </button>
    </div>
  );
}

function Apontador({
  item,
  historico,
  onPedirDivergencia,
  onVerFoto,
  onPedirCubagem,
  onPedirMarca,
}: {
  item: ItemNaTela | null;
  historico: LinhaHistorico[];
  onPedirDivergencia: () => void;
  onVerFoto: (url: string) => void;
  onPedirCubagem: () => void;
  onPedirMarca: () => void;
}) {
  if (!item) {
    return (
      <div className="px-4 py-6">
        <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
          <ScanLine className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-[14px] font-semibold text-foreground">Bipe o primeiro produto</p>
          <p className="max-w-[260px] text-[12px] text-muted-foreground">
            O saldo do sistema é consultado no Olist ao vivo no primeiro bipe de cada produto. Nos
            bipes seguintes do mesmo item, vale o saldo já consultado.
          </p>
        </div>
        <Historico linhas={historico} />
      </div>
    );
  }

  const cor = corDaDiferenca(item.diferenca);
  const { produto } = item;

  /* A marca do CADASTRO contra a marca escrita no NOME ("... | TILIBRA").
     Divergir significa que um dos dois está errado, e quem está com o
     produto na mão é a única pessoa capaz de dizer qual. */
  const normalizar = (t?: string | null) =>
    (t || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const marcaCadastro = normalizar(produto.marca);
  const marcaNome = normalizar(produto.marca_no_nome);
  const marcaComProblema =
    !marcaCadastro ||
    marcaCadastro === "nao definida" ||
    (!!marcaNome && marcaCadastro !== marcaNome);

  /* Depósitos que valem a pena mostrar: os três de contagem sempre, e
     qualquer outro SÓ se tiver saldo. Sem isso a lista enchia de
     "Produtos" e "aleatorio" zerados — cadastro antigo que ninguém usa —
     e empurrava a informação útil para fora do olho. Fiscal aparece se
     tiver saldo: ele não entra em contagem, mas saber que tem 2 lá é
     metade da resposta quando falta no Controle Geral. */
  const depositosRelevantes = Object.entries(produto.estoque || {}).filter(
    ([dep, qtd]) => (DEPOSITOS as readonly string[]).includes(dep) || qtd > 0
  );

  const d = produto.dimensoes || {};
  const semCubagem = !d.peso_bruto || !d.altura || !d.largura || !d.comprimento;
  const resumoCubagem = semCubagem
    ? ""
    : `${d.peso_bruto}kg · ${d.comprimento}×${d.altura}×${d.largura}`;

  return (
    <div className="px-4 py-4">
      {!item.online && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-chama/50 bg-chama/12 p-2.5">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-chama-ink" />
          <div className="text-[12px] leading-snug text-chama-ink">
            <strong>Sem conexão com o Olist.</strong> Saldo e dados do espelho local, podem
            estar desatualizados. A contagem continua sendo gravada.
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <Foto url={produto.foto} onAmpliar={onVerFoto} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            SKU {produto.sku}
            {produto.gtin ? ` · EAN ${produto.gtin}` : ""}
          </div>
          <h2 className="mt-0.5 text-[15px] font-bold leading-snug text-foreground">
            {produto.descricao}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {/* O selo de situação precisa gritar. Contar item INATIVO ou
                EXCLUÍDO é trabalho que não vai virar ajuste nenhum, e
                descobrir isso só no relatório é refazer a prateleira. */}
            {produto.situacao && produto.situacao !== "A" && (
              <Pilula tom="aviso">
                {produto.situacao === "E" ? "excluído no Olist" : "inativo no Olist"}
              </Pilula>
            )}
            {produto.localizacao && (
              <span className="truncate text-[12px] text-muted-foreground">
                {produto.localizacao}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={cn("mt-3 rounded-xl border p-5 text-center", cor.fundo, cor.borda)}>
        <div className={cn("text-[64px] font-black leading-none tabular-nums", cor.texto)}>
          {item.diferenca > 0 ? `+${item.diferenca}` : item.diferenca}
        </div>
        <div className="mt-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {item.diferenca === 0 ? "confere" : item.diferenca < 0 ? "faltando" : "sobrando"}
        </div>
        <div className="mt-3 flex items-center justify-center gap-5 text-[13px]">
          <span className="text-foreground">
            <strong className="tabular-nums text-[17px]">{item.contado}</strong> contado
          </span>
          <span className="h-4 w-px bg-border" aria-hidden />
          <span className="text-muted-foreground">
            <strong className="tabular-nums text-[17px] text-foreground">{item.saldo}</strong> sistema
          </span>
        </div>
        {typeof produto.preco === "number" && produto.preco > 0 && (
          <div className="mt-3 border-t border-border/50 pt-2.5 text-[13px]">
            <span className="text-muted-foreground">preço </span>
            <strong className="tabular-nums text-[18px] text-foreground">
              {produto.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </strong>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
        {produto.unidade && <Pilula>{produto.unidade}</Pilula>}
        {produto.categoria && <Pilula>{produto.categoria}</Pilula>}
        {item.online && <Pilula tom="ok">Olist ao vivo</Pilula>}
      </div>

      {/* Estoque nos outros depósitos: a resposta de "falta aqui, tem lá". */}
      {depositosRelevantes.length > 0 && (
        <div className="mt-4 rounded-lg border border-border/70 bg-surface-muted/50 p-3">
          <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
            Nos outros depósitos
          </div>
          <div className="grid grid-cols-2 gap-y-1 text-[12.5px]">
            {depositosRelevantes.map(([dep, qtd]) => (
              <div key={dep} className="flex items-baseline justify-between gap-2 pr-3">
                <span className="truncate text-muted-foreground">{dep}</span>
                <strong className="tabular-nums text-foreground">{qtd}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Marca e cubagem: dois toques, duas folhas. Não ficam abertas em
          cima da tela porque na maioria dos bipes não interessam — só
          chamam atenção quando têm problema. */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onPedirMarca}
          className={cn(
            "foco-anel flex min-h-toque flex-col items-start justify-center rounded-md px-3 py-1.5 text-left transition-colors",
            marcaComProblema
              ? "border border-chama/40 bg-chama/12"
              : "bg-surface-muted hover:bg-border/60"
          )}
        >
          <span className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
            <Tag className="h-3 w-3" /> marca
          </span>
          <span
            className={cn(
              "w-full truncate text-[13px] font-semibold",
              marcaComProblema ? "text-chama-ink" : "text-foreground"
            )}
          >
            {produto.marca || "não definida"}
          </span>
          {marcaComProblema && produto.marca_no_nome && (
            <span className="w-full truncate text-[10.5px] text-chama-ink/80">
              no nome: {produto.marca_no_nome}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onPedirCubagem}
          className={cn(
            "foco-anel flex min-h-toque flex-col items-start justify-center rounded-md px-3 py-1.5 text-left transition-colors",
            semCubagem && produto.foto
              ? "border border-chama/40 bg-chama/12"
              : semCubagem
              ? "border border-brincadeira/40 bg-brincadeira/12"
              : "bg-surface-muted hover:bg-border/60"
          )}
        >
          <span className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
            <Box className="h-3 w-3" /> cubagem
          </span>
          <span
            className={cn(
              "w-full truncate text-[13px] font-semibold",
              semCubagem ? "text-chama-ink" : "text-foreground"
            )}
          >
            {semCubagem ? "faltando" : resumoCubagem}
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={onPedirDivergencia}
        className="foco-anel mt-2 h-toque w-full rounded-md border border-chama/40 bg-chama/8 text-[13px] font-semibold text-chama-ink"
      >
        Registrar divergência neste item
      </button>

      <Historico linhas={historico} />
    </div>
  );
}

/**
 * Foto do produto.
 *
 * Vem do espelho local (campo `foto`), não do Olist ao vivo: no meio de
 * uma contagem não há cota sobrando para gastar uma chamada por item só
 * para ilustrar. Produto sem foto mostra o espaço vazio em vez de sumir —
 * o buraco é o aviso de que falta encher o cadastro.
 */
function Foto({ url, onAmpliar }: { url?: string | null; onAmpliar: (u: string) => void }) {
  const [quebrou, setQuebrou] = useState(false);

  if (!url || quebrou) {
    return (
      <div
        className="grid h-16 w-16 shrink-0 place-items-center rounded-md border border-dashed border-border bg-surface-muted"
        title={quebrou ? "A foto não carregou" : "Produto sem foto no cadastro"}
      >
        <ImageOff className="h-5 w-5 text-muted-foreground/60" />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onAmpliar(url)}
      aria-label="Ampliar a foto"
      className="foco-anel h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-white"
    >
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setQuebrou(true)}
        className="h-full w-full object-contain"
      />
    </button>
  );
}

/**
 * Últimas leituras.
 *
 * Serve para a pergunta que aparece o tempo todo na prateleira: "esse eu
 * já contei?". Sem ela, a saída é recontar — e recontar é a origem mais
 * comum de divergência inventada.
 *
 * A linha guarda o acumulado NAQUELE momento, não o total de agora.
 */
function Historico({ linhas }: { linhas: LinhaHistorico[] }) {
  const [tudo, setTudo] = useState(false);
  if (linhas.length === 0) return null;
  const mostradas = tudo ? linhas : linhas.slice(0, 5);

  return (
    <div className="mt-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Últimas leituras
        </h3>
        {linhas.length > 5 && (
          <button
            type="button"
            onClick={() => setTudo((v) => !v)}
            className="foco-anel rounded-sm px-1.5 py-1 text-[12px] font-semibold text-primary hover:bg-surface-muted"
          >
            {tudo ? "ver menos" : `ver as ${linhas.length}`}
          </button>
        )}
      </div>
      <div className="rounded-lg border border-border/70">
        {mostradas.map((l, i) => (
          <div
            key={`${l.codigo}-${i}`}
            className="flex items-center gap-2.5 border-b border-border/50 px-2.5 py-1.5 last:border-0"
          >
            <span className="w-9 shrink-0 tabular-nums text-[11px] text-muted-foreground">
              {l.hora}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] text-foreground">
                {l.descricao || l.codigo}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {l.qtd > 0 ? `+${l.qtd}` : l.qtd} · acumulado {l.contado} · sistema {l.saldo}
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 tabular-nums text-[14px] font-bold",
                corDaDiferenca(l.diferenca).texto
              )}
            >
              {l.diferenca > 0 ? `+${l.diferenca}` : l.diferenca}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResumoDaSessao({
  sessao,
  apurados,
  secao,
  setSecao,
  onFinalizar,
  onEnviarDrive,
  envioDrive,
  ocupado,
}: {
  sessao: Sessao;
  apurados: ItemApurado[];
  secao: string;
  setSecao: (v: string) => void;
  onFinalizar: () => void;
  onEnviarDrive: (parcial: boolean) => void;
  envioDrive: RespostaDrive | null;
  ocupado: boolean;
}) {
  const comDif = apurados.filter((i) => i.diferenca !== 0);
  const faltando = comDif.reduce((s, i) => s + (i.diferenca < 0 ? -i.diferenca : 0), 0);
  const sobrando = comDif.reduce((s, i) => s + (i.diferenca > 0 ? i.diferenca : 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-surface-muted p-2.5">
          <div className="text-[20px] font-bold tabular-nums text-foreground">{apurados.length}</div>
          <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">produtos</div>
        </div>
        <div className="rounded-md bg-chama/12 p-2.5">
          <div className="text-[20px] font-bold tabular-nums text-chama-ink">{faltando}</div>
          <div className="text-[10.5px] uppercase tracking-wide text-chama-ink/80">faltando</div>
        </div>
        <div className="rounded-md bg-brincadeira/12 p-2.5">
          <div className="text-[20px] font-bold tabular-nums text-brincadeira-ink">{sobrando}</div>
          <div className="text-[10.5px] uppercase tracking-wide text-brincadeira-ink/80">sobrando</div>
        </div>
      </div>

      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Seção atual
        </span>
        <input
          value={secao}
          onChange={(e) => setSecao(e.target.value)}
          placeholder="Trocou de prateleira? Atualize aqui"
          className="foco-anel mt-1 h-toque w-full rounded-md border border-input bg-background px-3 text-[14px] text-foreground"
        />
      </label>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            Apuração ({comDif.length} com diferença)
          </h3>
          <a
            href={contagemService.urlCsv(sessao.id)}
            target="_blank"
            rel="noreferrer"
            className="foco-anel inline-flex items-center gap-1 rounded-sm px-1.5 py-1 text-[12px] font-semibold text-primary hover:bg-surface-muted"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
        </div>
        {apurados.length === 0 ? (
          <p className="py-3 text-[13px] text-muted-foreground">Nada contado ainda.</p>
        ) : (
          <div>
            {apurados.map((i) => (
              <LinhaApurada key={i.codigo} item={i} />
            ))}
          </div>
        )}
      </div>

      {(sessao.divergencias?.length ?? 0) > 0 && (
        <div>
          <h3 className="mb-1 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            Divergências anotadas
          </h3>
          {sessao.divergencias.map((d, i) => (
            <div key={i} className="border-b border-border/50 py-2 last:border-0">
              <div className="text-[13px] font-medium text-foreground">{d.motivo}</div>
              <div className="text-[11px] text-muted-foreground">
                {d.codigo_produto || d.codigo_lido} · {d.data_hora}
                {d.observacao ? ` · ${d.observacao}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enviar parcial NÃO fecha a conferência. É a rede de segurança de
          um inventário longo: se o servidor cair às 15h, o que foi contado
          de manhã já está no Drive. */}
      <div className="rounded-lg border border-border/70 p-3">
        <div className="mb-1 flex items-center gap-1.5">
          <UploadCloud className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            Drive da Yup
          </h3>
        </div>
        <p className="mb-2 text-[11.5px] text-muted-foreground">
          Manda as cinco planilhas para a pasta desta conferência em 04.5 - Contagem Cíclica,
          e o e-mail de resumo. Enviar parcial mantém a conferência aberta.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEnviarDrive(true)}
            disabled={ocupado}
            className="foco-anel h-toque flex-1 rounded-md bg-surface-muted text-[13px] font-semibold text-foreground disabled:opacity-40"
          >
            Enviar parcial
          </button>
          <a
            href={contagemService.urlPlanilha(sessao.id, "cubagem")}
            target="_blank"
            rel="noreferrer"
            className="foco-anel grid h-toque w-toque place-items-center rounded-md bg-surface-muted text-muted-foreground"
            title="Baixar só a planilha de cubagem"
          >
            <Box className="h-4 w-4" />
          </a>
          <a
            href={contagemService.urlPlanilha(sessao.id, "marcas")}
            target="_blank"
            rel="noreferrer"
            className="foco-anel grid h-toque w-toque place-items-center rounded-md bg-surface-muted text-muted-foreground"
            title="Baixar só a planilha de marcas"
          >
            <Tag className="h-4 w-4" />
          </a>
        </div>
        {envioDrive && (
          <div
            className={cn(
              "mt-2 rounded-md p-2 text-[11.5px]",
              envioDrive.sucesso ? "bg-folha/15 text-folha-ink" : "bg-chama/12 text-chama-ink"
            )}
          >
            {envioDrive.sucesso ? (
              <>
                {envioDrive.arquivos?.length ?? 0} planilha(s) no Drive
                {envioDrive.email ? " · e-mail enviado" : ""}.
                {/* O link vem do próprio Apps Script. Sem ele, conferir se
                    chegou vira caça ao tesouro dentro do Drive. */}
                {envioDrive.pasta && (
                  <>
                    {" "}
                    <a
                      href={envioDrive.pasta}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline"
                    >
                      abrir a pasta
                    </a>
                  </>
                )}
              </>
            ) : (
              envioDrive.detalhe || envioDrive.erro || "O Drive recusou o envio."
            )}
            {/* A resposta crua do Apps Script é o que diz o motivo real —
                chave errada, pasta inexistente, permissão. Sem ela o erro
                vira "não funcionou" e ninguém consegue agir. */}
            {!envioDrive.sucesso && envioDrive.resposta && (
              <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-all text-[10px] opacity-80">
                {envioDrive.resposta}
              </pre>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onFinalizar}
        disabled={ocupado}
        className="foco-anel flex h-toque w-full items-center justify-center gap-2 rounded-md bg-primary text-[14px] font-bold text-primary-foreground disabled:opacity-40"
      >
        {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
        Fechar conferência
      </button>
      <p className="text-center text-[11px] text-muted-foreground">
        Ao fechar, só os itens com diferença são reconsultados no Olist — é a segunda opinião antes
        do relatório.
      </p>
    </div>
  );
}

function FormularioDivergencia({
  motivos,
  sugestao,
  descricaoItem,
  onEnviar,
}: {
  motivos: string[];
  sugestao?: string;
  descricaoItem?: string;
  onEnviar: (motivo: string, observacao: string) => void;
}) {
  const [motivo, setMotivo] = useState(sugestao || "");
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (sugestao) setMotivo(sugestao);
  }, [sugestao]);

  return (
    <div className="space-y-3">
      {descricaoItem && !sugestao && (
        <p className="text-[13px] text-muted-foreground">
          Sobre <strong className="text-foreground">{descricaoItem}</strong>
        </p>
      )}
      <div className="space-y-1.5">
        {motivos.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMotivo(m)}
            className={cn(
              "foco-anel flex min-h-toque w-full items-center rounded-md px-3 text-left text-[13.5px] transition-colors",
              motivo === m
                ? "bg-primary font-bold text-primary-foreground"
                : "bg-surface-muted font-medium text-foreground hover:bg-border/60"
            )}
          >
            {m}
          </button>
        ))}
      </div>
      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        rows={2}
        placeholder="Observação (opcional) — o que você viu na prateleira"
        className="foco-anel w-full rounded-md border border-input bg-background p-3 text-[13.5px] text-foreground"
      />
      <button
        type="button"
        onClick={() => onEnviar(motivo, obs)}
        disabled={!motivo}
        className="foco-anel h-toque w-full rounded-md bg-primary text-[14px] font-bold text-primary-foreground disabled:opacity-40"
      >
        Registrar
      </button>
    </div>
  );
}

function PainelDivergencias() {
  const [dados, setDados] = useState<RespostaDivergencias | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [deposito, setDeposito] = useState<string>("");

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    void contagemService
      .divergencias({ deposito: deposito || undefined, apenas_com_diferenca: true, limite: 300 })
      .then((d) => vivo && setDados(d))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [deposito]);

  const resumo = dados?.resumo;

  return (
    <div className="px-4 py-4">
      <h1 className="text-[17px] font-bold text-foreground">Divergência de estoque</h1>
      <p className="mt-0.5 text-[12.5px] text-muted-foreground">
        O que divergiu em todas as conferências — não "o que fulano contou terça".
      </p>

      <div className="scrollbar-custom -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {["", ...DEPOSITOS].map((d) => (
          <button
            key={d || "todos"}
            type="button"
            onClick={() => setDeposito(d)}
            className={cn(
              "foco-anel shrink-0 rounded-sm px-3 py-1.5 text-[12.5px] transition-colors",
              deposito === d
                ? "bg-primary font-bold text-primary-foreground"
                : "bg-surface-muted font-medium text-muted-foreground"
            )}
          >
            {d || "Todos"}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 py-10 text-[13px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : !dados ? (
        <p className="py-10 text-[13px] text-chama-ink">
          Não deu para falar com o servidor de estoque.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-surface-muted p-2.5">
              <div className="text-[20px] font-bold tabular-nums text-foreground">
                {resumo?.produtos_divergentes ?? 0}
              </div>
              <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">itens</div>
            </div>
            <div className="rounded-md bg-chama/12 p-2.5">
              <div className="text-[20px] font-bold tabular-nums text-chama-ink">
                {resumo?.unidades_faltando ?? 0}
              </div>
              <div className="text-[10.5px] uppercase tracking-wide text-chama-ink/80">faltando</div>
            </div>
            <div className="rounded-md bg-brincadeira/12 p-2.5">
              <div className="text-[20px] font-bold tabular-nums text-brincadeira-ink">
                {resumo?.unidades_sobrando ?? 0}
              </div>
              <div className="text-[10.5px] uppercase tracking-wide text-brincadeira-ink/80">
                sobrando
              </div>
            </div>
          </div>

          <div className="mt-4">
            {dados.itens.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-muted-foreground">
                Nenhuma diferença registrada {deposito ? `em ${deposito}` : "ainda"}.
              </p>
            ) : (
              dados.itens.map((i) => (
                <div key={`${i.sessao}-${i.codigo}`} className="border-b border-border/50 py-2.5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium text-foreground">
                        {i.descricao || i.codigo}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {i.codigo} · contado {i.contado} · sistema {i.saldo}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground/80">
                        {i.operador} · {i.deposito}
                        {i.secao ? ` · ${i.secao}` : ""} · {i.data?.slice(0, 10)}
                        {i.status_sessao === "aberta" && " · em andamento"}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "shrink-0 tabular-nums text-[19px] font-bold",
                        corDaDiferenca(i.diferenca).texto
                      )}
                    >
                      {i.diferenca > 0 ? `+${i.diferenca}` : i.diferenca}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {dados.registradas.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-1 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                Anotadas pelos conferentes ({dados.registradas.length})
              </h2>
              {dados.registradas.map((d, n) => (
                <div key={n} className="border-b border-border/50 py-2 last:border-0">
                  <div className="text-[13px] font-medium text-foreground">{d.motivo}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {d.codigo_produto || d.codigo_lido} · {d.operador} · {d.deposito} · {d.data_hora}
                    {d.observacao ? ` · ${d.observacao}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Cubagem medida na prateleira.
 *
 * NÃO ALTERA O OLIST, e isso é decisão consciente. Duas razões, nesta
 * ordem: a regra da casa é nunca mexer no Olist sem autorização — o
 * sistema gera o arquivo e espera o OK; e mesmo autorizada, a gravação
 * pela API v2 já foi testada e falhou (gravou e a tela nova do Olist
 * mostrou as dimensões zeradas, SKU 34109). Gravar daqui seria mentir
 * para quem mediu. Vai para o CSV de correções.
 */
function FormularioCubagem({
  produto,
  onEnviar,
}: {
  produto: ProdutoResumo;
  onEnviar: (p: {
    peso_bruto?: number | null;
    comprimento?: number | null;
    altura?: number | null;
    largura?: number | null;
    observacao: string;
  }) => void;
}) {
  const atual = produto.dimensoes || {};
  const [peso, setPeso] = useState(atual.peso_bruto ? String(atual.peso_bruto) : "");
  const [c, setC] = useState(atual.comprimento ? String(atual.comprimento) : "");
  const [a, setA] = useState(atual.altura ? String(atual.altura) : "");
  const [l, setL] = useState(atual.largura ? String(atual.largura) : "");
  const [obs, setObs] = useState("");

  const num = (v: string) => {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const pesoNum = num(peso);
  /* 30 kg é peso de duas caixas de papel A4. Acima disso, quase sempre é
     grama digitado como quilo. Pergunta em vez de aceitar calado. */
  const pesoSuspeito = pesoNum !== null && pesoNum > 30;
  const vazio = !pesoNum && !num(c) && !num(a) && !num(l);

  const campo = (rotulo: string, valor: string, set: (v: string) => void, sufixo: string) => (
    <label className="block">
      <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
        {rotulo} <span className="font-normal normal-case">({sufixo})</span>
      </span>
      <input
        value={valor}
        onChange={(e) => set(e.target.value)}
        inputMode="decimal"
        placeholder="0"
        className="foco-anel mt-1 h-toque w-full rounded-md border border-input bg-background px-3 text-[15px] tabular-nums text-foreground"
      />
    </label>
  );

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-muted-foreground">
        <strong className="text-foreground">{produto.descricao}</strong>
      </p>

      <div className="grid grid-cols-2 gap-2">
        {campo("Peso bruto", peso, setPeso, "kg")}
        {campo("Comprimento", c, setC, "cm")}
        {campo("Altura", a, setA, "cm")}
        {campo("Largura", l, setL, "cm")}
      </div>

      {pesoSuspeito && (
        <p className="rounded-md bg-abraco/50 p-2 text-[12px] text-chama-ink">
          {pesoNum} kg é muito para um item de papelaria. Confira se não foram gramas.
        </p>
      )}

      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        rows={2}
        placeholder="Observação (opcional) — ex.: medido na embalagem fechada"
        className="foco-anel w-full rounded-md border border-input bg-background p-3 text-[13.5px] text-foreground"
      />

      <p className="text-[11.5px] text-muted-foreground">
        Isto <strong className="text-foreground">não altera o Olist</strong>. Sai na planilha de
        cubagem para conferência e importação depois do seu OK.
      </p>

      <button
        type="button"
        onClick={() => onEnviar({
          peso_bruto: pesoNum,
          comprimento: num(c),
          altura: num(a),
          largura: num(l),
          observacao: obs,
        })}
        disabled={vazio}
        className="foco-anel h-toque w-full rounded-md bg-primary text-[14px] font-bold text-primary-foreground disabled:opacity-40"
      >
        Anotar cubagem
      </button>
    </div>
  );
}

/**
 * Marca correta.
 *
 * O autocompletar não é conforto: sem ele cada conferente inventa a sua
 * grafia e o relatório sai com "Tilibra", "TILIBRA" e "tilibra" como três
 * marcas diferentes. Marca que não está na lista pede confirmação — é
 * provável que seja erro de digitação, não marca nova.
 */
function FormularioMarca({
  produto,
  conhecidas,
  onEnviar,
}: {
  produto: ProdutoResumo;
  conhecidas: string[];
  onEnviar: (marca: string) => void;
}) {
  const [texto, setTexto] = useState(produto.marca_no_nome || produto.marca || "");
  const [confirmandoNova, setConfirmandoNova] = useState(false);

  const busca = texto.trim().toLowerCase();
  const sugestoes = busca
    ? conhecidas.filter((m) => m.toLowerCase().includes(busca)).slice(0, 6)
    : conhecidas.slice(0, 6);
  const eNova =
    !!texto.trim() && !conhecidas.some((m) => m.toLowerCase() === texto.trim().toLowerCase());

  const enviar = () => {
    const limpa = texto.trim();
    if (!limpa) return;
    if (eNova && !confirmandoNova) {
      setConfirmandoNova(true);
      return;
    }
    onEnviar(limpa);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-[12.5px]">
        <div className="rounded-md bg-surface-muted p-2">
          <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
            no cadastro
          </div>
          <div className="truncate font-semibold text-foreground">
            {produto.marca || "não definida"}
          </div>
        </div>
        <div className="rounded-md bg-surface-muted p-2">
          <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
            no nome
          </div>
          <div className="truncate font-semibold text-foreground">
            {produto.marca_no_nome || "—"}
          </div>
        </div>
      </div>

      <input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setConfirmandoNova(false);
        }}
        autoFocus
        autoComplete="off"
        placeholder="Marca correta"
        className="foco-anel h-toque w-full rounded-md border border-input bg-background px-3 text-[15px] text-foreground"
      />

      {sugestoes.length > 0 && (
        <div className="faixa-chips flex flex-wrap gap-1.5">
          {sugestoes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setTexto(m);
                setConfirmandoNova(false);
              }}
              className="foco-anel rounded-sm bg-surface-muted px-2.5 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-border/60"
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {confirmandoNova && (
        <p className="rounded-md bg-abraco/50 p-2 text-[12px] text-chama-ink">
          "{texto.trim()}" não existe no cadastro. Se for marca nova mesmo, toque de novo em
          Anotar. Se foi erro de digitação, corrija acima.
        </p>
      )}

      <p className="text-[11.5px] text-muted-foreground">
        Isto <strong className="text-foreground">não altera o Olist</strong>. Sai na planilha de
        marcas para correção depois do seu OK.
      </p>

      <button
        type="button"
        onClick={enviar}
        disabled={!texto.trim()}
        className="foco-anel h-toque w-full rounded-md bg-primary text-[14px] font-bold text-primary-foreground disabled:opacity-40"
      >
        {confirmandoNova ? "Anotar como marca nova" : "Anotar marca"}
      </button>
    </div>
  );
}
