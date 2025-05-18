import axios from "axios";
import { BASE_URL, CONSUMER_KEY, CONSUMER_SECRET } from "./config";

export type Request_Config = {
  params?: Record<string, string | number>;
};

export interface API_Client {
  get: <T = unknown>(endpoint: string, config?: Request_Config) => Promise<{ data: T }>;
  post: <T = unknown>(
    endpoint: string,
    data: object,
    config?: Request_Config
  ) => Promise<{ data: T }>;
  put: <T = unknown>(
    endpoint: string,
    data: object,
    config?: Request_Config
  ) => Promise<{ data: T }>;
}

function makeClient(): API_Client {
  return axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    auth: {
      username: CONSUMER_KEY,
      password: CONSUMER_SECRET,
    },
  });
}

export class API {
  static client = makeClient();
}
