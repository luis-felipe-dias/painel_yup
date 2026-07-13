import axios, { AxiosInstance, AxiosError } from "axios";
import { handleError } from "./interceptors";

// API do WhatsApp (porta 8081)
const WHATSAPP_API_URL = import.meta.env.VITE_API_WHATSAPP_URL || "http://2.25.147.117:8081";

// API do Painel (porta 3000 - autenticação e MongoDB)
const PAINEL_API_URL = import.meta.env.VITE_API_PAINEL_URL || "http://localhost:3000";

console.log(`🌐 WhatsApp API: ${WHATSAPP_API_URL}`);
console.log(`🌐 Painel API: ${PAINEL_API_URL}`);

// Cliente para API do WhatsApp
class WhatsAppApiClient {
  private static instance: WhatsAppApiClient;
  private client: AxiosInstance;

  private constructor() {
    this.client = axios.create({
      baseURL: WHATSAPP_API_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    this.setupInterceptors();
  }

  public static getInstance(): WhatsAppApiClient {
    if (!WhatsAppApiClient.instance) {
      WhatsAppApiClient.instance = new WhatsAppApiClient();
    }
    return WhatsAppApiClient.instance;
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        console.log(`📡 [WhatsApp] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ [WhatsApp] ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        console.error(`❌ [WhatsApp] Erro:`, error.message);
        return Promise.reject(handleError(error));
      }
    );
  }

  public getClient(): AxiosInstance {
    return this.client;
  }
}

// Cliente para API do Painel (Autenticação)
class PainelApiClient {
  private static instance: PainelApiClient;
  private client: AxiosInstance;

  private constructor() {
    this.client = axios.create({
      baseURL: PAINEL_API_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    this.setupInterceptors();
  }

  public static getInstance(): PainelApiClient {
    if (!PainelApiClient.instance) {
      PainelApiClient.instance = new PainelApiClient();
    }
    return PainelApiClient.instance;
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        console.log(`📡 [Painel] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        
        const token = localStorage.getItem("token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ [Painel] ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        console.error(`❌ [Painel] Erro:`, error.message);
        return Promise.reject(handleError(error));
      }
    );
  }

  public getClient(): AxiosInstance {
    return this.client;
  }
}

// Exportar os clients
export const whatsappApi = WhatsAppApiClient.getInstance().getClient();
export const painelApi = PainelApiClient.getInstance().getClient();

// Manter compatibilidade com código existente
export const api = whatsappApi;