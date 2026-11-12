import type { CSSProperties } from "react";
import { cn } from "../utils/cn";

/**
 * A marca da Yup na Central.
 *
 * POR QUE MÁSCARA E NÃO <img>
 * O arquivo que temos é PNG de traço único na cor `noite` (#272D4F). Um
 * <img> dele some no tema escuro — traço quase preto sobre fundo quase
 * preto. Manter um segundo PNG branco significaria dois arquivos em
 * sincronia para sempre, e nenhum dos dois serviria dentro do quadrado
 * `bg-primary`, onde a cor certa não é noite nem branco, e sim
 * `primary-foreground`.
 *
 * Com `mask-image` o PNG entra só como recorte: quem pinta é o
 * `background-color`, e `bg-current` faz a marca herdar a cor do texto do
 * pai. Um arquivo, certo em qualquer tema e sobre qualquer fundo.
 *
 * O preço: a marca deixa de ser uma imagem para o navegador (não aparece
 * em "salvar imagem" nem para leitor de tela). Daí o role="img".
 *
 * Quando existir o SVG vetorial da marca, este é o único arquivo a mudar.
 */

type Props = {
  className?: string;
  /** Halo de neon. A marca é uma lâmpada; no escuro, apagada parecia defeito. */
  neon?: boolean;
  /** Acende também no tema claro. Padrão: só no escuro. */
  neonSempre?: boolean;
  rotulo?: string;
};

/**
 * ARMADILHA 1 — o brilho vai no elemento PAI.
 * A ordem de pintura do CSS é filter → clip → mask. Posto no próprio
 * elemento mascarado, o drop-shadow nasce do retângulo cheio e depois é
 * recortado pela máscara: o halo simplesmente não aparece, sem erro
 * nenhum. Levou três testes para descobrir isso.
 *
 * ARMADILHA 2 — estas classes precisam estar escritas por extenso.
 * O Tailwind lê o código como TEXTO; classe montada por template string
 * some do build em silêncio.
 */
const HALO =
  "[filter:drop-shadow(0_0_3px_rgb(255_255_255_/_0.9))_drop-shadow(0_0_12px_rgb(234_112_176_/_0.75))]";
const HALO_ESCURO =
  "dark:[filter:drop-shadow(0_0_3px_rgb(255_255_255_/_0.9))_drop-shadow(0_0_12px_rgb(234_112_176_/_0.75))]";

function mascara(arquivo: string): CSSProperties {
  return {
    WebkitMaskImage: `url(${arquivo})`,
    maskImage: `url(${arquivo})`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };
}

function Marca({ arquivo, className, neon, neonSempre, rotulo }: Props & { arquivo: string }) {
  const miolo = (
    <span
      role="img"
      aria-label={rotulo}
      style={mascara(arquivo)}
      className={cn("block h-full w-full bg-current")}
    />
  );
  return (
    <span
      className={cn(
        "inline-block shrink-0",
        neon && (neonSempre ? HALO : HALO_ESCURO),
        className
      )}
    >
      {miolo}
    </span>
  );
}

/**
 * Só a lâmpada, com o traço engrossado.
 *
 * ATENÇÃO antes de usar isto pequeno: a marca é de contorno fino e NÃO
 * lê abaixo de ~40px — a 20px o bulbo vira um borrão. Medido, não
 * chutado. Em selo pequeno use a letra; esta aqui serve de 40px para
 * cima (ícone de tela inicial, cabeçalho de impressão, etiqueta).
 */
export function MarcaSimbolo(p: Props) {
  return <Marca arquivo="/marca/yup-simbolo-forte.png" rotulo="Yup" {...p} />;
}

/** Lâmpada + letreiro. Onde há altura sobrando: login, capa, impressão. */
export function MarcaCompleta(p: Props) {
  return <Marca arquivo="/marca/yup.png" rotulo="Yup" {...p} />;
}
