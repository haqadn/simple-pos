import type { Command } from "./command";
import { useItemStore } from "../stores/items";
import { useCartStore } from "../stores/cart";

export default class implements Command {
  private sku!: string;
  private quantity: number | null = null;

  parse(command: string): boolean {
    if (!["remove", "rm"].includes(command.split(" ")[0])) {
      return false;
    }

    this.sku = command.split(" ")[1];
    if (command.split(" ").length > 2) {
      this.quantity = parseInt(command.split(" ")[2]);
    }

    if (!this.sku) {
      return false;
    }

    return true;
  }

  async execute(): Promise<void> {
    const cartStore = useCartStore();
    const itemStore = useItemStore();

    const item = itemStore.items.find((item) => item.sku === this.sku);
    if (item) {
      if (this.quantity === null) {
        cartStore.setItemQuantity(item, 0);
      } else {
        cartStore.reduceFromCart(item, this.quantity);
      }
    }
  }
}
