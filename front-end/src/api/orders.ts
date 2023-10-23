import { API } from "./api";

export default class OrdersAPI extends API {
  static async saveOrder(order) {
    return await this.client.post("/orders", order);
  }

  static async updateOrder(id, order) {
    return await this.client.put(`/orders/${id}`, order);
  }

  static async getOrder(id) {
    return await this.client.get(`/orders/${id}`);
  }

  static async listOrders(params) {
    return await this.client.get("/orders", { params });
  }

  static async cancelOrder(id) {
    return await this.client.put(`/orders/${id}`, { status: "cancelled" });
  }
}
