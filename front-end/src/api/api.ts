import axios from "axios";
import config from "../utils/config";

export type Request_Config = {
  params?: Record<string, string | number>;
};

export interface API_Client {
  get: (endpoint: string, config?: Request_Config) => Promise<{ data: object }>;
  post: (
    endpoint: string,
    data: object,
    config?: Request_Config
  ) => Promise<{ data: object }>;
  put: (
    endpoint: string,
    data: object,
    config?: Request_Config
  ) => Promise<{ data: object }>;
}

function makeClient(): API_Client {
  return axios.create({
    baseURL: config.api.url,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(config.method === "nonce"
        ? { ["X-WP-Nonce"]: config.api.nonce }
        : {}),
    },
    ...(config.method === "key"
      ? {
          auth: {
            username: config.api.consumerKey,
            password: config.api.consumerSecret,
          },
        }
      : {}),
  });
}

function clientWrapper() {
  const client = makeClient();
  return client;
}

export class API {
  static client = clientWrapper();
}
