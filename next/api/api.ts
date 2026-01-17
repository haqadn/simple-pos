import axios from "axios";
import { BASE_URL, CONSUMER_KEY, CONSUMER_SECRET } from "./config";
import { useSettingsStore } from "@/stores/settings";

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

function getConfig() {
  // Try to get from settings store (client-side)
  if (typeof window !== 'undefined') {
    const settings = useSettingsStore.getState();
    if (settings.api.baseUrl && settings.api.consumerKey && settings.api.consumerSecret) {
      return {
        baseUrl: `${settings.api.baseUrl}/wp-json/wc/v3`,
        consumerKey: settings.api.consumerKey,
        consumerSecret: settings.api.consumerSecret,
      };
    }
  }

  // Fall back to env config for server-side/test usage
  if (
    process.env.NEXT_PUBLIC_SITE_URL &&
    process.env.NEXT_PUBLIC_CONSUMER_KEY &&
    process.env.NEXT_PUBLIC_CONSUMER_SECRET
  ) {
    return {
      baseUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/wp-json/wc/v3`,
      consumerKey: process.env.NEXT_PUBLIC_CONSUMER_KEY,
      consumerSecret: process.env.NEXT_PUBLIC_CONSUMER_SECRET,
    };
  }

  // Fall back to hardcoded config
  return {
    baseUrl: BASE_URL,
    consumerKey: CONSUMER_KEY,
    consumerSecret: CONSUMER_SECRET,
  };
}

function makeClient(): API_Client {
  const config = getConfig();

  return axios.create({
    baseURL: config.baseUrl,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    auth: {
      username: config.consumerKey,
      password: config.consumerSecret,
    },
  });
}

export class API {
  // Create client on-demand to pick up latest settings
  static get client(): API_Client {
    return makeClient();
  }
}
