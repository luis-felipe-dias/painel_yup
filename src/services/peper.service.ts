// src/services/peper.service.ts
//
// Tudo o que o painel fala com o bot (porta 8081). Nada aqui passa pelo
// backend de estoque: ficha, palavras e curadoria vivem no Mongo do bot.

import { whatsappApi } from "./api/client";
import type {
  AcaoPalavra,
  RespostaCuradoria,
  RespostaFicha,
  RespostaPalavras,
  RespostaTeste,
  StatusCuradoria,
} from "../types/peper.types";

// ---------------------------------------------------------------- Ficha

export async function lerFicha(): Promise<RespostaFicha> {
  const { data } = await whatsappApi.get<RespostaFicha>("/loja/ficha");
  return data;
}

/**
 * Manda só os campos que mudaram. String vazia APAGA o campo — voltar
 * para "não sei" é uma operação legítima, não um erro de digitação.
 */
export async function salvarFicha(
  campos: Record<string, string>,
  por: string
): Promise<RespostaFicha> {
  const { data } = await whatsappApi.put<RespostaFicha>("/loja/ficha", { campos, por });
  return data;
}

// ---------------------------------------------------------------- Palavras

export async function listarPalavras(): Promise<RespostaPalavras> {
  const { data } = await whatsappApi.get<RespostaPalavras>("/palavras");
  return data;
}

export interface EntradaPalavra {
  termo: string;
  acao: AcaoPalavra;
  troca_por?: string | null;
  motivo?: string | null;
  ativo?: boolean;
  por?: string;
}

export async function criarPalavra(entrada: EntradaPalavra): Promise<void> {
  await whatsappApi.post("/palavras", entrada);
}

export async function atualizarPalavra(id: string, entrada: EntradaPalavra): Promise<void> {
  await whatsappApi.put(`/palavras/${id}`, entrada);
}

export async function removerPalavra(id: string): Promise<void> {
  await whatsappApi.delete(`/palavras/${id}`);
}

/** Cola um texto e vê o que o filtro faria com ele antes de valer. */
export async function testarPalavras(texto: string): Promise<RespostaTeste> {
  const { data } = await whatsappApi.post<RespostaTeste>("/palavras/testar", { texto });
  return data;
}

// ---------------------------------------------------------------- Curadoria

export async function listarCuradoria(
  status: StatusCuradoria = "pendente",
  limite = 30
): Promise<RespostaCuradoria> {
  const { data } = await whatsappApi.get<RespostaCuradoria>("/curadoria/fila", {
    params: { status, limite },
  });
  return data;
}

export async function aprovarCuradoria(
  id: string,
  por: string,
  respostaFinal?: string
): Promise<void> {
  await whatsappApi.post(`/curadoria/${id}/aprovar`, {
    por,
    resposta_final: respostaFinal,
  });
}

export async function descartarCuradoria(
  id: string,
  por: string,
  motivo?: string
): Promise<void> {
  await whatsappApi.post(`/curadoria/${id}/descartar`, { por, motivo });
}

export async function resumoCuradoria(): Promise<any> {
  const { data } = await whatsappApi.get("/curadoria/resumo");
  return data;
}
