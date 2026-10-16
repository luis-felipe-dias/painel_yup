/**
 * Design tokens da YUP! — paleta oficial da marca (LartsDesign, 2025).
 *
 * Regra de uso, pensada para um painel que fica 8h aberto:
 *  - NOITE SERENA é a cor estrutural (sidebar ativa, botão primário, texto).
 *    Branco sobre ela dá contraste altíssimo, então é ela que carrega texto.
 *  - BRINCADEIRA VIVA é o acento (foco, item selecionado, destaque).
 *    NÃO usar branco sobre ela em texto pequeno: contraste ~2,6:1, reprova
 *    no WCAG AA. Por isso existe o tom `ink` de cada cor, escurecido só o
 *    suficiente para texto e badge.
 *  - As cores de status são as da marca, não as do iOS: Chama da Imaginação
 *    para quem está esperando, Folha de Aventuras para quem já está sendo
 *    atendido.
 */

export const yup = {
  noiteSerena:      { DEFAULT: '#272D4F', light: '#3A4270', dark: '#1A1F36', ink: '#1A1F36' },
  brumaSuave:       { DEFAULT: '#DDE3F1', light: '#EEF1F8', dark: '#C5CDDF', ink: '#6B7299' },
  toqueDeAfeto:     { DEFAULT: '#FEFDEB', light: '#FFFEF5', dark: '#FDFCD7', ink: '#8A7B2E' },
  abracoDoce:       { DEFAULT: '#FFC6C5', light: '#FFD9D8', dark: '#FFB0AF', ink: '#A33F3E' },
  brincadeiraViva:  { DEFAULT: '#EA70B0', light: '#EF8DC2', dark: '#E3539E', ink: '#A82D6F' },
  chamaImaginacao:  { DEFAULT: '#F15040', light: '#F47062', dark: '#E83A28', ink: '#C5331F' },
  folhaAventuras:   { DEFAULT: '#ACBD6F', light: '#BDCB86', dark: '#9BAF58', ink: '#5F7030' },
} as const;

/** Estados de uma sessão de atendimento. */
export const statusSessao = {
  aguardando: {
    label: 'Aguardando atendente',
    dot: yup.chamaImaginacao.DEFAULT,
    ink: yup.chamaImaginacao.ink,
    inkDark: yup.chamaImaginacao.light,
  },
  emAtendimento: {
    label: 'Em atendimento',
    dot: yup.folhaAventuras.DEFAULT,
    ink: yup.folhaAventuras.ink,
    inkDark: yup.folhaAventuras.light,
  },
  finalizada: {
    label: 'Finalizada',
    dot: '#A8B0CC',
    ink: yup.brumaSuave.ink,
    inkDark: '#8A93B8',
  },
} as const;

export type StatusSessaoKey = keyof typeof statusSessao;

/** Mantido para compatibilidade com imports antigos de `colors`. */
export const colors = {
  noiteSerena: yup.noiteSerena,
  brumaSuave: yup.brumaSuave,
  toqueDeAfeto: yup.toqueDeAfeto,
  abracoDoce: yup.abracoDoce,
  brincadeiraViva: yup.brincadeiraViva,
  chamaImaginacao: yup.chamaImaginacao,
  folhaAventuras: yup.folhaAventuras,
};
