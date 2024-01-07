import type { Command } from "./command";
import { useCartManagerStore, useDynamicCartStore } from "../stores/cart";
import OrdersAPI from "@/api/orders";

export default class implements Command {
  private orderRef!: string;
  private isInvoice = false;

  constructor(orderId: string, isInvoice: boolean) {
    this.orderRef = orderId;
    this.isInvoice = isInvoice;
  }

  parse(command: string): boolean {
    const parts = command.split(" ");
    if (parts[0] == "open" && parts[1] === "i" && parts.length === 3) {
      const orderId = command.split(" ")[2];
      this.orderRef = orderId.toString();
      this.isInvoice = true;
      return true;
    }
    if (parts[0] === "open" && parts.length === 2) {
      this.orderRef = command.split(" ")[1];
      return true;
    }

    return false;
  }

  invoiceToId(invoiceNumber: string) {
    return (
      parseInt(invoiceNumber.slice(0, -2)) + parseInt(invoiceNumber.slice(-2))
    );
  }

  async execute(): Promise<void> {
    const cartManagerStore = useCartManagerStore();
    const id = this.isInvoice ? this.invoiceToId(this.orderRef) : this.orderRef;
    const { data: order } = await OrdersAPI.getOrder(id);

    const orderCartNameMeta = order.meta_data.find(
      (meta: { key: string }) => meta.key === "cart_name"
    );
    const orderCartName =
      orderCartNameMeta && orderCartNameMeta.value
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
      cartStore.disableAutoClose();
      cartManagerStore.setActiveCart(cartStore.reference);
    }
  }
}
