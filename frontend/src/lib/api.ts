import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export function urlArquivo(caminho: string) {
  return `${API_BASE_URL}${caminho}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fluxos:token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
