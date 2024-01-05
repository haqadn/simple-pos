import type { Command } from "./command";
import { useCartStore } from "@/stores/cart";
import { usePrintStore } from "@/stores/print";
import config from "@/utils/config";

export default class implements Command {
  constructor(private printType = "bill", private cartStore = useCartStore()) {}

  parse(command: string): boolean {
    const parts = command.split(" ");

    if (["print", "p"].includes(parts[0])) {
      if (parts.length > 1) {
        this.printType = parts[1];
      }
      return true;
    }

    return false;
  }

  async execute(): Promise<void> {
    if (config.enablePrinting === false) {
      this.cartStore.queuePrint(this.printType);
      await this.cartStore.saveOrder();
      return;
    }

    // Save the order if it hasn't been saved yet. Make sure we have an order id
    if (!this.cartStore.orderId) {
      await this.cartStore.saveOrder();
    }

    if (this.printType === "kot") {
      this.cartStore.updateKot();
    }

    const printStore = usePrintStore();
    printStore.push(this.printType, {
      items: this.cartStore.items,
      kotItems: this.cartStore.kotItems,
      customer: this.cartStore.customer,
      invoiceNumber: this.cartStore.invoiceNumber,
      orderTime: this.cartStore.orderTime,
      payment: this.cartStore.payment,
      customerNote: this.cartStore.customerNote,
      discountTotal: this.cartStore.discountTotal,
      cartName: this.cartStore.cartName,
    });

    if (this.cartStore.isDirty) {
      this.cartStore.saveOrder();
    }
  }
}
