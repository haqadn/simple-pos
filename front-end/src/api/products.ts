import { API } from "./api";

export default class ProductsAPI extends API {
  static async getProducts() {
    return await this.client.get('/products?per_page=100');
  }
}
