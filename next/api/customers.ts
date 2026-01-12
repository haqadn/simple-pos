import { z } from "zod";
import { API } from "./api";

export const CustomerSchema = z.object({
  name: z.string(),
  phone: z.string(),
});

export type CustomerSchema = z.infer<typeof CustomerSchema>;

const CustomerSearchResponseSchema = z.object({
  customers: z.array(CustomerSchema),
});

export default class CustomersAPI extends API {
  static async search(query: string): Promise<CustomerSchema[]> {
    if (!query || query.length < 2) return [];

    try {
      const response = await this.client.get("/simple-pos/customers", {
        params: { search: query },
      });
      const parsed = CustomerSearchResponseSchema.parse(response.data);
      return parsed.customers;
    } catch {
      return [];
    }
  }
}
