import type { Command } from "./command";
import { useCatalogStore } from "../stores/catalog";
import { useCartStore } from "../stores/cart";
import type { Product } from "@/types";

export default class implements Command {
  private item?: Product;
  private quantity: number | null = null;

  parse(command: string): boolean {
    const parts = command.split(" ");
    const sku = parts[0];

    const catalogStore = useCatalogStore();
    this.item = catalogStore.products.find(
      (item: Product) => item.sku === sku || item.menu_order === parseInt(sku)
    );
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

    if (typeof this.item !== "undefined") {
      if (this.quantity === null) {
        cartStore.addToCart(this.item);
      } else {
        cartStore.setItemQuantity(this.item, this.quantity);
      }
    }
  }
}
