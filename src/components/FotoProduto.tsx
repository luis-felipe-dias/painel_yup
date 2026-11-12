import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "../utils/cn";

/**
 * Miniatura do produto nas listas (reposição, estoque mínimo, compras).
 *
 * A URL vem do espelho, campo `foto`, preenchida uma única vez por
 * POST /fotos/preencher. Aqui nunca há ida ao Olist: uma tabela de 300
 * linhas faria 300 chamadas e derrubaria a cota da conta em segundos.
 *
 * Produto sem foto mostra o quadro vazio em vez de sumir — o buraco na
 * lista é o aviso de que o cadastro está incompleto, e é justamente o que
 * leva alguém a arrumar.
 *
 * `loading="lazy"` não é detalhe: sem ele, abrir a reposição dispara o
 * download das centenas de imagens da lista inteira de uma vez.
 */
export function FotoProduto({
  url,
  descricao,
  className,
  onAmpliar,
}: {
  url?: string | null;
  descricao?: string;
  className?: string;
  onAmpliar?: (url: string) => void;
}) {
  const [quebrou, setQuebrou] = useState(false);
  const base = cn("h-10 w-10 shrink-0 rounded-md", className);

  if (!url || quebrou) {
    return (
      <div
        className={cn(base, "grid place-items-center border border-dashed border-border bg-surface-muted")}
        title={quebrou ? "A foto não carregou" : "Produto sem foto no cadastro"}
        aria-hidden
      >
        <ImageOff className="h-3.5 w-3.5 text-muted-foreground/60" />
      </div>
    );
  }

  const img = (
    <img
      src={url}
      alt={descricao ? `Foto de ${descricao}` : ""}
      loading="lazy"
      decoding="async"
      onError={() => setQuebrou(true)}
      className="h-full w-full rounded-md object-contain"
    />
  );

  if (!onAmpliar) {
    return <div className={cn(base, "overflow-hidden border border-border bg-white")}>{img}</div>;
  }
  return (
    <button
      type="button"
      onClick={() => onAmpliar(url)}
      aria-label="Ampliar a foto"
      className={cn(base, "foco-anel overflow-hidden border border-border bg-white")}
    >
      {img}
    </button>
  );
}
