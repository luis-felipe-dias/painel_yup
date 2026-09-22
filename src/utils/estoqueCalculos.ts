/**
 * Cálculos de estoque compartilhados entre as páginas Estoque, Compras ADM
 * e Estoque Mínimo - centralizados aqui pra não duplicar a mesma regra em
 * três lugares (e já corrigido pra não contar reserva como disponível).
 */

export interface EstoquePorDeposito {
  'Controle Geral': number;
  'Deposito Loja': number;
  'Casa Velha'?: number;
  'Produtos'?: number;
  'Fiscal'?: number;
}

export interface EstoqueDisponivel {
  controleGeral: number;
  depositoLoja: number;
  casaVelha: number;
  totalReservado: number;
  /** soma do que está realmente disponível (reservado não conta - não pode ser transferido) */
  totalDisponivel: number;
}

/**
 * Saldo realmente disponível por depósito: estoque bruto menos o que já
 * está reservado (pedido em aberto no Tiny) nesse depósito. Reservado não
 * pode ser transferido nem contado como disponível pra reposição/prioridade/
 * compra.
 */
export function calcularEstoqueDisponivel(
  estoque: EstoquePorDeposito | undefined,
  reservaPorDeposito: Record<string, number> | undefined
): EstoqueDisponivel {
  const est = estoque || ({} as EstoquePorDeposito);
  const reserva = reservaPorDeposito || {};

  const disponivel = (deposito: string, bruto: number) => {
    const reservado = reserva[deposito] || 0;
    return Math.max(0, bruto - reservado);
  };

  const controleGeral = disponivel('Controle Geral', est['Controle Geral'] || 0);
  const depositoLoja = disponivel('Deposito Loja', est['Deposito Loja'] || 0);
  const casaVelha = disponivel('Casa Velha', est['Casa Velha'] || 0);
  const totalReservado = Object.values(reserva).reduce((soma, v) => soma + (v || 0), 0);

  return {
    controleGeral,
    depositoLoja,
    casaVelha,
    totalReservado,
    totalDisponivel: controleGeral + depositoLoja + casaVelha
  };
}
