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
      if (this.cartStore.isDirty) {
        await this.cartStore.saveOrder();
      }
      return;
    }

    // Unqueue the print as we are going to print it now
    this.cartStore.queuePrint(this.printType, false);

    if (this.printType === "kot") {
      this.cartStore.updateKot();
    }

    if (!this.cartStore.orderId || this.cartStore.isDirty) {
      await this.cartStore.saveOrder();
    }

    const printStore = usePrintStore();
    await printStore.push(this.printType, {
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
  }
}
