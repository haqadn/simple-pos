import type { Command } from "./command";
import { useCatalogStore } from "../stores/catalog";
import { useCartStore } from "../stores/cart";

export default class implements Command {
  parse(command: string): boolean {
    return command === "clear";
  }

  async execute(): Promise<void> {
    const cartStore = useCartStore();
    const catalogStore = useCatalogStore();

    cartStore.clearCart();
    await catalogStore.loadProducts();
  }
}
