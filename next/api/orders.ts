import { z } from "zod";
import { API } from "./api";

const LineItemSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  product_id: z.number(),
  variation_id: z.number(),
  quantity: z.number(),
});

const ShippingMethodEnum = z.enum(["flat_rate", "pickup_location", "free_shipping"]);

const ShippingLineSchema = z.object({
  id: z.number().optional(),
  method_id: z.string().refine((val) => val === "" || ShippingMethodEnum.safeParse(val).success, {
    message: "method_id must be empty string or valid shipping method"
  }), // Allow empty string or valid enum values
  instance_id: z.string(), // instance ID from WooCommerce
  method_title: z.string(), // Display name
  total: z.string(), // Fee amount as string
  total_tax: z.string().default("0.00"),
  taxes: z.array(z.any()).default([]),
});

const BillingSchema = z.object({
  first_name: z.string().default(""),
  last_name: z.string().default(""),
  phone: z.string().default(""),
  address_1: z.string().default(""),
  address_2: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  postcode: z.string().default(""),
  country: z.string().default(""),
});

const MetaDataSchema = z.object({
  id: z.number().optional(),
  key: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const CouponLineSchema = z.object({
  id: z.number().optional(),
  code: z.string(),
  discount: z.string().default("0.00"),
  discount_tax: z.string().default("0.00"),
});

export const OrderSchema = z.object({
  id: z.number(),
  status: z.string(),
  line_items: z.array(LineItemSchema),
  shipping_lines: z.array(ShippingLineSchema).default([]),
  coupon_lines: z.array(CouponLineSchema).default([]),
  customer_note: z.string().default(""),
  billing: BillingSchema.default({}),
  total: z.string().default("0.00"),
  discount_total: z.string().default("0.00"),
  subtotal: z.string().optional(),
  meta_data: z.array(MetaDataSchema).default([]),
});

export type OrderSchema = z.infer<typeof OrderSchema>;
export type LineItemSchema = z.infer<typeof LineItemSchema>;
export type ShippingLineSchema = z.infer<typeof ShippingLineSchema>;
export type CouponLineSchema = z.infer<typeof CouponLineSchema>;
export type BillingSchema = z.infer<typeof BillingSchema>;
export type MetaDataSchema = z.infer<typeof MetaDataSchema>;
export type ShippingMethodType = z.infer<typeof ShippingMethodEnum>;

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

  static async updateOrder(id: string, order: Partial<OrderSchema>) {
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
