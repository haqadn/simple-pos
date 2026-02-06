import { z } from "zod";
import { API } from "./api";

export const BeShippingZoneSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const BeShippingMethodSchema = z
    .object({
        id: z.number(),
        title: z.string(),
        enabled: z.boolean(),
        method_id: z.enum(["flat_rate", "free_shipping"]),
        settings: z.object({
            cost: z.object({
                value: z.string().transform((val) => parseFloat(val)),
            }).optional(),
        }),
    });

const BePickupLocationsSchema = z.object({
  name: z.string(),
  details: z.string(),
  enabled: z.boolean(),
});

export const BePickupLocationsResponseSchema = z.object({
  pickup_locations: z.array(BePickupLocationsSchema),
});

export type BePickupLocationsResponseSchema = z.infer<typeof BePickupLocationsResponseSchema>;
export type BePickupLocationsSchema = z.infer<typeof BePickupLocationsSchema>;
export type BeShippingZoneSchema = z.infer<typeof BeShippingZoneSchema>;
export type BeShippingMethodSchema = z.infer<typeof BeShippingMethodSchema>;

export default class ShippingAPI extends API {
  static async getShippingMethods(): Promise<BeShippingMethodSchema[]> {
    const response = await this.client.get<BeShippingMethodSchema[]>(`/shipping/zones/0/methods`);
    return BeShippingMethodSchema.array().parse(response.data);
  }

  static async getPickupLocations(): Promise<BePickupLocationsSchema[]> {
    const response = await this.client.get<BePickupLocationsResponseSchema>(`/simple-pos/pickup-locations`);
    return BePickupLocationsResponseSchema.parse(response.data).pickup_locations;
  }
}
