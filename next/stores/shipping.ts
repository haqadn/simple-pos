import { useQuery } from "@tanstack/react-query";
import ShippingAPI, { BePickupLocationsSchema, BeShippingMethodSchema } from "../api/shipping";
import { z } from "zod";

const ServiceMethodSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+$/, "Only lowercase letters and numbers are allowed"),
  title: z.string(),
  type: z.enum(["table", "takeaway"]),
  fee: z.number(),
});
export type ServiceMethodSchema = z.infer<typeof ServiceMethodSchema>;


const TableSchema = ServiceMethodSchema.extend({
  type: z.literal("table"),
});
export type TableSchema = z.infer<typeof TableSchema>;


const DeliveryZoneSchema = ServiceMethodSchema.extend({
  type: z.literal("takeaway"),
});
export type DeliveryZoneSchema = z.infer<typeof DeliveryZoneSchema>;

const shippingMethodsToDeliveryZones = (shippingMethods: BeShippingMethodSchema[]): DeliveryZoneSchema[] => {
  const validZones: DeliveryZoneSchema[] = [];
  shippingMethods.forEach((method) => {
    if ( ! method.enabled) return;
    
    try {
      validZones.push(DeliveryZoneSchema.parse({
        slug: method.id.toString(),
        title: method.title,
        type: 'takeaway',
        fee: method.settings.cost ? method.settings.cost.value : 0,
      }));
    } catch (error) {
      console.error(error);
      // ignore
    }
  });

  return validZones;
}

const pickupLocationsToTables = (pickupLocations: BePickupLocationsSchema[]): TableSchema[] => {
  const validTables: TableSchema[] = [];
  pickupLocations.forEach((location) => {
    if ( ! location.enabled) return;
    
    try {
      validTables.push(TableSchema.parse({
        slug: location.details,
        title: location.name,
        type: 'table',
        fee: 0,
      }));
    } catch (error) {
      console.error(error);
      // ignore
    }
  });
  return validTables;
}

const getDeliveryZones = async (): Promise<DeliveryZoneSchema[]> => {
  const response = await ShippingAPI.getShippingMethods();
  return shippingMethodsToDeliveryZones(response);
};

const getTables = async (): Promise<TableSchema[]> => {
  const response = await ShippingAPI.getPickupLocations();
  return pickupLocationsToTables(response);
};

export const useDeliveryZoneQuery = () => {
  return useQuery({
    queryKey: ["delivery_zones"],
    queryFn: getDeliveryZones,
    staleTime: 60 * 60 * 1000,
  });
};


export const useTablesQuery = () => {
  return useQuery({
    queryKey: ["tables"],
    queryFn: getTables,
    staleTime: 60 * 60 * 1000,
  });
};