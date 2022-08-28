import type { Command } from "./command";
import { useItemStore } from "../stores/items";
import { useCartStore } from "../stores/cart";

export default class implements Command {
  private item!: any;
  private quantity: number | null = null;

  parse(command: string): boolean {
    const parts = command.split(" ");
    const sku = parts[0];

    const itemStore = useItemStore();
    this.item = itemStore.items.find((item) => item.sku === sku);
    if (this.item) {
      if (parts.length === 2) {
        this.quantity = parseInt(parts[1]);
      }

      return true;
    }
    return false;
  }

  async execute(): Promise<void> {
    const cartStore = useCartStore();

    if (this.quantity === null) {
      cartStore.addToCart(this.item);
    } else {
      cartStore.setItemQuantity(this.item, this.quantity);
    }
  }
}
