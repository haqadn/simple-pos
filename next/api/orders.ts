import { z } from "zod";
import { API } from "./api";

const OrderSchema = z.object({
  id: z.number(),
  status: z.string(),
});

export type OrderSchema = z.infer<typeof OrderSchema>;

export default class OrdersAPI extends API {
  static async saveOrder(order: Partial<OrderSchema>) {
    const response = await this.client.post("/orders", order);
    return OrderSchema.parse(response.data);
  }

  static async updateOrder(id: string, order: OrderSchema) {
    const response = await this.client.put(`/orders/${id}`, order);
    return OrderSchema.parse(response.data);
  }

  static async getOrder(id: string) {
    const response = await this.client.get(`/orders/${id}`);
    return OrderSchema.parse(response.data);
  }

  static async listOrders(params: Record<string, string>) {
    const response = await this.client.get("/orders", { params });
    return OrderSchema.array().parse(response.data);
  }

  static async cancelOrder(id: string) {
    const response = await this.client.put(`/orders/${id}`, { status: "cancelled" });
    return OrderSchema.parse(response.data);
  }
}
