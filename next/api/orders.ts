import { z } from "zod";
import { API } from "./api";

const LineItemSchema = z.object({
  id: z.number().optional(),
  product_id: z.number(),
  variation_id: z.number(),
  quantity: z.number(),
});

const OrderSchema = z.object({
  id: z.number(),
  status: z.string(),
  line_items: z.array(LineItemSchema),
});

export type OrderSchema = z.infer<typeof OrderSchema>;
export type LineItemSchema = z.infer<typeof LineItemSchema>;

export default class OrdersAPI extends API {
  static async saveOrder(order: Partial<OrderSchema>) {
    try {
      const response = await this.client.post("/orders", order);
      return OrderSchema.parse(response.data);
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  static async updateOrder(id: string, order: OrderSchema) {
    const response = await this.client.put(`/orders/${id}`, order);
    return OrderSchema.parse(response.data);
  }

  static async getOrder(id: string) {
    try {
      const response = await this.client.get(`/orders/${id}`);
      return OrderSchema.parse(response.data);
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  static async listOrders(params: Record<string, string>) {
    try {
      const response = await this.client.get("/orders", { params });
      return OrderSchema.array().parse(response.data);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  static async cancelOrder(id: string) {
    const response = await this.client.put(`/orders/${id}`, { status: "cancelled" });
    return OrderSchema.parse(response.data);
  }
}
