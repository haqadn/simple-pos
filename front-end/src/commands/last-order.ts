import type { Command } from "./command";
import OrderAPI from "../api/orders";
import { useCartStore } from "@/stores/cart";

export default class implements Command {
  parse(command: string): boolean {
    return command === "latest";
  }

  async execute() {
    const response = await OrderAPI.listOrders({
      per_page: 1,
      orderby: "id",
      order: "desc",
      status: ["pending", "processing", "on-hold"],
    });

    const cartStore = useCartStore();

    cartStore.clearCart();
    cartStore.updateOrderData(response.data[0]);
  }
}
