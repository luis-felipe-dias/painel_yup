import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  BadgeCheck,
  Check,
  FlaskConical,
  Info,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  Store,
  Trash2,
  X,
} from "lucide-react";

import { cn } from "../../utils/cn";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/useToast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import * as peper from "../../services/peper.service";
import {
  EXPLICA_ACAO,
  PESO_ACAO,
  ROTULO_ACAO,
  ROTULO_STATUS,
  type AcaoPalavra,
  type CampoFicha,
  type ItemCuradoria,
  type RegraPalavra,
  type RespostaFicha,
  type RespostaPalavras,
  type RespostaTeste,
  type StatusCuradoria,
} from "../../types/peper.types";

/**
 * A Peper em um lugar só.
 *
 * POR QUE TRÊS ABAS E NÃO TRÊS PÁGINAS
 * As três coisas respondem à mesma pergunta — "por que ela respondeu
 * isso?". Quem revisa a fila da curadoria descobre ali que falta um campo
 * da ficha, ou que escapou uma palavra. Separar em três itens de menu
 * obrigaria a sair e voltar justamente no momento em que a pessoa já sabe
 * o que precisa corrigir.
 *
 * ORDEM DAS ABAS, DE PROPÓSITO
 * Ficha primeiro: é o que mais muda nas primeiras semanas e o que causa o
 * pior erro (inventar endereço). Curadoria segundo: é a rotina diária.
 * Palavras terceiro: é a rede de proteção, mexida de vez em quando.
 */

type Aba = "ficha" | "curadoria" | "palavras";

const ABAS: { id: Aba; rotulo: string; icone: any }[] = [
  { id: "ficha", rotulo: "Ficha da loja", icone: Store },
  { id: "curadoria", rotulo: "Curadoria", icone: ListChecks },
  { id: "palavras", rotulo: "Palavras", icone: ShieldAlert },
];

// ------------------------------------------------------------------ peças

function Aviso({
  tom,
  children,
}: {
  tom: "info" | "alerta" | "erro" | "bom";
  children: ReactNode;
}) {
  const Icone = tom === "bom" ? BadgeCheck : tom === "info" ? Info : AlertTriangle;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-md border p-3 text-[13px] leading-relaxed",
        tom === "info" && "border-border bg-surface-muted text-muted-foreground",
        tom === "alerta" && "border-chama/30 bg-chama/10 text-chama-ink",
        tom === "erro" && "border-destructive/30 bg-destructive/10 text-destructive",
        tom === "bom" && "border-folha/40 bg-folha/10 text-folha-ink"
      )}
    >
      <Icone className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-8 text-center text-[13px] text-muted-foreground">
      {texto}
    </div>
  );
}

function Carregando() {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-[13px] text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Carregando…
    </div>
  );
}

function Selo({ acao }: { acao: AcaoPalavra }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide",
        acao === "bloquear" && "bg-destructive/15 text-destructive",
        acao === "trocar" && "bg-brincadeira/15 text-brincadeira-ink",
        acao === "avisar" && "bg-surface-muted text-muted-foreground"
      )}
    >
      {ROTULO_ACAO[acao]}
    </span>
  );
}

// ------------------------------------------------------------------ Ficha

