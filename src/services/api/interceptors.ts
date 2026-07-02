import { AxiosError } from "axios";

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

export const handleError = (error: AxiosError): ApiError => {
  if (error.code === "ECONNABORTED") {
    return {
      message: "Tempo limite de conexão excedido. Tente novamente.",
      status: 408,
      code: "TIMEOUT",
    };
  }

  if (!error.response) {
    return {
      message: "Sem conexão com o servidor. Verifique sua internet.",
      status: 0,
      code: "NETWORK_ERROR",
    };
  }

  const { status, data } = error.response;
  const message = (data as any)?.message || (data as any)?.error || "Ocorreu um erro inesperado.";

  const errorMessages: Record<number, string> = {
    400: "Requisição inválida. Verifique os dados enviados.",
    401: "Não autorizado. Faça login novamente.",
    403: "Acesso negado. Você não tem permissão.",
    404: "Recurso não encontrado.",
    429: "Muitas requisições. Aguarde um momento.",
    500: "Erro interno do servidor. Tente novamente mais tarde.",
  };

  return {
    message: errorMessages[status] || message,
    status,
    details: (data as any)?.details,
  };
};