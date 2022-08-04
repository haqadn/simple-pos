import axios from "axios";
import config from "../utils/config";

export class API {
  static baseUrl = config.api.base;

  static client = axios.create({
    baseURL: API.baseUrl,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      'X-WP-Nonce': config.api.nonce,
    }
  });
}
