import type { Command } from "./command";
import { useItemStore } from "../stores/items";
import { useCartStore } from "../stores/cart";

export default class implements Command {
  parse(command: string): boolean {
    return command === "clear";
  }

  async execute(): Promise<void> {
    const cartStore = useCartStore();
    const itemStore = useItemStore();

    cartStore.clearCart();
    await itemStore.loadItems();
  }
}
