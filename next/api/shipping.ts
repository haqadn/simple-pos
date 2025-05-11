import { z } from "zod";
import { API } from "./api";

const BackendShippingZoneSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const BackendShippingMethodSchema = z
    .object({
        id: z.number(),
        title: z.string(),
        method_id: z.enum(["flat_rate", "free_shipping"]),
        settings: z.object({
            cost: z.object({
                value: z.string().transform((val) => parseFloat(val)),
            }).optional(),
        }),
    });

const ShippingMethodSchema = BackendShippingMethodSchema
  .transform((method) => {
    const cost = method.settings.cost ? method.settings.cost.value : 0;

    return {
        id: method.id,
        title: method.title,
        method_id: method.method_id,
        cost,
    }
  });

export type BackendShippingZoneSchema = z.infer<typeof BackendShippingZoneSchema>;
export type BackendShippingMethodSchema = z.infer<typeof BackendShippingMethodSchema>;
export type ShippingMethodSchema = z.infer<typeof ShippingMethodSchema>;

export default class ShippingAPI extends API {

  static async getShippingMethods() {
    const response = await this.client.get(`/shipping/zones/0/methods`);

    try {
      return ShippingMethodSchema.array().parse(response.data);
    } catch (error) {
      console.error(error);
      return [];
    }
  }
}
