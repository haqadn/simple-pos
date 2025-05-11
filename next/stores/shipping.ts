import { useQuery } from "@tanstack/react-query";
import ShippingAPI from "../api/shipping";

export const useShippingMethodsQuery = () => {
  return useQuery({
    queryKey: ["shipping_methods"],
    queryFn: () => ShippingAPI.getShippingMethods(),
    staleTime: 60 * 60 * 1000,
  });
};
