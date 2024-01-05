import type { Command } from "./command";
import { useCartStore, useCartManagerStore } from "../stores/cart";
import { usePrintStore } from "@/stores/print";

export default class implements Command {
  constructor(private printMode = "bill") {}

  parse(command: string): boolean {
    const parts = command.split(" ");

    if (["print", "p"].includes(parts[0])) {
      if (parts.length > 1) {
        this.printMode = parts[1];
      }
      return true;
    }

    return false;
  }

  async execute(): Promise<void> {
    const cartStore = useCartStore();

    // Save the order if it hasn't been saved yet. Make sure we have an order id
    if (!cartStore.orderId) {
      await cartStore.saveOrder();
    }

    const cartManagerStore = useCartManagerStore();
    cartManagerStore.setPrintMode(this.printMode);

    if (this.printMode === "kot") {
      cartStore.updateKot();
    }

    const printStore = usePrintStore();
    printStore.push(this.printMode, {
      items: cartStore.items,
      kotItems: cartStore.kotItems,
      customer: cartStore.customer,
      invoiceNumber: cartStore.invoiceNumber,
      orderTime: cartStore.orderTime,
      payment: cartStore.payment,
      customerNote: cartStore.customerNote,
      discountTotal: cartStore.discountTotal,
      cartName: cartStore.cartName,
    });

    if (cartStore.isDirty) {
      cartStore.saveOrder();
    }
  }
}
