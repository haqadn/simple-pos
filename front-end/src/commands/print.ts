import type { Command } from "./command";
import { useItemStore } from "../stores/items";
import { useCartStore, useCartManagerStore } from "../stores/cart";
import config from "@/utils/config";
import { nextTick } from "vue";

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

  private getPrinterName(): string {
    switch (this.printMode) {
      case "drawer":
        return config.drawerPrinter;
      case "kot":
        return config.kitchenPrinter;
      default:
        return config.drawerPrinter;
    }
  }

  private printReceipt() {
    return new Promise<void>((resolve) => {
      window.onafterprint = (e) => {
        window.onafterprint = null;
        resolve();
      };

      if (window.electron) {
        window.electron.print(this.getPrinterName());
      } else {
        window.print();
      }
    });
  }

  async execute(): Promise<void> {
    const cartStore = useCartStore();
    if (
      cartStore.line_items.reduce((total, item) => total + item.quantity, 0) ===
      0
    ) {
      return;
    }

    const itemStore = useItemStore();

    const cartManagerStore = useCartManagerStore();
    cartManagerStore.setPrintMode(this.printMode);
    await nextTick();

    if (this.printMode === "kot") {
      cartStore.markKotPrinted();
    }

    if (cartStore.isDirty) {
      await cartStore.saveOrder();
    }
    await this.printReceipt();
    itemStore.loadItems();
  }
}
