import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Zap, X, Save, Info } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../contexts/AuthContext";
import {
  respostasRapidasService,
  getModoArmazenamento,
  type ModoArmazenamento,
} from "../../services/respostasRapidas.service";
import {
  RespostaRapida,
  VARIAVEIS_DISPONIVEIS,
  aplicarVariaveis,
} from "../../types/respostaRapida.types";
import { cn } from "../../utils/cn";

const CATEGORIAS = [
  "Saudação",
  "Preço e estoque",
  "Serviços",
  "Pagamento",
  "Entrega e retirada",
  "Trocas",
  "Encerramento",
  "Geral",
];

const VAZIO: Omit<RespostaRapida, "id"> = {
  atalho: "",
  titulo: "",
  texto: "",
  categoria: "Geral",
  ativo: true,
};

interface Props {
  /** true quando a tela é aberta dentro da aba de Configurações. */
  embutido?: boolean;
}

export default function RespostasRapidas({ embutido = false }: Props) {
  const [itens, setItens] = useState<RespostaRapida[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<RespostaRapida | null>(null);
  const [novo, setNovo] = useState<Omit<RespostaRapida, "id"> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [modo, setModo] = useState<ModoArmazenamento>("desconhecido");
  const { showToast } = useToast();
  const { usuario } = useAuth();

  const carregar = async () => {
    setCarregando(true);
    setItens(await respostasRapidasService.listar(true));
    setModo(getModoArmazenamento());
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const form = editando ?? novo;
  const emEdicao = Boolean(form);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return itens;
    return itens.filter(
      (r) =>
        r.atalho.includes(t) ||
        r.titulo.toLowerCase().includes(t) ||
        r.texto.toLowerCase().includes(t)
    );
  }, [itens, busca]);

  const atualizarForm = (campo: string, valor: any) => {
    if (editando) setEditando({ ...editando, [campo]: valor });
    else if (novo) setNovo({ ...novo, [campo]: valor });
  };

  const validar = (f: Omit<RespostaRapida, "id">, idAtual?: string) => {
    const atalho = f.atalho.replace(/^\//, "").trim().toLowerCase();
    if (!atalho) return "O atalho é obrigatório.";
    if (!/^[a-z0-9_-]+$/.test(atalho))
      return "Use só letras sem acento, números, hífen e underline no atalho.";
    if (!f.titulo.trim()) return "Dê um nome para a resposta.";
    if (!f.texto.trim()) return "Escreva o texto da resposta.";
    const duplicado = itens.find((r) => r.atalho === atalho && r.id !== idAtual);
    if (duplicado) return `Já existe /${atalho} ("${duplicado.titulo}").`;
    return null;
  };

  const salvar = async () => {
    if (!form) return;
    const erro = validar(form, editando?.id);
    if (erro) {
      showToast(erro, "error");
      return;
    }

    setSalvando(true);
    try {
      const dados = {
        ...form,
        atalho: form.atalho.replace(/^\//, "").trim().toLowerCase(),
        titulo: form.titulo.trim(),
        texto: form.texto.trim(),
        criadoPor: form.criadoPor || usuario?.nome,
      };

      if (editando) {
        await respostasRapidasService.atualizar(editando.id, dados);
        showToast("Resposta atualizada", "success");
      } else {
        await respostasRapidasService.criar(dados);
        showToast("Resposta criada", "success");
      }
      setEditando(null);
      setNovo(null);
      await carregar();
    } catch {
      showToast("Não foi possível salvar. Confira se o servidor do painel está no ar.", "error");
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (r: RespostaRapida) => {
    if (!window.confirm(`Apagar a resposta /${r.atalho}?`)) return;
    try {
      await respostasRapidasService.remover(r.id);
      showToast("Resposta apagada", "success");
      await carregar();
    } catch {
      showToast("Não foi possível apagar", "error");
    }
  };

  const previa = form
    ? aplicarVariaveis(form.texto, {
        nome: "Maria Silva",
        telefone: "(33) 99999-0000",
        atendente: usuario?.nome || "Atendente",
      })
    : "";

  return (
    <div
      className={cn(
        embutido ? "" : "h-full overflow-y-auto scrollbar-custom bg-background"
      )}
    >
      <div className={cn("space-y-5", embutido ? "" : "max-w-5xl mx-auto p-5")}>
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {!embutido && (
              <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                <Zap className="w-5 h-5 text-accent" />
                Respostas rápidas
              </h1>
            )}
            <p className="text-sm text-muted-foreground mt-0.5">
              O atendente digita <span className="font-mono bg-surface-muted px-1 rounded">/atalho</span>{" "}
              na conversa e o texto entra na caixa. A lista é a mesma para toda a equipe.
            </p>
          </div>
          {!emEdicao && (
            <Button
              onClick={() => setNovo({ ...VAZIO })}
              className="bg-primary text-primary-foreground hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nova resposta
            </Button>
          )}
        </header>

        {/* Enquanto o server.js novo não estiver publicado na VPS, as rotas
            /config/* não existem lá e a lista vive só neste navegador.
            Esconder isso faria a equipe cadastrar resposta que o colega não vê. */}
        {modo === "local" && (
          <div className="flex items-start gap-2.5 rounded-lg border border-chama/40 bg-chama/10 px-3 py-2.5">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-chama" />
            <div className="text-[13px] leading-snug text-foreground">
              <strong className="font-semibold">Salvando só neste navegador.</strong>{" "}
              O servidor ainda não tem as rotas de respostas rápidas — publique e
              reinicie o <span className="font-mono">server.js</span> na VPS para a
              lista valer para toda a equipe. O que for cadastrado agora continua
              aqui e precisa ser recadastrado depois.
            </div>
          </div>
        )}

        {modo === "servidor" && (
          <div className="text-[12px] text-muted-foreground">
            Lista compartilhada com toda a equipe.
          </div>
        )}

        {/* Formulário */}
        {form && (
          <div className="rounded-xl border border-border bg-surface shadow-card p-4 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">
                {editando ? `Editando /${editando.atalho}` : "Nova resposta rápida"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditando(null);
                  setNovo(null);
                }}
                className="p-1 rounded-md hover:bg-surface-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[180px_1fr_200px]">
              <label className="block">
                <span className="text-[12px] font-medium text-muted-foreground">Atalho</span>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                    /
                  </span>
                  <Input
                    value={form.atalho}
                    onChange={(e) => atualizarForm("atalho", e.target.value)}
                    placeholder="pix"
                    className="pl-6 font-mono bg-surface-muted border-0"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-[12px] font-medium text-muted-foreground">Nome</span>
                <Input
                  value={form.titulo}
                  onChange={(e) => atualizarForm("titulo", e.target.value)}
                  placeholder="Dados do Pix"
                  className="mt-1 bg-surface-muted border-0"
                />
              </label>

              <label className="block">
                <span className="text-[12px] font-medium text-muted-foreground">Categoria</span>
                <select
                  value={form.categoria}
                  onChange={(e) => atualizarForm("categoria", e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-md bg-surface-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-[12px] font-medium text-muted-foreground">Texto</span>
              <textarea
                value={form.texto}
                onChange={(e) => atualizarForm("texto", e.target.value)}
                rows={5}
                placeholder={"{saudacao}, {primeiro_nome}! Nosso Pix é o CNPJ 37.315.718/0002-68, em nome de Comercial Yup LTDA. Assim que cair, já separo seu pedido 💙"}
                className="mt-1 w-full p-3 rounded-md bg-surface-muted text-foreground text-sm outline-none resize-y focus:ring-2 focus:ring-ring"
              />
            </label>

            {/* Variáveis */}
            <div className="rounded-lg bg-surface-muted p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground mb-2">
                <Info className="w-3.5 h-3.5 text-accent" />
                Clique para inserir no texto
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VARIAVEIS_DISPONIVEIS.map((v) => (
                  <button
                    key={v.chave}
                    type="button"
                    title={v.descricao}
                    onClick={() => atualizarForm("texto", `${form.texto}${v.chave}`)}
                    className="font-mono text-[11.5px] px-2 py-1 rounded bg-accent/15 text-accent-foreground hover:bg-accent/25 transition-colors"
                  >
                    {v.chave}
                  </button>
                ))}
              </div>
            </div>

            {/* Prévia */}
            {form.texto.trim() && (
              <div>
                <span className="text-[12px] font-medium text-muted-foreground">
                  Como o cliente vai ver
                </span>
                <div className="mt-1 rounded-lg rounded-tl-none bg-atendendo/15 border border-atendendo/30 p-3 text-sm text-foreground whitespace-pre-wrap">
                  {previa}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditando(null);
                  setNovo(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={salvar}
                disabled={salvando}
                className="bg-primary text-primary-foreground hover:opacity-90"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        )}

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por atalho, nome ou texto..."
            className="pl-9 bg-surface border-border"
          />
        </div>

        {/* Lista */}
        {carregando ? (
          <p className="text-center text-sm text-muted-foreground py-10">Carregando...</p>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {busca ? "Nada encontrado" : "Nenhuma resposta rápida ainda"}
            </p>
            <p className="text-sm">
              {busca ? "Tente outro termo" : "Comece pelas três que mais se repetem no dia"}
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {filtrados.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "group rounded-xl border border-border bg-surface p-3 flex items-start gap-3 shadow-card transition-colors",
                  !r.ativo && "opacity-55"
                )}
              >
                <span className="shrink-0 font-mono text-[12px] font-semibold text-accent-foreground bg-accent/15 px-2 py-1 rounded">
                  /{r.atalho}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[14px] text-foreground">{r.titulo}</span>
                    <span className="text-[11px] text-muted-foreground bg-surface-muted px-1.5 py-0.5 rounded-full">
                      {r.categoria}
                    </span>
                    {!r.ativo && (
                      <span className="text-[11px] text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">
                        Desativada
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
                    {r.texto}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-1">
                  <button
                    type="button"
                    title={r.ativo ? "Desativar" : "Ativar"}
                    onClick={async () => {
                      await respostasRapidasService.atualizar(r.id, { ativo: !r.ativo });
                      carregar();
                    }}
                    className={cn(
                      "w-9 h-5 rounded-full relative transition-colors",
                      r.ativo ? "bg-atendendo" : "bg-border"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                        r.ativo ? "left-[18px]" : "left-0.5"
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    title="Editar"
                    onClick={() => {
                      setNovo(null);
                      setEditando(r);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="p-2 rounded-md hover:bg-surface-muted text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Apagar"
                    onClick={() => remover(r)}
                    className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
