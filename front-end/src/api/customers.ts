import { API } from "./api";

export default class CustomersAPI extends API {
  static async get(search: string) {
    return await this.client.get("/simple-pos/customers", {
      params: { search },
    });
  }
}
