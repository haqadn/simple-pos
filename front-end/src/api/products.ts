import { API } from "./api";

export default class ProductsAPI extends API {
  static async getCategories() {
    return await this.client.get("/products/categories", {
      params: { per_page: "100" },
    });
  }

  static async getProducts() {
    return await this.client.get("/products", {
      params: {
        per_page: "100",
        status: "publish",
        orderby: "popularity",
      },
    });
  }

  static async getVariations(productId: number) {
    return await this.client.get(`/products/${productId}/variations`, {
      params: {
        per_page: "100",
        status: "publish",
      },
    });
  }

  static async updateProduct(productId: number, data: any) {
    return await this.client.put(`/products/${productId}`, data);
  }
}
