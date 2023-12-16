import type { Command } from "./command";
import { useCartManagerStore, useDynamicCartStore } from "../stores/cart";
import OrdersAPI from "@/api/orders";

export default class implements Command {
  private orderId!: string;

  parse(command: string): boolean {
    const parts = command.split(" ");
    if (parts[0] == "open" && parts[1] === "i" && parts.length === 3) {
      const orderRef = command.split(" ")[2];
      const orderId =
        parseInt(orderRef.slice(0, -2)) + parseInt(orderRef.slice(-2));
      this.orderId = orderId.toString();
      return true;
    }
    if (parts[0] === "open" && parts.length === 2) {
      this.orderId = command.split(" ")[1];
      return true;
    }

    return false;
  }

  async execute(): Promise<void> {
    const cartManagerStore = useCartManagerStore();
    const { data: order } = await OrdersAPI.getOrder(this.orderId);

    const orderCartNameMeta = order.meta_data.find(
      (meta: { key: string }) => meta.key === "cart_name"
    );
    const orderCartName = orderCartNameMeta.value
      ? orderCartNameMeta.value
      : "U";

    let cartStore = cartManagerStore.getCartStoreById(order.id);
    if (!cartStore) {
      cartStore = cartManagerStore.getCartStoreByName(orderCartName);
    }
    // In case we got the cartStore by name and accidentally got one that belongs to another order
    if (cartStore.hasItems && cartStore.orderId !== order.id) {
      cartStore = useDynamicCartStore(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        cartManagerStore.createCart(orderCartName)!.key
      );
    }

    if (!cartStore.isDirty) {
      cartStore.hydrateOrderData(order);
      cartManagerStore.setActiveCart(cartStore.reference);
    }
  }
}