function AbaFicha({ por }: { por: string }) {
  const { showToast } = useToast();
  const [dados, setDados] = useState<RespostaFicha | null>(null);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [verPrompt, setVerPrompt] = useState(false);
  const [erro, setErro] = useState("");

  const buscar = useCallback(async () => {
    setErro("");
    try {
      const r = await peper.lerFicha();
      setDados(r);
      setRascunho({});
    } catch (e: any) {
      setErro(e?.message || "Não consegui falar com o bot.");
    }
  }, []);

  useEffect(() => {
    buscar();
  }, [buscar]);

  // Só o que realmente mudou vai no PUT. Mandar tudo faria o painel
  // sobrescrever, com o valor velho, um campo que outra pessoa acabou de
  // corrigir na outra ponta.
  const mudados = useMemo(() => {
    if (!dados) return {};
    const saida: Record<string, string> = {};
    for (const campo of dados.campos) {
      const novo = rascunho[campo.chave];
      if (novo !== undefined && novo.trim() !== (campo.valor || "").trim()) {
        saida[campo.chave] = novo;
      }
    }
    return saida;
  }, [dados, rascunho]);

  const total = Object.keys(mudados).length;

  const salvar = async () => {
    if (!total) return;
    setSalvando(true);
    try {
      const r = await peper.salvarFicha(mudados, por);
      setDados(r);
      setRascunho({});
      showToast(
        total === 1 ? "Campo salvo. Ela já usa o valor novo." : `${total} campos salvos.`,
        "success"
      );
    } catch (e: any) {
      showToast(e?.message || "Não consegui salvar.", "error");
    } finally {
      setSalvando(false);
    }
  };

  if (erro) {
    return (
      <div className="space-y-3">
        <Aviso tom="erro">{erro}</Aviso>
        <Button variant="outline" size="sm" onClick={buscar}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (!dados) return <Carregando />;

  return (
    <div className="space-y-4">
      {dados.faltando.length > 0 ? (
        <Aviso tom="alerta">
          <strong>{dados.faltando.length} campos em branco.</strong> Nesses assuntos
          ela não responde: diz que vai confirmar com a equipe e passa a conversa.
          Em branco é melhor que um palpite — mas cada um custa um atendimento.
          <div className="mt-1 text-[12px] opacity-90">{dados.faltando.join(" · ")}</div>
        </Aviso>
      ) : (
        <Aviso tom="bom">Ficha completa. Ela responde tudo isso sozinha.</Aviso>
      )}

      <div className="space-y-3">
        {dados.campos.map((campo: CampoFicha) => {
          const valor = rascunho[campo.chave] ?? campo.valor;
          const alterado = mudados[campo.chave] !== undefined;
          return (
            <div key={campo.chave} className="space-y-1.5">
              <div className="flex items-baseline gap-2">
                <label
                  htmlFor={`ficha-${campo.chave}`}
                  className="text-[13px] font-semibold text-foreground"
                >
                  {campo.rotulo}
                </label>
                {!campo.preenchido && (
                  <span className="text-[11px] font-medium text-chama-ink">em branco</span>
                )}
                {alterado && (
                  <span className="text-[11px] font-medium text-brincadeira-ink">
                    não salvo
                  </span>
                )}
              </div>
              <Input
                id={`ficha-${campo.chave}`}
                value={valor}
                placeholder={campo.dica || "Deixe vazio se ainda não sabe"}
                onChange={(e) =>
                  setRascunho((r) => ({ ...r, [campo.chave]: e.target.value }))
                }
                className={cn(alterado && "border-brincadeira")}
              />
              {campo.dica && (
                <p className="text-[11.5px] leading-snug text-muted-foreground">
                  {campo.dica}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button onClick={salvar} disabled={!total || salvando}>
          {salvando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {total ? `Salvar ${total}` : "Salvar"}
        </Button>
        {total > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setRascunho({})}>
            Descartar mudanças
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => setVerPrompt((v) => !v)}
        >
          {verPrompt ? "Esconder" : "Ver o que ela lê"}
        </Button>
      </div>

      {verPrompt && (
        <pre className="scrollbar-custom max-h-80 overflow-auto rounded-md border border-border bg-surface-muted p-3 text-[11.5px] leading-relaxed text-muted-foreground">
          {dados.prompt}
        </pre>
      )}
    </div>
  );
}

// -------------------------------------------------------------- Curadoria

function AbaCuradoria({ por }: { por: string }) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<StatusCuradoria>("pendente");
  const [itens, setItens] = useState<ItemCuradoria[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  const buscar = useCallback(async (qual: StatusCuradoria) => {
    setCarregando(true);
    setErro("");
    try {
      const r = await peper.listarCuradoria(qual, 30);
      setItens(r.itens);
      setTotal(r.total);
    } catch (e: any) {
      setErro(e?.message || "Não consegui falar com o bot.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    buscar(status);
  }, [status, buscar]);

  const decidir = async (item: ItemCuradoria, aprovar: boolean) => {
    setOcupado(item.id);
    try {
      if (aprovar) {
        const final = editando === item.id ? texto.trim() : undefined;
        await peper.aprovarCuradoria(item.id, por, final || undefined);
        showToast("Aprovada. Ela já responde assim.", "success");
      } else {
        await peper.descartarCuradoria(item.id, por);
        showToast("Descartada.", "info");
      }
      setEditando(null);
      setItens((lista) => lista.filter((i) => i.id !== item.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e: any) {
      // 422 é a trava de preço do bot: resposta com valor não entra na
      // base. Não é falha do painel e a mensagem do backend explica.
      showToast(e?.message || "Não consegui registrar a decisão.", "error");
    } finally {
      setOcupado(null);
    }
  };

  const chaves = Object.keys(ROTULO_STATUS) as StatusCuradoria[];

  return (
    <div className="space-y-4">
      <Aviso tom="info">
        Cada item é uma pergunta que a Peper respondeu sozinha. Aprovar guarda a
        resposta na base dela — a próxima pessoa que perguntar o mesmo recebe
        isso, sem gastar IA. Descartar só apaga o registro, não desfaz nada que
        já foi enviado.
      </Aviso>

      <div className="faixa-chips scrollbar-custom flex gap-2 overflow-x-auto">
        {chaves.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              "foco-anel shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              s === status
                ? "bg-primary text-primary-foreground"
                : "bg-surface-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {ROTULO_STATUS[s]}
          </button>
        ))}
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto shrink-0"
          aria-label="Atualizar"
          onClick={() => buscar(status)}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {carregando ? (
        <Carregando />
      ) : itens.length === 0 ? (
        <Vazio
          texto={
            status === "pendente"
              ? "Nada para revisar. Fila limpa."
              : `Nenhum item em "${ROTULO_STATUS[status]}".`
          }
        />
      ) : (
        <>
          <p className="text-[12px] text-muted-foreground">
            {itens.length} de {total} — os mais antigos primeiro.
          </p>

          <div className="space-y-3">
            {itens.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-surface p-3.5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="min-w-0 text-[13.5px] font-semibold leading-snug text-foreground">
                    {item.pergunta}
                  </p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {item.criado_em}
                  </span>
                </div>

                {item.motivo_bloqueio && (
                  <p className="mb-2 text-[12px] font-medium text-chama-ink">
                    {item.motivo_bloqueio}
                  </p>
                )}

                {editando === item.id ? (
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    rows={4}
                    className="foco-anel mb-2 w-full rounded-md border border-brincadeira bg-surface p-2.5 text-[13px] leading-relaxed text-foreground"
                  />
                ) : (
                  <p className="mb-3 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
                    {item.resposta}
                  </p>
                )}

                {status === "pendente" || status === "bloqueado_preco" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={ocupado === item.id}
                      onClick={() => decidir(item, true)}
                    >
                      <Check className="mr-1.5 h-4 w-4" />
                      {editando === item.id ? "Salvar e aprovar" : "Aprovar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ocupado === item.id}
                      onClick={() => {
                        if (editando === item.id) {
                          setEditando(null);
                        } else {
                          setEditando(item.id);
                          setTexto(item.resposta || "");
                        }
                      }}
                    >
                      <Pencil className="mr-1.5 h-4 w-4" />
                      {editando === item.id ? "Cancelar" : "Corrigir"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={ocupado === item.id}
                      onClick={() => decidir(item, false)}
                    >
                      <X className="mr-1.5 h-4 w-4" />
                      Descartar
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// --------------------------------------------------------------- Palavras

const VAZIA = {
  termo: "",
  acao: "avisar" as AcaoPalavra,
  troca_por: "",
  motivo: "",
};

function AbaPalavras({ por }: { por: string }) {
  const { showToast } = useToast();
  const [dados, setDados] = useState<RespostaPalavras | null>(null);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ ...VAZIA });
  const [editando, setEditando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [textoTeste, setTextoTeste] = useState("");
  const [teste, setTeste] = useState<RespostaTeste | null>(null);
  const [testando, setTestando] = useState(false);

  const buscar = useCallback(async () => {
    setErro("");
    try {
      setDados(await peper.listarPalavras());
    } catch (e: any) {
      setErro(e?.message || "Não consegui falar com o bot.");
    }
  }, []);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const limpar = () => {
    setForm({ ...VAZIA });
    setEditando(null);
  };

  const salvar = async () => {
    const termo = form.termo.trim();
    if (!termo) {
      showToast("Escreva o termo.", "warning");
      return;
    }
    setSalvando(true);
    try {
      const corpo: peper.EntradaPalavra = {
        termo,
        acao: form.acao,
        // O backend exige troca_por quando a ação é "trocar" — vazio é
        // aceito (apaga a palavra), ausente não.
        troca_por: form.acao === "trocar" ? form.troca_por : null,
        motivo: form.motivo.trim() || null,
        ativo: true,
        por,
      };
      if (editando) {
        await peper.atualizarPalavra(editando, corpo);
        showToast("Regra atualizada.", "success");
      } else {
        await peper.criarPalavra(corpo);
        showToast("Palavra cadastrada. Vale na próxima resposta.", "success");
      }
      limpar();
      await buscar();
      if (textoTeste.trim()) await rodarTeste();
    } catch (e: any) {
      showToast(e?.message || "Não consegui salvar.", "error");
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (regra: RegraPalavra) => {
    if (!regra.id) return;
    if (!window.confirm(`Tirar "${regra.termo}" da lista?`)) return;
    try {
      await peper.removerPalavra(regra.id);
      showToast("Removida.", "info");
      await buscar();
    } catch (e: any) {
      showToast(e?.message || "Não consegui remover.", "error");
    }
  };

  const rodarTeste = async () => {
    if (!textoTeste.trim()) return;
    setTestando(true);
    try {
      setTeste(await peper.testarPalavras(textoTeste));
    } catch (e: any) {
      showToast(e?.message || "Não consegui testar.", "error");
    } finally {
      setTestando(false);
    }
  };

  if (erro) {
    return (
      <div className="space-y-3">
        <Aviso tom="erro">{erro}</Aviso>
        <Button variant="outline" size="sm" onClick={buscar}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (!dados) return <Carregando />;

  const ordenadas = [...dados.regras].sort(
    (a, b) => PESO_ACAO[a.acao] - PESO_ACAO[b.acao] || a.termo.localeCompare(b.termo)
  );
  const defabrica = dados.padrao.filter((r) => !r.sobrescrita);

  return (
    <div className="space-y-5">
      <Aviso tom="info">
        A lista está incompleta de propósito. O valor dela não é o que já está
        aqui: é você ver a Peper escapar com um termo, cadastrar em dez segundos
        e aquilo não acontecer mais — sem deploy. Comece tudo em{" "}
        <strong>só registra</strong> e suba para <strong>não envia</strong> o que
        de fato custa dinheiro. Travar demais faz a equipe receber conversa à
        toa e parar de confiar nela.
      </Aviso>

      {/* ---- cadastro */}
      <div className="rounded-md border border-border bg-surface p-3.5">
        <h3 className="mb-3 text-[13px] font-bold text-foreground">
          {editando ? "Editar regra" : "Nova palavra"}
        </h3>

        <div className="space-y-3">
          <Input
            value={form.termo}
            placeholder="Palavra ou frase, ex.: desconto especial"
            onChange={(e) => setForm((f) => ({ ...f, termo: e.target.value }))}
          />

          <div className="grid gap-2 sm:grid-cols-3">
            {(["bloquear", "trocar", "avisar"] as AcaoPalavra[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setForm((f) => ({ ...f, acao: a }))}
                className={cn(
                  "foco-anel min-h-toque rounded-md border p-2.5 text-left transition-colors",
                  form.acao === a
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-surface-muted"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {a === "bloquear" && <Ban className="h-3.5 w-3.5 text-destructive" />}
                  <span className="text-[12.5px] font-semibold text-foreground">
                    {ROTULO_ACAO[a]}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <p className="text-[11.5px] leading-snug text-muted-foreground">
            {EXPLICA_ACAO[form.acao]}
          </p>

          {form.acao === "trocar" && (
            <Input
              value={form.troca_por}
              placeholder='Trocar por… (vazio apaga a palavra)'
              onChange={(e) => setForm((f) => ({ ...f, troca_por: e.target.value }))}
            />
          )}

          <Input
            value={form.motivo}
            placeholder="Motivo (opcional) — aparece no log quando pegar"
            onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
          />

          <div className="flex gap-2">
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {editando ? "Salvar" : "Adicionar"}
            </Button>
            {editando && (
              <Button variant="ghost" size="sm" onClick={limpar}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ---- teste */}
      <div className="rounded-md border border-border bg-surface p-3.5">
        <h3 className="mb-1 flex items-center gap-2 text-[13px] font-bold text-foreground">
          <FlaskConical className="h-4 w-4" />
          Testar um texto
        </h3>
        <p className="mb-3 text-[11.5px] leading-snug text-muted-foreground">
          Vale mais que ler a lista: é aqui que se descobre que a regra
          "margem" também pega "margem da página".
        </p>
        <textarea
          value={textoTeste}
          onChange={(e) => setTextoTeste(e.target.value)}
          rows={3}
          placeholder="Cole uma resposta da Peper…"
          className="foco-anel mb-2 w-full rounded-md border border-input bg-surface p-2.5 text-[13px] leading-relaxed text-foreground"
        />
        <Button variant="outline" size="sm" onClick={rodarTeste} disabled={testando}>
          {testando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FlaskConical className="mr-2 h-4 w-4" />
          )}
          Testar
        </Button>

        {teste && (
          <div className="mt-3 space-y-2">
            {teste.bloquear ? (
              <Aviso tom="erro">
                <strong>Essa resposta não sairia.</strong> A conversa iria para a
                equipe.
              </Aviso>
            ) : teste.achados.length > 0 ? (
              <Aviso tom="alerta">A resposta sairia, com ajuste.</Aviso>
            ) : (
              <Aviso tom="bom">Passa limpo.</Aviso>
            )}

            {teste.achados.map((a, i) => (
              <div
                key={`${a.termo}-${i}`}
                className="flex items-center gap-2 text-[12.5px] text-muted-foreground"
              >
                <Selo acao={a.acao} />
                <span className="font-medium text-foreground">{a.termo}</span>
                {a.motivo && <span className="truncate">— {a.motivo}</span>}
              </div>
            ))}

            {teste.texto !== textoTeste && (
              <div>
                <p className="mb-1 text-[11.5px] font-semibold text-muted-foreground">
                  Como o cliente receberia:
                </p>
                <p className="whitespace-pre-wrap rounded-md bg-surface-muted p-2.5 text-[13px] leading-relaxed text-foreground">
                  {teste.texto}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---- cadastradas */}
      <div>
        <h3 className="mb-2 text-[13px] font-bold text-foreground">
          Cadastradas por vocês ({ordenadas.length})
        </h3>
        {ordenadas.length === 0 ? (
          <Vazio texto="Nenhuma ainda. Só as de fábrica estão valendo." />
        ) : (
          <div className="space-y-2">
            {ordenadas.map((r) => (
              <div
                key={r.id || r.termo}
                className="flex items-center gap-3 rounded-md border border-border bg-surface p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-foreground">
                      {r.termo}
                    </span>
                    <Selo acao={r.acao} />
                    {!r.ativo && (
                      <span className="text-[11px] text-muted-foreground">desligada</span>
                    )}
                  </div>
                  {r.acao === "trocar" && (
                    <p className="text-[11.5px] text-muted-foreground">
                      vira “{r.troca_por || "(nada)"}”
                    </p>
                  )}
                  {r.motivo && (
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {r.motivo}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Editar ${r.termo}`}
                  onClick={() => {
                    setEditando(r.id);
                    setForm({
                      termo: r.termo,
                      acao: r.acao,
                      troca_por: r.troca_por || "",
                      motivo: r.motivo || "",
                    });
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover ${r.termo}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => remover(r)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- de fábrica */}
      <div>
        <h3 className="mb-1 text-[13px] font-bold text-foreground">
          De fábrica ({defabrica.length})
        </h3>
        <p className="mb-2 text-[11.5px] leading-snug text-muted-foreground">
          Vêm dos manuais da Yup e já estão valendo. Para mudar uma delas,
          cadastre o mesmo termo acima — a sua sobrescreve.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {defabrica.map((r) => (
            <span
              key={r.termo}
              title={r.motivo || undefined}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[11.5px] text-muted-foreground"
            >
              {r.termo}
              <Selo acao={r.acao} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ página

export default function Peper() {
  const { usuario } = useAuth();
  const por = usuario?.nome || "Atendente";
  const [aba, setAba] = useState<Aba>("ficha");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-4 md:pt-6">
      <header className="mb-4">
        <h1 className="text-[19px] font-bold text-foreground">Peper</h1>
        <p className="text-[12.5px] text-muted-foreground">
          O que ela sabe, o que ela aprendeu e o que ela não pode dizer.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Seções da Peper"
        className="mb-5 flex gap-1 rounded-md bg-surface-muted p-1"
      >
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={cn(
              "foco-anel flex min-h-toque flex-1 items-center justify-center gap-1.5 rounded px-2 text-[12.5px] font-semibold transition-colors md:min-h-0 md:py-2",
              aba === a.id
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <a.icone className="h-4 w-4 shrink-0" />
            <span className="truncate">{a.rotulo}</span>
          </button>
        ))}
      </div>

      {aba === "ficha" && <AbaFicha por={por} />}
      {aba === "curadoria" && <AbaCuradoria por={por} />}
      {aba === "palavras" && <AbaPalavras por={por} />}
    </div>
  );
}
