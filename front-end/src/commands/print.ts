import type { Command } from "./command";
import { useItemStore } from "../stores/items";
import { useCartStore } from "../stores/cart";

export default class implements Command {
  parse(command: string): boolean {
    const parts = command.split(" ");

    if (["print", "p"].includes(parts[0]) && parts.length === 1) {
      return true;
    }

    return false;
  }

  private printReceipt() {
    return new Promise<void>((resolve) => {
      window.onafterprint = (e) => {
        window.onafterprint = null;
        resolve();
      };

      if (window.electron) {
        window.electron.print();
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

    await cartStore.saveOrder();
    await this.printReceipt();
    itemStore.loadItems();
  }
}
