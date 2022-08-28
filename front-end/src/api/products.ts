import { API } from "./api";

export default class ProductsAPI extends API {
  static async getProducts() {
    return await this.client.get('/products?per_page=100&status=publish');
  }

  static async updateProduct(productId: number, data: any) {
    return await this.client.put(`/products/${productId}`, data);
  }
}
