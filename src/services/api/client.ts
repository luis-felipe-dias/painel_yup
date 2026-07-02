import axios, { AxiosInstance, AxiosError } from "axios";
import { handleError } from "./interceptors";

const BASE_URL = import.meta.env.VITE_API_URL || "http://2.25.147.117:8081";

class ApiClient {
  private static instance: ApiClient;
  private client: AxiosInstance;

  private constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    this.setupInterceptors();
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        console.log(`📡 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        console.error(`❌ Erro na requisição:`, error.message);
        return Promise.reject(handleError(error));
      }
    );
  }

  public getClient(): AxiosInstance {
    return this.client;
  }
}

export const api = ApiClient.getInstance().getClient();